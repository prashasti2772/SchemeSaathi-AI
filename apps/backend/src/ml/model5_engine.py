"""
Model 5 — Beneficiary Profile Builder, Normalizer & ML Matching Engine
Linked with Eligibility Engine, all_schemes_eligibility_table.csv, and trained ML eligibility model.
"""

from typing import Any, List, Optional
import os
import re
import joblib
import pandas as pd

# Direct & Package-Safe Imports
try:
    from src.ml.eligibility_engine.engine import EligibilityEngine
    from src.ml.eligibility_engine.matcher import EligibilityMatcher
    from src.ml.eligibility_engine.scorer import SchemeScorer
    from src.ml.eligibility_engine.train_model import extract_pair_features
except ImportError:
    try:
        from .eligibility_engine.engine import EligibilityEngine
        from .eligibility_engine.matcher import EligibilityMatcher
        from .eligibility_engine.scorer import SchemeScorer
        from .eligibility_engine.train_model import extract_pair_features
    except ImportError:
        from eligibility_engine.engine import EligibilityEngine
        from eligibility_engine.matcher import EligibilityMatcher
        from eligibility_engine.scorer import SchemeScorer
        from eligibility_engine.train_model import extract_pair_features

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMES_CSV_PATH = os.path.join(CURRENT_DIR, "eligibility_engine", "all_schemes_eligibility_table.csv")
ML_MODEL_PATH = os.path.join(CURRENT_DIR, "eligibility_engine", "eligibility_model.joblib")
DOCUMENTS_PKL_PATH = os.path.join(CURRENT_DIR, "chatbot", "documents.pkl")

STATE_MAPPING = {
    "up": "Uttar Pradesh",
    "u.p.": "Uttar Pradesh",
    "uttar pradesh": "Uttar Pradesh",
    "mp": "Madhya Pradesh",
    "m.p.": "Madhya Pradesh",
    "madhya pradesh": "Madhya Pradesh",
    "bihar": "Bihar",
    "rajasthan": "Rajasthan",
    "delhi": "Delhi",
    "maharashtra": "Maharashtra",
    "gujarat": "Gujarat",
    "tamil nadu": "Tamil Nadu",
    "tn": "Tamil Nadu",
    "karnataka": "Karnataka",
    "west bengal": "West Bengal",
    "wb": "West Bengal",
    "punjab": "Punjab",
    "haryana": "Haryana",
    "kerala": "Kerala",
    "andhra pradesh": "Andhra Pradesh",
    "ap": "Andhra Pradesh",
    "telangana": "Telangana",
    "odisha": "Odisha",
}


def normalize_state(value: str | None) -> str | None:
    if not value:
        return None
    val = value.strip().lower()
    return STATE_MAPPING.get(val, value.strip().title())


