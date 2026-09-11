import os
import re
import csv
import json
from pathlib import Path
from typing import Any, Optional

from src.config.logging import get_logger
from src.ml.eligibility_engine import EligibilityEngine

logger = get_logger("eligibility_service")

BASE_DIR = Path(__file__).resolve().parents[2]
CSV_PATH = BASE_DIR / "ml" / "eligibility_engine" / "all_schemes_eligibility_table.csv"
DOCS_PATH = BASE_DIR / "ml" / "chatbot" / "myscheme.csv"


def _normalize_key(text: str) -> str:
    """Normalizes text for fuzzy dictionary matching."""
    if not text:
        return ""
    return " ".join(str(text).casefold().split())


def _parse_income(val: Any) -> float:
    """Parses various income formats (numeric or human-readable ranges)."""
    if val is None or val == "":
        return 200000.0
    if isinstance(val, (int, float)):
        return float(val)

    text = str(val).lower().replace(",", "")
    numbers = re.findall(r"\d+(?:\.\d+)?", text)
    if not numbers:
        raise ValueError("Enter an annual income amount")
    parsed = float(numbers[-1])
    if "crore" in text:
        parsed *= 10000000
    elif "lakh" in text or "lac" in text:
        parsed *= 100000
    if "above" in text or "more" in text:
        # An open-ended band cannot prove compliance with an income ceiling.
        return float("inf")
    return parsed



def _parse_documents_list(docs_str: Any) -> list[str]:
    """Splits a document requirements string into clean list items."""
    if not docs_str or not isinstance(docs_str, str):
        return ["Document requirements are not recorded. Check official guidance."]

    cleaned = docs_str.strip()
    if not cleaned or cleaned.lower() in ["nan", "none", "not specified"]:
        return ["Document requirements are not recorded. Check official guidance."]

    # Split by common delimiters: commas, bullets, numbered lists, newlines
    items = re.split(r"[\n\r;•\-\*]|\d+\.\s*", cleaned)
    results = []
    for item in items:
        token = item.strip().strip(",")
        if len(token) > 2 and token.lower() not in ["and", "or"]:
            results.append(token)

    return results[:8] if results else [cleaned[:100]]


