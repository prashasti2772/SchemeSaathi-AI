from typing import Any, Optional
import re
from fastapi import APIRouter, Query, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.rate_limiter import limiter
from src.modules.eligibility import localization
from pydantic import BaseModel

from src.modules.eligibility.service import eligibility_service

router = APIRouter(prefix="/eligibility", tags=["Eligibility"])


class UserProfilePayload(BaseModel):
    preferred_language: localization.Language = "en"
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
async def recommend_schemes(payload: UserProfilePayload, top_n: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    """Recommends top government schemes based on user profile matching."""
    profile_dict = payload.model_dump()
    matches = eligibility_service.match_schemes(profile_dict, top_n=top_n, eligible_only=False)
    matches = await localization.localize_records(db, matches, payload.preferred_language)
    return {
        "success": True,
        "total": len(matches),
        "matches": matches,
    }


@router.post("/eligible")
async def eligible_schemes_only(payload: UserProfilePayload, db: AsyncSession = Depends(get_db)):
    """Returns only schemes where all eligibility rules are completely satisfied."""
    profile_dict = payload.model_dump()
    matches = eligibility_service.match_schemes(profile_dict, top_n=100, eligible_only=True)
    matches = await localization.localize_records(db, matches, payload.preferred_language)
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
@limiter.limit("30/minute")
async def search_schemes(request: Request, query: Optional[str] = Query(None, max_length=200), limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), language: localization.Language = "en", db: AsyncSession = Depends(get_db)):
    """Search in the selected language; keep original identifiers and official URLs."""
    catalog = list(eligibility_service.scheme_catalog.values())
    normalized_query, query_status = await localization.search_query(query or "", language)
    if query:
        # str.split preserves Indic combining marks; \w alone splits words incorrectly.
        tokens = normalized_query.casefold().split()
        catalog = [s for s in catalog if all(t in " ".join(str(s.get(k) or "") for k in
            ("scheme_name", "description", "tags", "benefits", "eligibility")).casefold() for t in tokens)]
    page = await localization.localize_records(db, catalog[offset:offset + limit], language)
    return {
        "total": len(catalog), "schemes": page,
        "offset": offset, "has_more": offset + limit < len(catalog),
        "translation_status": "original" if language == "en" else "unavailable" if any(row["translation_status"] != "translated" for row in page) else "translated",
        "search_translation_status": query_status,
    }
