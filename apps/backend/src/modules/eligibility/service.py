"""Citizen discovery with explicit unknown information and cited screening rules."""
import copy
import json
import math
import re
from pathlib import Path
from typing import Any, Optional

from src.modules.eligibility.catalogue import load_catalogue


def _normalize_key(text: str) -> str:
    return " ".join(str(text or "").casefold().split())


def _parse_income(val: Any) -> Optional[float]:
    if val is None or (isinstance(val, str) and not val.strip()):
        return None
    if isinstance(val, bool):
        raise ValueError("Income must be an amount")
    if isinstance(val, (int, float)):
        parsed = float(val)
        if not math.isfinite(parsed):
            raise ValueError("Income must be finite")
        return parsed
    text = str(val).lower().replace(",", "")
    numbers = re.findall(r"\d+(?:\.\d+)?", text)
    if not numbers:
        raise ValueError("Enter an annual income amount")
    if text.lstrip().startswith("-"):
        raise ValueError("Income cannot be negative")
    parsed = float(numbers[-1])
    if "crore" in text:
        parsed *= 10000000
    elif "lakh" in text or "lac" in text:
        parsed *= 100000
    if "above" in text or "more" in text:
        return float("inf")
    return parsed


def _optional_bool(value):
    if value is None or value == "":
        return None
    if value is True or str(value).casefold() in {"true", "yes", "1"}:
        return True
    if value is False or str(value).casefold() in {"false", "no", "0"}:
        return False
    return None


def _parse_documents_list(value):
    return [part.strip() for part in str(value or "").split(";") if part.strip()]


BUSINESS_SECTORS = {
    "retail": {"retail", "shop", "store", "trader", "vendor", "selling", "trade", "trading", "mart", "kiosk", "stall", "merchant", "commercial", "micro business", "msme"},
    "trading": {"trading", "trade", "retail", "wholesale", "shop", "merchant", "distributor", "vendor", "micro business", "msme"},
    "artisan": {"artisan", "craft", "carpenter", "potter", "blacksmith", "goldsmith", "sculptor", "weaver", "cobbler", "tailor", "handicraft", "handloom", "darzi", "barber", "washerman"},
    "manufacturing": {"manufacturing", "factory", "unit", "production", "industrial", "fabrication", "processing", "msme"},
    "service": {"service", "services", "repair", "salon", "parlour", "beauty", "hotel", "restaurant", "consult", "it", "transport", "freelance", "hospitality", "msme"},
    "agriculture": {"agriculture", "farming", "farm", "crop", "dairy", "poultry", "cattle", "livestock", "fish", "fisheries", "horticulture", "kisan"},
}