def normalize_income(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    
    val = str(value).lower().strip()
    val = val.replace("₹", "").replace("rs.", "").replace("rs", "").replace(",", "").strip()

    if "below" in val and "1 lakh" in val:
        return 80000.0
    if "below" in val and "50,000" in val:
        return 40000.0

    match = re.search(r"(\d+(?:\.\d+)?)", val)
    if not match:
        return None
    
    num = float(match.group(1))

    if "lakh" in val or "lac" in val:
        return num * 100000.0
    if "crore" in val or "cr" in val:
        return num * 10000000.0
    
    if num < 100 and "lakh" not in val:
        return num * 100000.0

    return num


class BeneficiaryProfileBuilder:
    def __init__(self):
        self.profile = {
            "full_name": None,
            "phone_number": None,
            "age": None,
            "gender": None,
            "state": None,
            "social_category": None,
            "occupation": None,
            "business_type": None,
            "business_stage": None,
            "years_in_business": None,
            "annual_turnover": None,
            "number_of_employees": None,
            "annual_income": None,
            "registered_business": None,
            "funding_required": None,
            "preferred_support": None,
            "interested_scheme_type": None,
        }

    def build_profile(self, raw_input: dict[str, Any]) -> dict[str, Any]:
        p = self.profile.copy()

        p["full_name"] = raw_input.get("full_name") or raw_input.get("fullName")
        p["phone_number"] = raw_input.get("phone_number") or raw_input.get("phoneNumber")
        
        # Age
        age_val = raw_input.get("age") or raw_input.get("Age")
        if age_val is not None:
            try:
                p["age"] = int(age_val)
            except (ValueError, TypeError):
                p["age"] = None

        # Gender
        gender_val = raw_input.get("gender") or raw_input.get("Gender")
        if gender_val:
            p["gender"] = str(gender_val).strip().lower()

        # State / Location
        loc_val = raw_input.get("location") or raw_input.get("state") or raw_input.get("State")
        p["state"] = normalize_state(loc_val)

        # Social Category
        cat_val = raw_input.get("social_category") or raw_input.get("category") or raw_input.get("Category")
        if cat_val:
            p["social_category"] = str(cat_val).strip().upper()

        # Occupation & Business Type
        p["occupation"] = raw_input.get("occupation") or raw_input.get("businessActivity")
        p["business_type"] = raw_input.get("business_type") or raw_input.get("businessType") or raw_input.get("Business_Type") or p["occupation"]
        p["business_stage"] = raw_input.get("business_stage") or raw_input.get("businessStage")
        p["years_in_business"] = raw_input.get("years_in_business") or raw_input.get("yearsInBusiness")
        p["annual_turnover"] = raw_input.get("annual_turnover") or raw_input.get("annualTurnover")
        p["number_of_employees"] = raw_input.get("number_of_employees") or raw_input.get("numberOfEmployees")

        # Income & Funding
        p["annual_income"] = normalize_income(raw_input.get("annual_income") or raw_input.get("annualIncome") or raw_input.get("Income"))
        p["funding_required"] = normalize_income(raw_input.get("funding_required") or raw_input.get("fundingRequired"))
        
        # Registered Business
        reg_val = raw_input.get("registered_business") or raw_input.get("registeredBusiness")
        if reg_val:
            p["registered_business"] = "Yes" if str(reg_val).strip().lower() in ["yes", "true", "1"] else "No"

        # Preferred Support & Interest
        p["preferred_support"] = raw_input.get("preferred_support") or raw_input.get("preferredSupport")
        p["interested_scheme_type"] = raw_input.get("interested_scheme_type") or raw_input.get("interestedSchemeType")

        # Rural / Disability flags
        p["rural"] = bool(raw_input.get("rural", raw_input.get("is_rural", False)))
        p["disability"] = bool(raw_input.get("disability", raw_input.get("has_disability", False)))

        return p


# ============================================================
# Scheme Metadata & Catalog Loader
# ============================================================

def _load_documents_map() -> dict:
    """Loads rich metadata from documents.pkl keyed by lower-cased normalized scheme name."""
    doc_map = {}
    if os.path.exists(DOCUMENTS_PKL_PATH):
        try:
            import pickle
            with open(DOCUMENTS_PKL_PATH, "rb") as f:
                docs = pickle.load(f)
                for d in docs:
                    name = str(d.get("scheme_name", "")).strip().lower()
                    doc_map[name] = d
        except Exception:
            pass
    return doc_map


def _build_full_schemes_catalog() -> List[dict]:
    """
    Builds comprehensive scheme catalog from all_schemes_eligibility_table.csv
    enriched with descriptions, benefits, and urls from documents.pkl.
    """
    if not os.path.exists(SCHEMES_CSV_PATH):
        return []

    df = pd.read_csv(SCHEMES_CSV_PATH).fillna("")
    docs_map = _load_documents_map()

    catalog = []
    for idx, row in df.iterrows():
        raw_name = str(row.get("Scheme Name", f"Scheme {idx}")).strip(' "')
        lower_name = raw_name.lower()
        
        # Check matching rich doc
        doc_info = docs_map.get(lower_name, {})
        if not doc_info:
            for k, v in docs_map.items():
                if k in lower_name or lower_name in k:
                    doc_info = v
                    break

        cat = row.get("Business Types") or doc_info.get("tags") or "Welfare Scheme"
        benefits = doc_info.get("benefits") or "Government financial assistance, subsidy, or developmental grant."
        desc = doc_info.get("description") or f"Government assistance initiative under {raw_name}."
        official_url = doc_info.get("official_url") or "https://myscheme.gov.in"
        app_route = doc_info.get("application_process") or "Apply online via the official government portal or nearest Common Service Center (CSC)."
        req_docs = [d.strip() for d in str(doc_info.get("documents", "Aadhaar Card, Identity Proof, Bank Passbook")).split(";") if d.strip()]

        catalog.append({
            "scheme_id": f"scheme-ml-{idx:04d}",
            "name": raw_name,
            "scheme_name": raw_name,
            "category": cat if cat != "ANY" else "General Support",
            "department": doc_info.get("level", "Government of India"),
            "description": desc,
            "benefits": benefits,
            "official_source_url": official_url,
            "application_route": app_route,
            "required_documents": req_docs,
            "criteria_row": row,
        })
    return catalog


# Dynamically load all 653 schemes
DEFAULT_SCHEMES_CATALOG = _build_full_schemes_catalog()

# Initialize Eligibility Engine and ML Model
eligibility_engine = EligibilityEngine(SCHEMES_CSV_PATH)

_ml_artifact = None
if os.path.exists(ML_MODEL_PATH):
    try:
        _ml_artifact = joblib.load(ML_MODEL_PATH)
    except Exception:
        _ml_artifact = None


def match_schemes_with_engine(profile: dict[str, Any], top_n: int = 25) -> List[dict]:
    """
    Evaluates profile against all schemes in all_schemes_eligibility_table.csv
    using EligibilityEngine rule matching, SchemeScorer explainability, and ML model.
    """
    user_for_engine = {
        "Age": profile.get("age", 25) or 25,
        "Gender": (profile.get("gender") or "any").capitalize(),
        "Category": (profile.get("social_category") or "GENERAL").upper(),
        "Income": profile.get("annual_income") or 150000.0,
        "Disability": bool(profile.get("disability", False)),
        "Rural": bool(profile.get("rural", False)),
        "Business_Type": profile.get("business_type") or profile.get("occupation") or "MSME",
        "State": profile.get("state") or "All India",
    }

    # 1. Rule Engine Evaluation
    recommendations = eligibility_engine.recommend(user_for_engine, top_n=len(DEFAULT_SCHEMES_CATALOG))

    # Index recommendations by Scheme Name for fast lookup
    rec_by_name = {r["Scheme Name"]: r for r in recommendations}

    # 2. Enrich and combine with ML scoring (Vectorized Batch Predict)
    results = []
    ml_model = _ml_artifact.get("model") if _ml_artifact else None
    schemes_criteria = _ml_artifact.get("schemes_criteria") if _ml_artifact else None

    # Compute all ML scores in batch for max performance (0.1s instead of 27s)
    ml_scores = {}
    if ml_model is not None and schemes_criteria is not None:
        try:
            import numpy as np
            batch_feats = [extract_pair_features(user_for_engine, c) for c in schemes_criteria]
            if batch_feats:
                preds = ml_model.predict(np.array(batch_feats))
                for i, p in enumerate(preds):
                    ml_scores[i] = float(p)
        except Exception:
            pass

    for idx, item in enumerate(DEFAULT_SCHEMES_CATALOG):
        scheme_name = item["name"]
        rec = rec_by_name.get(scheme_name) or rec_by_name.get(f'"{scheme_name}"')

        rule_score = float(rec["Match Score"]) if rec else 60.0
        is_eligible = bool(rec["Eligible"]) if rec else True
        matched_conds = rec["Matched Conditions"] if rec else ["General"]
        failed_conds = rec["Failed Conditions"] if rec else []

        # ML Model prediction from batch lookup
        ml_score = ml_scores.get(idx, rule_score / 100.0)

        # Blended Score: 60% rule-based + 40% ML regressor
        blended_score = round(0.6 * (rule_score / 100.0) + 0.4 * ml_score, 3)

        # Build Explanation
        if failed_conds:
            explanation = f"Matches {len(matched_conds)} requirements ({', '.join(matched_conds)}). Missed: {', '.join(failed_conds)}."
        else:
            explanation = f"100% Eligible! Successfully matches all requirements: {', '.join(matched_conds)}."

        confidence = "Very High" if blended_score >= 0.85 else ("High" if blended_score >= 0.70 else ("Medium" if blended_score >= 0.50 else "Low"))

        results.append({
            "scheme_id": item.get("scheme_id", f"scheme-{idx}"),
            "name": scheme_name,
            "scheme_name": scheme_name,
            "category": item.get("category", "Government Scheme"),
            "department": item.get("department", "Government of India"),
            "description": item.get("description", ""),
            "benefits": item.get("benefits", "Financial Assistance"),
            "score": blended_score,
            "confidence": confidence,
            "eligible": is_eligible,
            "explanation": explanation,
            "matched_conditions": matched_conds,
            "unmatched_conditions": failed_conds,
            "official_source_url": item.get("official_source_url"),
            "application_route": item.get("application_route", "Apply via official portal."),
            "required_documents": item.get("required_documents", []),
        })

    # Rank by eligibility and score
    results.sort(key=lambda x: (x["eligible"], x["score"]), reverse=True)
    return results[:top_n]
