"""Neo4j Graph engine with live dataset tracking from myscheme.csv and all_scheme_eligibility_table.csv."""
import csv
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
import pandas as pd

from src.database.neo4j_db import get_driver, is_connected
from src.config.settings import settings

# Live cache state tracking file modifications
_cached_schemes: list[dict] = []
_cached_mtime: float = 0.0
_cached_dataset_name: str = ""
_cached_categories: list[str] = []
_cached_departments: list[str] = []

SECTORS_MAP = {
    "Social welfare & Empowerment": ("Social Welfare & Empowerment", "Department of Social Justice and Empowerment"),
    "Education & Learning": ("Education & Learning", "Department of Higher Education"),
    "Agriculture": ("Agriculture, Rural & Environment", "Ministry of Agriculture and Farmers Welfare"),
    "Rural & Environment": ("Agriculture, Rural & Environment", "Ministry of Agriculture and Farmers Welfare"),
    "Business & Entrepreneurship": ("Business & Entrepreneurship", "Ministry of Micro, Small and Medium Enterprises"),
    "Health & Wellness": ("Health & Wellness", "Ministry of Health and Family Welfare"),
    "Skills & Employment": ("Skills & Employment", "Ministry of Skill Development and Entrepreneurship"),
    "Banking": ("Banking, Financial Services and Insurance", "Department of Financial Services"),
    "Financial Services and Insurance": ("Banking, Financial Services and Insurance", "Department of Financial Services"),
    "Housing & Shelter": ("Housing & Shelter", "Ministry of Housing and Urban Affairs"),
    "Utility & Sanitation": ("Housing & Shelter", "Ministry of Housing and Urban Affairs"),
    "Sports & Culture": ("Sports & Culture", "Ministry of Youth Affairs and Sports"),
    "Women and Child": ("Women & Child Development", "Ministry of Women and Child Development"),
    "Science": ("Science, IT & Communications", "Department of Science and Technology"),
    "IT & Communications": ("Science, IT & Communications", "Department of Science and Technology"),
    "Travel & Tourism": ("Travel & Tourism", "Ministry of Tourism"),
    "Transport & Infrastructure": ("Transport & Infrastructure", "Ministry of Road Transport and Highways"),
    "Public Safety": ("Public Safety, Law & Justice", "Ministry of Home Affairs & Justice"),
    "Law & Justice": ("Public Safety, Law & Justice", "Ministry of Home Affairs & Justice"),
}


def _get_active_dataset_path() -> Path:
    """Find the active dataset file, preferring myscheme.csv or all_scheme_eligibility_table.csv."""
    base_ml = Path(__file__).resolve().parents[1] / "ml"
    csv1 = base_ml / "chatbot" / "myscheme.csv"
    csv2 = base_ml / "eligibility_engine" / "all_scheme_eligibility_table.csv"

    if csv1.exists():
        return csv1
    if csv2.exists():
        return csv2
    return csv1


def _parse_sector_and_dept(raw: Optional[str]) -> tuple[str, str, list[str]]:
    """Parse primary sector, department, and all associated sectors from raw category string."""
    if not isinstance(raw, str) or not raw.strip():
        return ("Social Welfare & Empowerment", "Department of Social Justice and Empowerment", ["Social Welfare & Empowerment"])

    raw_clean = raw.strip()
    all_matched_sectors = set()
    first_part = raw_clean.split(",")[0].strip()

    # Match primary
    if "Travel" in raw_clean or "Tourism" in raw_clean:
        primary_sec, primary_dept = SECTORS_MAP["Travel & Tourism"]
    elif "Public Safety" in raw_clean or "Law" in raw_clean or "Justice" in raw_clean:
        primary_sec, primary_dept = SECTORS_MAP["Public Safety"]
    elif first_part in SECTORS_MAP:
        primary_sec, primary_dept = SECTORS_MAP[first_part]
    else:
        primary_sec, primary_dept = ("Social Welfare & Empowerment", "Department of Social Justice and Empowerment")

    # Match all tags/subcategories for multi-category indexing
    for key, (sec_name, _) in SECTORS_MAP.items():
        if key.lower() in raw_clean.lower():
            all_matched_sectors.add(sec_name)

    if not all_matched_sectors:
        all_matched_sectors.add(primary_sec)

    return primary_sec, primary_dept, sorted(list(all_matched_sectors))