class EligibilityService:
    _instance = None

    def __init__(self):
        self.scheme_catalog = {_normalize_key(row["scheme_name"]): row for row in load_catalogue()}
        self.locations = json.loads((Path(__file__).resolve().parents[2] / "data" / "locations.json").read_text(encoding="utf-8"))["states"]

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_scheme(self, scheme_id: str) -> dict | None:
        """Stable public view used by detail and persisted saved-scheme routes."""
        row = next((row for row in self.scheme_catalog.values() if row["slug"] == scheme_id), None)
        return copy.deepcopy(row) if row else None

    def normalize_profile(self, profile: dict[str, Any]) -> dict[str, Any]:
        def supplied(*keys):
            return next((profile[key] for key in keys if profile.get(key) is not None and profile[key] != ""), None)
        normalized = dict(profile)
        age = supplied("age", "Age")
        if age is not None:
            try:
                if isinstance(age, bool) or float(age) != int(float(age)):
                    raise ValueError("Age must be a whole number")
                age = int(float(age))
            except (ValueError, TypeError, OverflowError):
                raise ValueError("Age must be a whole number")
            if not 1 <= age <= 120:
                raise ValueError("Age outside supported range")
        gender = _normalize_key(supplied("gender", "Gender")) or None
        if gender in {"prefer not to say", "other", "any", "unknown"}:
            gender = None
        cat = supplied("social_category", "socialCategory", "category", "Category")
        cat = str(cat).upper() if cat else None
        state, district = supplied("state", "State"), supplied("district", "District")
        location = supplied("location")
        if not state and location:
            parts = [p.strip() for p in str(location).split(",") if p.strip()]
            state = parts[-1] if parts else None
            district = parts[0] if len(parts) > 1 else district
        if state and state not in self.locations:
            raise ValueError("Select a valid Indian state")
        if district and (not state or district not in self.locations[state]):
            raise ValueError("District does not belong to the selected state")
        income = _parse_income(supplied("annual_income", "annualIncome", "income", "Income"))
        if income is not None and income < 0:
            raise ValueError("Income cannot be negative")
        normalized.update(age=age, gender=gender, social_category=cat, annual_income=income,
                          state=state, district=district,
                          disability=_optional_bool(supplied("disability", "Disability")),
                          rural=_optional_bool(supplied("rural", "Rural")),
                          education=supplied("education"), occupation=supplied("occupation"),
                          interests=supplied("interests"), welfare_needs=supplied("welfare_needs", "welfareNeeds"),
                          entrepreneurship_support=_optional_bool(supplied("entrepreneurship_support", "entrepreneurshipSupport")),
                          business_type=supplied("business_type", "Business_Type", "businessActivity"))
        normalized.update(Age=age, Gender=gender, Category=cat, Income=income,
                          Disability=normalized["disability"], Rural=normalized["rural"],
                          State=state, District=district, Business_Type=normalized["business_type"])
        return normalized

    def evaluate_scheme(self, profile, doc):
        matched, failed, unknown, checks = [], [], [], []
        if profile.get("state"):
            matched.append("State")
        else:
            unknown.append("State of residence")
        for criterion in doc["criteria"]:
            value = profile.get(criterion["field"])
            label = criterion["label"]
            if value is None or value == "" or str(value).casefold() == "unknown":
                unknown.append(label)
                checks.append(dict(criterion, result="UNKNOWN"))
                continue
            expected = criterion["value"]
            if isinstance(expected, bool):
                value = _optional_bool(value)
            if value is None:
                unknown.append(label)
                checks.append(dict(criterion, result="UNKNOWN"))
                continue
            try:
                op = criterion["operator"]
                passes = {"eq": lambda: value == expected,
                          "in": lambda: value in expected,
                          "lte": lambda: float(value) <= expected,
                          "gte": lambda: float(value) >= expected,
                          "gt": lambda: float(value) > expected,
                          "between": lambda: expected[0] <= float(value) <= expected[1]}[op]()
            except (TypeError, ValueError, KeyError):
                unknown.append(label)
                checks.append(dict(criterion, result="UNKNOWN"))
                continue
            (matched if passes else failed).append(label)
            checks.append(dict(criterion, result="MATCH" if passes else "NOT_MATCH"))
        status = "INELIGIBLE" if failed else "UNKNOWN" if unknown else "ELIGIBLE"
        score = round(len(matched) / max(1, len(matched) + len(failed) + len(unknown)), 4)
        explanation = "Passes the recorded preliminary checks." if status == "ELIGIBLE" else "More information is required before eligibility can be determined." if status == "UNKNOWN" else "Does not meet one or more recorded criteria."
        if failed:
            explanation += " Not met: " + "; ".join(failed) + "."
        if unknown:
            explanation += " Required information: " + "; ".join(unknown) + "."
        explanation += " The administering department makes the final decision."
        return dict(copy.deepcopy(doc), eligible=status == "ELIGIBLE", is_eligible=status == "ELIGIBLE",
                    status=status, eligibility_status=status, score=score, match_score_pct=round(score * 100, 2),
                    screening_result="NOT_MATCH" if failed else "UNKNOWN" if unknown else "MATCH",
                    confidence="Preliminary screening", matched_conditions=matched, failed_conditions=failed,
                    unmatched_conditions=failed, unknown_conditions=unknown, required_information=unknown,
                    detailed_explanation=checks, explanation=explanation,
                    official_source_url=doc["official_url"], application_route=doc["application_process"],
                    required_documents=_parse_documents_list(doc.get("documents")), notes="Official guidance reviewed " + doc["verified_on"])

    def match_schemes(self, raw_profile: dict[str, Any], top_n=50, eligible_only=False):
        profile = self.normalize_profile(raw_profile)
        results = [self.evaluate_scheme(profile, doc) for doc in self.scheme_catalog.values()]
        if eligible_only:
            results = [item for item in results if item["status"] == "ELIGIBLE"]
        if profile["entrepreneurship_support"] is False:
            results = [item for item in results if item["category"] != "Entrepreneurship"]

        user_bus = str(profile.get("business_type") or "").strip().lower()
        has_business = bool(user_bus and user_bus not in ("none", "n/a", "no", "null", "false"))
        interests_str = " ".join(str(profile.get(k) or "").lower() for k in ("occupation", "interests", "welfare_needs"))

        # When a user explicitly provides a business type (e.g. Retail, Trading, Service, etc.):
        # Only suggest schemes related to their business type and applicable across other businesses.
        # Filter out unrelated citizen life-event schemes unless the profile explicitly requests them.
        if has_business:
            is_artisan = any(w in user_bus for w in BUSINESS_SECTORS["artisan"])
            is_agri = any(w in user_bus for w in BUSINESS_SECTORS["agriculture"])

            filtered_results = []
            for item in results:
                cat = item.get("category", "")
                content = (cat + " " + item.get("tags", "") + " " + item.get("description", "")).lower()

                # Suppress citizen welfare schemes that are strictly for non-business life events
                if cat == "Agriculture" and not (is_agri or "agri" in interests_str or "farm" in interests_str):
                    continue
                if cat == "Education" and not ("student" in interests_str or "education" in interests_str or "scholarship" in interests_str):
                    continue
                if cat == "Women" and not ("maternity" in interests_str or "pregnancy" in interests_str):
                    continue
                if cat == "Disability Support" and not (profile.get("disability") is True or "disabilit" in interests_str or "divyang" in interests_str):
                    continue
                if cat == "Housing" and not ("housing" in interests_str or "home" in interests_str):
                    continue
                if cat == "Pensions" and not ("pension" in interests_str or "elderly" in interests_str):
                    continue
                if cat == "Employment" and not ("job" in interests_str or "unemployed" in interests_str or "career" in interests_str):
                    continue
                if cat == "Healthcare" and not ("health" in interests_str or "hospital" in interests_str):
                    continue
                # Traditional artisan-only schemes require artisan trade or artisan interest
                if cat == "Artisan Support" and not (is_artisan or "artisan" in interests_str or "craft" in interests_str):
                    continue
                # Unrelated youth job training for dropouts
                if cat == "Skill Development" and not re.search(r"entrepreneur|business|enterprise|management", content):
                    continue

                filtered_results.append(item)
            results = filtered_results

        text = " ".join(str(profile.get(k) or "") for k in ("occupation", "interests", "welfare_needs", "business_type"))
        tokens = {t for t in re.findall(r"\w+", text.casefold()) if len(t) > 2}
        if has_business:
            for sector, syns in BUSINESS_SECTORS.items():
                if any(w in user_bus for w in syns):
                    tokens.update(syns)

        for item in results:
            content = (item["category"] + " " + item["tags"] + " " + item["description"]).casefold()
            relevant = sum(token in content for token in tokens)
            if profile["entrepreneurship_support"] is True and re.search(r"entrepreneur|artisan|microenterprise", content):
                relevant += 1
            if has_business:
                for sector, syns in BUSINESS_SECTORS.items():
                    if any(w in user_bus for w in syns) and any(w in item.get("tags", "").lower() for w in syns):
                        relevant += 2
            item["relevance_score"] = relevant
            item["relevance_status"] = "MATCH" if relevant else "UNKNOWN"
        results.sort(key=lambda item: (item["status"] != "INELIGIBLE", item["relevance_score"], item["status"] == "ELIGIBLE", item["score"]), reverse=True)
        return results[:top_n]


eligibility_service = EligibilityService.get_instance()
