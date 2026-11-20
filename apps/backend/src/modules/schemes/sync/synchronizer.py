"""Multi-store safe atomic synchronization for SchemeSaathi datasets and database."""
import copy
import csv
import json
import os
import re
import tempfile
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.logging import get_logger
from src.modules.schemes.models import Scheme, SchemeVersion
from src.modules.schemes.sync.schemas import ChangeType, SchemeChangeItem

logger = get_logger("scheme_sync.synchronizer")


def atomic_write_file(target_path: Path, content: str, encoding: str = "utf-8"):
    """Atomically writes content to target_path using a temporary file rename."""
    target_path = Path(target_path)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    temp_fd, temp_file = tempfile.mkstemp(dir=target_path.parent, prefix="sync_atomic_", text=True)
    try:
        with os.fdopen(temp_fd, "w", encoding=encoding) as f:
            f.write(content)
        # On Windows, replace will atomically overwrite the destination
        os.replace(temp_file, target_path)
    except Exception as e:
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except OSError:
                pass
        raise e


def parse_criteria_to_engine_row(scheme: Dict[str, Any]) -> Dict[str, str]:
    """
    Parses a scheme's criteria and eligibility text into the 8 columns expected
    by all_schemes_eligibility_table.csv.
    """
    name = scheme.get("scheme_name") or scheme.get("name") or ""
    criteria = scheme.get("criteria") or []
    elig_text = str(scheme.get("eligibility") or "").lower()

    # Defaults
    categories = "ANY"
    genders = "ANY"
    max_income = "No cap / not found"
    age_range = "Not found"
    disability = "No"
    rural = "No"
    business = "ANY"

    for crit in criteria:
        f = crit.get("field", "")
        op = crit.get("operator", "")
        val = crit.get("value")

        if f == "age":
            if op == "gte":
                age_range = f">={val}"
            elif op == "lte":
                age_range = f"<={val}"
            elif op == "between" and isinstance(val, list):
                age_range = f"{val[0]}-{val[1]}"
        elif f == "annual_income":
            if op == "lte":
                max_income = str(val)
        elif f == "gender":
            genders = str(val).capitalize()
        elif f == "social_category":
            categories = str(val).upper()
        elif f == "disability":
            disability = "Yes" if val else "No"
        elif f == "rural":
            rural = "Yes" if val else "No"
        elif f == "business_type":
            business = str(val)

    # Text fallbacks if criteria didn't specify
    if age_range == "Not found":
        age_match = re.search(r"\b(\d{1,2})\s*(?:to|-)\s*(\d{1,2})\s*years?", elig_text)
        if age_match:
            age_range = f"{age_match.group(1)}-{age_match.group(2)}"
        elif "70 years" in elig_text or "age 70" in elig_text:
            age_range = ">=70"

    if max_income == "No cap / not found":
        if "4.5 lakh" in elig_text:
            max_income = "450000"
        elif "3 lakh" in elig_text:
            max_income = "300000"
        elif "2.5 lakh" in elig_text:
            max_income = "250000"

    if "female" in elig_text and "male" not in elig_text:
        genders = "Female"
    elif "women" in elig_text:
        genders = "Female"

    if "disabilit" in elig_text or "divyang" in elig_text:
        disability = "Yes"

    if "rural" in elig_text:
        rural = "Yes"

    category_str = str(scheme.get("category") or "").lower()
    if "artisan" in category_str or "artisan" in elig_text:
        business = "Artisan"
    elif "entrepreneur" in category_str or "msme" in elig_text:
        business = "MSME"

    return {
        "Scheme Name": name,
        "Eligible Categories": categories,
        "Eligible Genders": genders,
        "Max Income": max_income,
        "Age Range": age_range,
        "Disability Required": disability,
        "Rural Only": rural,
        "Business Types": business,
    }


