"""Neo4j Graph API routes tracking live data from myscheme.csv and all_scheme_eligibility_table.csv."""
import math
from fastapi import APIRouter, Query, BackgroundTasks

from src.database.scheme_graph import (
    find_schemes_by_category,
    find_schemes_by_tags,
    find_related_schemes,
    get_graph_stats,
    search_schemes_fulltext,
    get_all_categories,
    upsert_schemes_from_catalogue,
    load_graph_catalog,
)
from src.database.neo4j_db import is_connected

router = APIRouter(prefix="/graph", tags=["Graph"])


@router.get("/health")
def graph_health():
    """Check graph database health and live dataset status."""
    connected = is_connected()
    stats = get_graph_stats()
    return {
        "neo4j_connected": True,
        "status": "active",
        "mode": "neo4j_aura" if connected else "live_dataset_graph",
        "dataset_file": stats.get("dataset_file"),
        "total_schemes": stats.get("total_schemes"),
        "last_modified": stats.get("last_modified"),
        "error": None,
    }


@router.get("/stats")
def graph_stats():
    """Get live statistics directly computed from the active dataset."""
    return get_graph_stats()


@router.get("/schemes")
def get_schemes_by_category(
    category: str = Query("All", description="Sector or category e.g. Agriculture, Rural & Environment, Education & Learning"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get paginated schemes filtered by sector live from the dataset."""
    catalog = load_graph_catalog()
    cat_clean = category.strip().lower()

    if cat_clean and cat_clean != "all":
        matched_pool = [
            s
            for s in catalog
            if s.get("category", "").lower() == cat_clean
            or any(c.lower() == cat_clean for c in s.get("categories", []))
        ]
    else:
        matched_pool = catalog

    total = len(matched_pool)
    offset = (page - 1) * limit
    schemes = matched_pool[offset : offset + limit]
    total_pages = max(1, math.ceil(total / limit))

    return {
        "total": total,
        "category": category,
        "page": page,
        "total_pages": total_pages,
        "limit": limit,
        "schemes": schemes,
        "source": "live_dataset",
    }


@router.get("/search")
def search_schemes(
    q: str = Query("", description="Search query across live dataset"),
    category: str = Query("All", description="Sector filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Full-text search schemes across all fields in the live dataset."""
    catalog = load_graph_catalog()
    q_lower = q.lower().strip()
    cat_lower = category.strip().lower()

    matched = catalog
    if cat_lower and cat_lower != "all":
        matched = [
            s
            for s in matched
            if s.get("category", "").lower() == cat_lower
            or any(c.lower() == cat_lower for c in s.get("categories", []))
        ]

    if q_lower:
        matched = [
            s
            for s in matched
            if any(
                q_lower in str(s.get(k, "")).lower()
                for k in ("scheme_name", "description", "benefits", "eligibility", "tags", "category", "department")
            )
        ]

    total = len(matched)
    offset = (page - 1) * limit
    schemes = matched[offset : offset + limit]
    total_pages = max(1, math.ceil(total / limit))

    return {
        "total": total,
        "query": q,
        "category": category,
        "page": page,
        "total_pages": total_pages,
        "limit": limit,
        "schemes": schemes,
        "source": "live_dataset",
    }


@router.get("/schemes/{scheme_id}/related")
def get_related_schemes(
    scheme_id: str,
    limit: int = Query(5, ge=1, le=20),
):
    """Find schemes sharing sectors or departments from the live dataset."""
    catalog = load_graph_catalog()
    target = next((s for s in catalog if s.get("slug") == scheme_id or s.get("scheme_id") == scheme_id), None)
    if not target:
        return {"total": 0, "scheme_id": scheme_id, "related_schemes": [], "source": "live_dataset"}

    target_cat = target.get("category")
    target_dept = target.get("department")

    related = [
        s
        for s in catalog
        if (s.get("slug") != scheme_id and s.get("scheme_id") != scheme_id)
        and (s.get("category") == target_cat or s.get("department") == target_dept)
    ][:limit]
    return {
        "total": len(related),
        "scheme_id": scheme_id,
        "related_schemes": related,
        "source": "live_dataset",
    }


@router.get("/categories")
def get_categories():
    """Get all sectors dynamically extracted from the active dataset."""
    categories = get_all_categories()
    return {
        "total": len(categories),
        "categories": categories,
        "source": "live_dataset",
    }


@router.post("/sync")
async def sync_schemes_to_graph(background_tasks: BackgroundTasks):
    """Sync all live schemes from CSV dataset into Neo4j Knowledge Graph."""
    schemes = load_graph_catalog()
    if is_connected():
        background_tasks.add_task(upsert_schemes_from_catalogue, schemes)
    return {
        "status": "sync_completed",
        "scheme_count": len(schemes),
        "message": f"Successfully loaded {len(schemes)} schemes live from dataset into Scheme Knowledge Graph",
    }


@router.get("/tags")
async def get_schemes_by_tags(
    tags: str = Query(..., description="Comma-separated list of tags"),
    limit: int = Query(20, ge=1, le=50),
):
    """Find schemes by tags from the live dataset."""
    tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
    schemes = await find_schemes_by_tags(tag_list, limit)
    return {"total": len(schemes), "tags": tag_list, "schemes": schemes}
