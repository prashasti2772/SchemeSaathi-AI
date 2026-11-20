from typing import Any, Optional
import re
from fastapi import APIRouter, Query, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.rate_limiter import limiter
from src.modules.eligibility import localization
from pydantic import BaseModel

from src.modules.eligibility.service import eligibility_service

router = APIRouter(prefix="/eligibility", tags=["Eligibility"])


class UserProfilePayload(BaseModel):
    preferred_language: localization.Language = "en"
    age: Optional[int] = None
    gender: Optional[str] = None
    social_category: Optional[str] = None
    annual_income: Optional[Any] = None
    business_type: Optional[str] = None
    state: Optional[str] = ""
    district: Optional[str] = ""
    disability: Optional[bool] = None
    rural: Optional[bool] = None
    occupation: Optional[str] = ""
    education: Optional[str] = None
    interests: Optional[str] = None
    welfare_needs: Optional[str] = None
    entrepreneurship_support: Optional[bool] = None
    funding_required: Optional[Any] = ""
    preferred_support: Optional[str] = ""
    registered_business: Optional[str] = ""
    phone_number: Optional[str] = None
    full_name: Optional[str] = None

    # Scheme-specific follow-up fields are explicit answers, never invented defaults.
    model_config = {"extra": "allow"}


def _matches(payload, top_n, eligible_only):
    try:
        return eligibility_service.match_schemes(payload.model_dump(), top_n=top_n, eligible_only=eligible_only)
    except (TypeError, ValueError):
        raise HTTPException(422, "Please check age, income and profile values")


@router.post("/recommend")
async def recommend_schemes(payload: UserProfilePayload, top_n: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    """Recommends top government schemes based on user profile matching."""
    matches = _matches(payload, top_n, False)
    matches = await localization.localize_records(db, matches, payload.preferred_language)
    return {
        "success": True,
        "total": len(matches),
        "matches": matches,
    }


@router.post("/eligible")
async def eligible_schemes_only(payload: UserProfilePayload, db: AsyncSession = Depends(get_db)):
    """Returns only schemes where all eligibility rules are completely satisfied."""
    matches = _matches(payload, 100, True)
    matches = await localization.localize_records(db, matches, payload.preferred_language)
    return {
        "success": True,
        "total": len(matches),
        "matches": matches,
    }


@router.post("/explain")
def explain_best_scheme(payload: UserProfilePayload):
    """Provides Explainable AI breakdown for the top matched scheme."""
    matches = _matches(payload, 1, False)
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
async def search_schemes(request: Request, query: Optional[str] = Query(None, max_length=200), category: Optional[str] = Query(None, max_length=80), limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), language: localization.Language = "en", db: AsyncSession = Depends(get_db)):
    """Search in the selected language; keep original identifiers and official URLs."""
    catalog = list(eligibility_service.scheme_catalog.values())
    if category:
        catalog = [row for row in catalog if row["category"].casefold() == category.casefold()]
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
        "catalogue_version": "2026-10-31",
    }


@router.get("/categories")
def scheme_categories():
    from collections import Counter
    counts = Counter(row["category"] for row in eligibility_service.scheme_catalog.values())
    return {"total": sum(counts.values()), "categories": [{"name": key, "count": value} for key, value in sorted(counts.items())]}


@router.get("/schemes/{scheme_id}")
async def scheme_detail(scheme_id: str, language: localization.Language = "en", db: AsyncSession = Depends(get_db)):
    scheme = eligibility_service.get_scheme(scheme_id)
    if scheme is None:
        raise HTTPException(404, "Scheme is not in the reviewed catalogue")
    return (await localization.localize_records(db, [scheme], language))[0]