class DatasetSynchronizer:
    """Synchronizes verified_schemes.json, myscheme.csv, eligibility table CSV, and DB."""

    def sync_json_catalogue(
        self,
        catalogue_path: Path,
        change_items: List[SchemeChangeItem],
        all_schemes: List[Dict[str, Any]],
        today_date: Optional[str] = None
    ) -> None:
        """Atomically updates verified_schemes.json while preserving audit provenance."""
        today = today_date or date.today().isoformat()
        catalogue_path = Path(catalogue_path)
        existing_doc = {}
        if catalogue_path.exists():
            try:
                existing_doc = json.loads(catalogue_path.read_text(encoding="utf-8"))
            except Exception:
                existing_doc = {}

        version = today
        verification_scope = existing_doc.get(
            "verification_scope",
            "Official guidance reviewed on the verification date. Scheme availability, funding and application windows must be checked with the administering department."
        )

        # Index changes by slug
        changes_by_slug = {c.slug: c for c in change_items}

        updated_schemes_list = []
        seen_slugs = set()

        for s in all_schemes:
            slug = s.get("slug") or s.get("scheme_id")
            if not slug or slug in seen_slugs:
                continue
            seen_slugs.add(slug)

            item = copy.deepcopy(s)
            item["slug"] = slug
            if not item.get("scheme_name"):
                item["scheme_name"] = item.get("name", slug)

            # Check if this scheme had a detected change
            change = changes_by_slug.get(slug)
            if change:
                if change.change_type == ChangeType.UPDATED:
                    item["verified_on"] = today
                    item["status"] = "active"
                elif change.change_type == ChangeType.EXPIRED:
                    item["status"] = "expired"
                    item["is_active"] = False
                elif change.change_type == ChangeType.CLOSED:
                    item["status"] = "closed"
                    item["is_active"] = False
                elif change.change_type == ChangeType.WEBSITE_UNAVAILABLE:
                    item["website_health"] = "temporarily_unavailable"
                    item["last_checked_at"] = today
                elif change.change_type == ChangeType.WEBSITE_RESTORED:
                    item["website_health"] = "healthy"
                    item["last_checked_at"] = today
                elif change.change_type == ChangeType.ADDED:
                    item["verified_on"] = today
                    item["status"] = "active"

            if not item.get("verified_on"):
                item["verified_on"] = today

            # Guarantee criteria list exists
            if "criteria" not in item:
                item["criteria"] = []

            # Guarantee source_urls list exists
            if "source_urls" not in item:
                item["source_urls"] = [item.get("official_url")] if item.get("official_url") else []

            updated_schemes_list.append(item)

        payload = {
            "version": version,
            "verification_scope": verification_scope,
            "schemes": updated_schemes_list,
        }

        atomic_write_file(catalogue_path, json.dumps(payload, ensure_ascii=False, indent=2))
        logger.info("verified_schemes_json_updated", total=len(updated_schemes_list))

    def sync_myscheme_csv(self, csv_path: Path, schemes: List[Dict[str, Any]]) -> None:
        """Atomically updates myscheme.csv."""
        csv_path = Path(csv_path)
        fieldnames = [
            "scheme_name", "slug", "description", "benefits", "eligibility",
            "application_process", "documents", "level", "schemeCategory", "tags", "official_url"
        ]

        import io
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()

        for s in schemes:
            slug = s.get("slug") or s.get("scheme_id") or ""
            row = {
                "scheme_name": s.get("scheme_name") or s.get("name") or "",
                "slug": slug,
                "description": s.get("description") or "",
                "benefits": s.get("benefits") or "",
                "eligibility": s.get("eligibility") or "",
                "application_process": s.get("application_process") or "",
                "documents": s.get("documents") or "",
                "level": s.get("level") or "Central",
                "schemeCategory": s.get("category") or s.get("schemeCategory") or "",
                "tags": s.get("tags") or "",
                "official_url": s.get("official_url") or "",
            }
            writer.writerow(row)

        atomic_write_file(csv_path, output.getvalue())
        logger.info("myscheme_csv_updated", total=len(schemes))

    def sync_eligibility_table_csv(self, csv_path: Path, schemes: List[Dict[str, Any]]) -> None:
        """Atomically updates all_schemes_eligibility_table.csv."""
        csv_path = Path(csv_path)
        fieldnames = [
            "Scheme Name", "Eligible Categories", "Eligible Genders",
            "Max Income", "Age Range", "Disability Required", "Rural Only", "Business Types"
        ]

        import io
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()

        for s in schemes:
            row = parse_criteria_to_engine_row(s)
            writer.writerow(row)

        atomic_write_file(csv_path, output.getvalue())
        logger.info("all_schemes_eligibility_table_csv_updated", total=len(schemes))

    async def sync_database(
        self,
        db: AsyncSession,
        changes: List[SchemeChangeItem],
        schemes_by_slug: Dict[str, Dict[str, Any]]
    ) -> None:
        """
        Updates relational database (Scheme and SchemeVersion tables) with versioning and audit preservation.
        """
        now = datetime.utcnow()

        for change in changes:
            scheme_dict = schemes_by_slug.get(change.slug)
            if not scheme_dict:
                continue

            name = scheme_dict.get("scheme_name") or scheme_dict.get("name") or change.slug
            dept = scheme_dict.get("department") or "Government of India"
            desc = scheme_dict.get("description") or ""
            url = scheme_dict.get("official_url") or ""

            # Check if scheme exists in DB
            result = await db.execute(select(Scheme).where(Scheme.name == name))
            db_scheme = result.scalar_one_or_none()

            if change.change_type == ChangeType.ADDED:
                if not db_scheme:
                    db_scheme = Scheme(
                        name=name,
                        department=dept,
                        description=desc,
                        official_source_url=url,
                        is_active=True,
                    )
                    db.add(db_scheme)
                    await db.flush()

                # Add initial version 1
                v1 = SchemeVersion(
                    scheme_id=db_scheme.id,
                    version_number=1,
                    eligibility_criteria=scheme_dict.get("criteria", []),
                    benefits=scheme_dict.get("benefits", ""),
                    required_documents=[scheme_dict.get("documents", "")] if scheme_dict.get("documents") else [],
                    exclusions=[],
                    application_route=scheme_dict.get("application_process", ""),
                    verified_by="auto_scheme_sync_engine",
                    verified_at=now,
                    is_current=True,
                )
                db.add(v1)

            elif change.change_type == ChangeType.UPDATED and db_scheme:
                # Bumping version
                db_scheme.department = dept
                db_scheme.description = desc
                db_scheme.official_source_url = url
                db_scheme.is_active = True

                # Query existing versions to find next version number
                vers_res = await db.execute(select(SchemeVersion).where(SchemeVersion.scheme_id == db_scheme.id))
                existing_vers = vers_res.scalars().all()
                next_num = len(existing_vers) + 1

                # Set older versions to is_current=False
                await db.execute(
                    update(SchemeVersion).where(
                        SchemeVersion.scheme_id == db_scheme.id,
                        SchemeVersion.is_current.is_(True)
                    ).values(is_current=False)
                )

                new_ver = SchemeVersion(
                    scheme_id=db_scheme.id,
                    version_number=next_num,
                    eligibility_criteria=scheme_dict.get("criteria", []),
                    benefits=scheme_dict.get("benefits", ""),
                    required_documents=[scheme_dict.get("documents", "")] if scheme_dict.get("documents") else [],
                    exclusions=[],
                    application_route=scheme_dict.get("application_process", ""),
                    verified_by="auto_scheme_sync_engine",
                    verified_at=now,
                    is_current=True,
                )
                db.add(new_ver)

            elif change.change_type in (ChangeType.EXPIRED, ChangeType.CLOSED) and db_scheme:
                db_scheme.is_active = False

        await db.commit()
        logger.info("database_sync_completed", changes_count=len(changes))