class EligibilityService:
    _instance: Optional["EligibilityService"] = None

    def __init__(self):
        if not CSV_PATH.exists():
            raise FileNotFoundError(f"Eligibility CSV not found at {CSV_PATH}")

        logger.info("loading_eligibility_engine", path=str(CSV_PATH))
        self.engine = EligibilityEngine(str(CSV_PATH))

        self.scheme_catalog: dict[str, dict] = {}
        if DOCS_PATH.exists():
            try:
                with open(DOCS_PATH, encoding="utf-8-sig", newline="") as f:
                    docs = list(csv.DictReader(f))
                for d in docs:
                    s_name = d.get("scheme_name", "")
                    norm_key = _normalize_key(s_name)
                    self.scheme_catalog[norm_key] = d
                logger.info("loaded_scheme_catalog", total=len(docs))
                locations = json.loads((BASE_DIR / "data" / "locations.json").read_text(encoding="utf-8"))
                self.locations = locations["states"]
                def scheme_state(row):
                    doc = self.scheme_catalog.get(_normalize_key(row["Scheme Name"]), {})
                    if doc.get("level", "").lower() == "central":
                        return "Any"
                    text = (doc.get("description", "") + " " + doc.get("eligibility", "")).lower()
                    found = [state for state in self.locations if state.lower() in text]
                    if len(found) == 1:
                        return found[0]
                    return "Unverified jurisdiction"
                self.engine.df["State"] = self.engine.df.apply(scheme_state, axis=1)

            except Exception as e:
                raise RuntimeError("Unable to load scheme catalogue or location snapshot") from e

    @classmethod
    def get_instance(cls) -> "EligibilityService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def normalize_profile(self, profile: dict[str, Any]) -> dict[str, Any]:
        """Maps diverse frontend profile fields into the schema expected by EligibilityEngine."""
        # Age
        age = profile.get("age") or profile.get("Age") or 30
        try:
            age = int(age)
        except (ValueError, TypeError):
            raise ValueError("Age must be a whole number")

        # Gender
        gender = profile.get("gender") or profile.get("Gender") or "Male"
        if gender in ["Prefer not to say", "Other"]:
            gender = "Any"

        # Category
        cat = profile.get("social_category") or profile.get("category") or profile.get("Category") or "General"
        if cat.lower() in ("sc", "scheduled caste"):
            cat = "SC"
        elif cat.lower() in ("st", "scheduled tribe"):
            cat = "ST"
        elif "obc" in cat.lower():
            cat = "OBC"
        elif "pwd" in cat.lower() or "disability" in cat.lower():
            cat = "PwD"
        elif "minority" in cat.lower():
            cat = "Minority"

        # Disability
        disability = str(profile.get("disability", profile.get("Disability", cat == "PwD"))).lower() in ("true", "yes", "1")

        # Location / State / District
        state = profile.get("state") or profile.get("State") or ""
        district = profile.get("district") or profile.get("District") or ""
        location_raw = profile.get("location") or ""
        if not state and location_raw:
            parts = [p.strip() for p in location_raw.split(",") if p.strip()]
            if len(parts) >= 2:
                district = parts[0]
                state = parts[1]
            elif len(parts) == 1:
                state = parts[0]

        # Rural
        rural_raw = profile.get("rural", profile.get("Rural"))
        if rural_raw is not None:
            rural = str(rural_raw).lower() in ("true", "yes", "1")
        else:
            rural = "rural" in location_raw.lower() or "village" in location_raw.lower()

        # Business / Activity
        business_type = (
            profile.get("business_type")
            or profile.get("Business_Type")
            or profile.get("occupation")
            or profile.get("businessActivity")
            or "MSME"
        )

        income = _parse_income(
            next((profile[k] for k in ("annual_income", "income", "Income") if profile.get(k) is not None and profile[k] != ""), None)
        )

        return {
            "Age": age,
            "Gender": gender,
            "Category": cat,
            "Income": income,
            "Disability": disability,
            "Rural": rural,
            "Business_Type": business_type,
            "State": state,
            "District": district,
        }

    def _enrich_match(self, item: dict[str, Any]) -> dict[str, Any]:
        """Merges engine evaluation with rich catalog details."""
        scheme_name = item.get("Scheme Name", "")
        norm_key = _normalize_key(scheme_name)
        doc = self.scheme_catalog.get(norm_key, {})

        matched_conditions = item.get("Matched Conditions", [])
        failed_conditions = item.get("Failed Conditions", [])
        match_score = item.get("Match Score", 0.0)
        confidence = item.get("Confidence", "Medium")
        is_eligible = item.get("Eligible", False)

        # Build natural explanation
        matched_str = ", ".join(matched_conditions) if matched_conditions else "General criteria"
        explanation = f"Passes the recorded checks for {matched_str}. Additional conditions in the official guidelines may apply."
        if failed_conditions:
            explanation += f" Did not meet: {', '.join(failed_conditions)}."

        # Required docs
        raw_docs = doc.get("documents", "")
        parsed_docs = _parse_documents_list(raw_docs)

        # Fallback values
        description = doc.get("description") or f"Government assistance scheme supporting {scheme_name}."
        benefits = doc.get("benefits") or "Financial subsidies, loans, and institutional support."
        app_process = doc.get("application_process") or "Apply online through the official department portal."
        official_url = doc.get("official_url") or "https://www.myscheme.gov.in"
        department = doc.get("level") or "Government of India"

        scheme_id = doc.get("slug") or re.sub(r"[^a-zA-Z0-9]", "_", scheme_name.lower())

        return {
            "scheme_id": scheme_id,
            "name": scheme_name,
            "scheme_name": scheme_name,
            "department": department,
            "category": doc.get("tags") or "Government Scheme",
            "description": description,
            "benefits": benefits,
            "score": round(match_score / 100.0, 2),
            "match_score_pct": match_score,
            "confidence": confidence,
            "eligible": is_eligible,
            "is_eligible": is_eligible,
            "matched_conditions": matched_conditions,
            "unmatched_conditions": failed_conditions,
            "failed_conditions": failed_conditions,
            "explanation": explanation,
            "detailed_explanation": item.get("Explanation", {}),
            "official_source_url": official_url,
            "application_route": app_process,
            "required_documents": parsed_docs,
            "notes": item.get("Notes", ""),
        }

    def match_schemes(self, raw_profile: dict[str, Any], top_n: int = 50, eligible_only: bool = False) -> list[dict[str, Any]]:
        """Main entry point: normalizes profile, executes engine, enriches output."""
        normalized = self.normalize_profile(raw_profile)
        if not 1 <= normalized["Age"] <= 120:
            raise ValueError("Age outside supported range")
        if normalized["Income"] < 0:
            raise ValueError("Income cannot be negative")
        if normalized["State"] not in self.locations:
            raise ValueError("Select a valid Indian state")
        if normalized["District"] and normalized["District"] not in self.locations[normalized["State"]]:
            raise ValueError("District does not belong to the selected state")
        logger.info("evaluating_eligibility")

        if eligible_only:
            results = self.engine.eligible_schemes(normalized)
        else:
            results = self.engine.recommend(normalized, top_n=len(self.engine.df))

        # Restrict clearly sector-specific schemes when the source table says ANY.
        activity = " ".join(str(raw_profile.get(k) or "") for k in ("occupation", "business_type", "businessActivity")).lower()
        sector_terms = {
            "agriculture": ("agriculture", "farm", "dairy", "poultry", "fisher", "horticulture", "kisan"),
            "technology": ("innovation", "incubation", "software", "technology"),
            "coir": ("coir",),
            "tourism": ("tourism", "hotel"),
        }
        filtered = []
        for result in results:
            title = result["Scheme Name"].lower()
            restricted = [terms for terms in sector_terms.values() if any(term in title for term in terms)]
            if restricted and not any(term in activity for terms in restricted for term in terms):
                continue
            filtered.append(result)
        enriched = [self._enrich_match(r) for r in filtered]
        terms = re.findall(r"\w+", str(raw_profile.get("occupation") or raw_profile.get("business_type") or "").lower())
        def relevance(item):
            doc = self.scheme_catalog.get(_normalize_key(item["name"]), {})
            text = (item["name"] + " " + doc.get("tags", "") + " " + item["description"]).lower()
            score = sum(5 for term in terms if len(term) > 2 and term in text)
            support = str(raw_profile.get("preferred_support") or "").lower()
            if support in ("loan", "subsidy", "grant", "training"):
                score += 4 * int(support in (item["name"] + " " + str(doc.get("benefits", ""))).lower())
            if any(term in item["name"].lower() for term in ("credit based schemes", "employment generation", "micro-finance", "self-employment")):
                score += 3
            return score
        enriched.sort(key=lambda item: (item["eligible"], relevance(item), item["score"]), reverse=True)
        return enriched[:top_n]


eligibility_service = EligibilityService.get_instance()
