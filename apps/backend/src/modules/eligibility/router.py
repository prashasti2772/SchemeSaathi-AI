from typing import Any, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from src.modules.eligibility.service import eligibility_service

router = APIRouter(prefix="/eligibility", tags=["Eligibility"])


class UserProfilePayload(BaseModel):
    age: Optional[int] = 30
    gender: Optional[str] = "Male"
    social_category: Optional[str] = "General"
    annual_income: Optional[Any] = 200000.0
    business_type: Optional[str] = "MSME"
    state: Optional[str] = ""
    district: Optional[str] = ""
    disability: Optional[bool] = False
    rural: Optional[bool] = False
    occupation: Optional[str] = ""
    funding_required: Optional[Any] = ""
    preferred_support: Optional[str] = ""
    registered_business: Optional[str] = ""
    phone_number: Optional[str] = None
    full_name: Optional[str] = None


@router.post("/recommend")
def recommend_schemes(payload: UserProfilePayload, top_n: int = Query(20, ge=1, le=100)):
    """Recommends top government schemes based on user profile matching."""
    profile_dict = payload.model_dump()
    matches = eligibility_service.match_schemes(profile_dict, top_n=top_n, eligible_only=False)
    return {
        "success": True,
        "total": len(matches),
        "matches": matches,
    }


@router.post("/eligible")
def eligible_schemes_only(payload: UserProfilePayload):
    """Returns only schemes where all eligibility rules are completely satisfied."""
    profile_dict = payload.model_dump()
    matches = eligibility_service.match_schemes(profile_dict, top_n=100, eligible_only=True)
    return {
        "success": True,
        "total": len(matches),
        "matches": matches,
    }


@router.post("/explain")
def explain_best_scheme(payload: UserProfilePayload):
    """Provides Explainable AI breakdown for the top matched scheme."""
    profile_dict = payload.model_dump()
    matches = eligibility_service.match_schemes(profile_dict, top_n=1, eligible_only=False)
    if not matches:
        return {"success": False, "message": "No matching schemes found"}
    best = matches[0]
    return {
        "success": True,
        "scheme_name": best["name"],
        "match_score": best["score"],
        "confidence": best["confidence"],
        "is_eligible": best["is_eligible"],
        "matched_conditions": best["matched_conditions"],
        "failed_conditions": best["failed_conditions"],
        "explanation": best["explanation"],
        "detailed_breakdown": best["detailed_explanation"],
    }


@router.get("/schemes")
def search_schemes(query: Optional[str] = None, limit: int = Query(20, ge=1, le=100)):
    """Searches or lists catalog schemes."""
    catalog = list(eligibility_service.scheme_catalog.values())
    if query:
        q = query.lower()
        catalog = [
            s for s in catalog
            if q in s.get("scheme_name", "").lower()
            or q in s.get("description", "").lower()
            or q in s.get("tags", "").lower()
        ]
    return {
        "total": len(catalog),
        "schemes": catalog[:limit],
    }