def load_graph_catalog() -> list[dict]:
    """Load live dataset from CSV using fast streaming parser, automatically refreshing if modified."""
    global _cached_schemes, _cached_mtime, _cached_dataset_name, _cached_categories, _cached_departments

    csv_path = _get_active_dataset_path()
    if not csv_path.exists():
        return _cached_schemes

    current_mtime = os.path.getmtime(csv_path)
    if _cached_schemes and current_mtime == _cached_mtime and _cached_dataset_name == csv_path.name:
        return _cached_schemes

    # Fast 0.09s parser with standard csv.DictReader
    schemes = []
    sectors_freq = {}
    departments_set = set()

    with open(csv_path, encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_cat = row.get("schemeCategory", "")
            primary_cat, dept, all_cats = _parse_sector_and_dept(raw_cat)
            departments_set.add(dept)

            for sc in all_cats:
                sectors_freq[sc] = sectors_freq.get(sc, 0) + 1

            slug = (row.get("slug") or "").strip()
            name = (row.get("scheme_name") or row.get("\ufeffscheme_name") or "").strip()

            schemes.append({
                "scheme_id": slug,
                "slug": slug,
                "scheme_name": name,
                "name": name,
                "description": (row.get("description") or "").strip(),
                "benefits": (row.get("benefits") or "").strip(),
                "eligibility": (row.get("eligibility") or "").strip(),
                "application_process": (row.get("application") or "").strip(),
                "documents": (row.get("documents") or "").strip(),
                "tags": (row.get("tags") or "").strip(),
                "official_url": (row.get("official_url") or "").strip(),
                "level": (row.get("level") or "Central").strip(),
                "category": primary_cat,
                "categories": all_cats,
                "department": dept,
            })

    _cached_schemes = schemes
    _cached_mtime = current_mtime
    _cached_dataset_name = csv_path.name
    _cached_categories = [cat for cat, _ in sorted(sectors_freq.items(), key=lambda x: x[1], reverse=True)]
    _cached_departments = sorted(list(departments_set))

    return _cached_schemes


def get_graph_stats() -> dict:
    """Return live dataset statistics tracked directly from active CSV."""
    schemes = load_graph_catalog()
    csv_path = _get_active_dataset_path()
    last_mod = ""
    if csv_path.exists():
        last_mod = datetime.fromtimestamp(os.path.getmtime(csv_path)).strftime("%Y-%m-%d %H:%M:%S")

    return {
        "connected": True,
        "mode": "live_dataset_graph",
        "dataset_file": _cached_dataset_name or csv_path.name,
        "total_schemes": len(schemes),
        "total_categories": len(_cached_categories) if _cached_categories else 14,
        "total_departments": len(_cached_departments) if _cached_departments else 14,
        "last_modified": last_mod,
    }


def get_all_categories() -> list[str]:
    """Return all sectors dynamically extracted from the dataset."""
    load_graph_catalog()
    return _cached_categories


async def find_schemes_by_category(category: str, limit: int = 20, offset: int = 0) -> list[dict]:
    """Find schemes by category/sector from the live dataset."""
    catalog = load_graph_catalog()
    cat_lower = category.strip().lower()

    if cat_lower and cat_lower != "all":
        matched = [
            s
            for s in catalog
            if s.get("category", "").lower() == cat_lower
            or any(c.lower() == cat_lower for c in s.get("categories", []))
        ]
    else:
        matched = catalog

    return matched[offset : offset + limit]


async def search_schemes_fulltext(query: str, category: str = "All", limit: int = 20, offset: int = 0) -> list[dict]:
    """Search live dataset across scheme properties."""
    catalog = load_graph_catalog()
    q_lower = query.lower().strip()
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

    return matched[offset : offset + limit]


async def find_related_schemes(scheme_id: str, limit: int = 5) -> list[dict]:
    """Find schemes related through shared sectors or administering departments."""
    catalog = load_graph_catalog()
    target = next((s for s in catalog if s.get("slug") == scheme_id or s.get("scheme_id") == scheme_id), None)
    if not target:
        return []

    target_cat = target.get("category")
    target_dept = target.get("department")

    related = [
        s
        for s in catalog
        if (s.get("slug") != scheme_id and s.get("scheme_id") != scheme_id)
        and (s.get("category") == target_cat or s.get("department") == target_dept)
    ]
    return related[:limit]


async def find_schemes_by_tags(tags: list[str], limit: int = 20) -> list[dict]:
    """Find schemes matching any tags in the live dataset."""
    catalog = load_graph_catalog()
    tags_lower = [t.lower() for t in tags]
    matched = [s for s in catalog if any(t in s.get("tags", "").lower() for t in tags_lower)]
    return matched[:limit]


async def upsert_schemes_from_catalogue(schemes: list[dict] = None) -> dict:
    """Sync live schemes into Neo4j graph when driver is connected."""
    driver = get_driver()
    if not driver:
        return {"status": "skipped", "reason": "neo4j_not_connected"}

    if not schemes:
        schemes = load_graph_catalog()

    summary = {"created": 0, "errors": 0}
    async with driver.session(database=settings.NEO4J_DATABASE) as session:
        batch_size = 100
        for i in range(0, len(schemes), batch_size):
            batch = schemes[i : i + batch_size]
            try:
                await session.run(
                    """
                    UNWIND $batch AS scheme
                    MERGE (s:Scheme {scheme_id: scheme.scheme_id})
                    SET s.name = scheme.name,
                        s.description = scheme.description,
                        s.category = scheme.category,
                        s.department = scheme.department,
                        s.tags = scheme.tags,
                        s.benefits = scheme.benefits,
                        s.eligibility = scheme.eligibility,
                        s.documents = scheme.documents,
                        s.application_process = scheme.application_process,
                        s.official_url = scheme.official_url,
                        s.status = 'active'
                    MERGE (c:Category {name: scheme.category})
                    MERGE (s)-[:TARGETS]->(c)
                    MERGE (d:Department {name: scheme.department})
                    MERGE (s)-[:MANAGED_BY]->(d)
                    """,
                    batch=batch,
                )
                summary["created"] += len(batch)
            except Exception:
                summary["errors"] += len(batch)
    return summary
