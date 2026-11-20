"""Main orchestration engine for automated government scheme dataset updates."""
import asyncio
import copy
import json
import time
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.config.logging import get_logger
from src.modules.schemes.sync.audit import SchemeSyncAuditor
from src.modules.schemes.sync.detector import SchemeChangeDetector
from src.modules.schemes.sync.fetcher import OfficialSchemeFetcher, OfficialWebsiteHealthChecker
from src.modules.schemes.sync.indexer import SearchIndexSynchronizer
from src.modules.schemes.sync.schemas import (
    ChangeType,
    SchemeChangeItem,
    SyncRunSummary,
    WebsiteStatus,
)
from src.modules.schemes.sync.synchronizer import DatasetSynchronizer
from src.modules.schemes.sync.validator import SchemeValidator

logger = get_logger("scheme_sync.engine")

BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data"
ML_DIR = BASE_DIR / "ml"

DEFAULT_CATALOGUE_PATH = DATA_DIR / "verified_schemes.json"
DEFAULT_MYSCHEME_CSV_PATH = ML_DIR / "chatbot" / "myscheme.csv"
DEFAULT_ELIGIBILITY_CSV_PATH = ML_DIR / "eligibility_engine" / "all_schemes_eligibility_table.csv"


class SchemeSyncEngine:
    """
    Coordinates the full automated synchronization workflow:
    Official sources → fetch → validate → detect new/changed/expired schemes
    → update DB/CSV → preserve audit fields → rebuild embeddings/index → log changes.
    """

    _instance: Optional["SchemeSyncEngine"] = None

    def __init__(
        self,
        catalogue_path: Optional[Path] = None,
        myscheme_csv_path: Optional[Path] = None,
        eligibility_csv_path: Optional[Path] = None,
        audit_log_path: Optional[Path] = None,
    ):
        self.catalogue_path = Path(catalogue_path) if catalogue_path else DEFAULT_CATALOGUE_PATH
        self.myscheme_csv_path = Path(myscheme_csv_path) if myscheme_csv_path else DEFAULT_MYSCHEME_CSV_PATH
        self.eligibility_csv_path = Path(eligibility_csv_path) if eligibility_csv_path else DEFAULT_ELIGIBILITY_CSV_PATH

        self.fetcher = OfficialSchemeFetcher()
        self.validator = SchemeValidator()
        self.detector = SchemeChangeDetector()
        self.synchronizer = DatasetSynchronizer()
        self.indexer = SearchIndexSynchronizer()
        self.auditor = SchemeSyncAuditor(audit_log_path)

        self._is_running = False
        self._last_summary: Optional[SyncRunSummary] = None

    @classmethod
    def get_instance(cls) -> "SchemeSyncEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def is_running(self) -> bool:
        return self._is_running

    @property
    def last_summary(self) -> Optional[SyncRunSummary]:
        return self._last_summary

    def load_existing_catalogue(self) -> List[Dict[str, Any]]:
        """Loads existing scheme records from verified_schemes.json."""
        if not self.catalogue_path.exists():
            return []
        try:
            doc = json.loads(self.catalogue_path.read_text(encoding="utf-8"))
            return copy.deepcopy(doc.get("schemes", []))
        except Exception as e:
            logger.error("failed_to_load_existing_catalogue", error=str(e))
            return []

    async def execute_sync(
        self,
        source_feed: Optional[Any] = None,
        dry_run: bool = False,
        rebuild_embeddings: bool = True,
        check_website_health: bool = False,
        db: Optional[AsyncSession] = None,
        today_date: Optional[str] = None,
        target_slugs: Optional[List[str]] = None,
    ) -> SyncRunSummary:
        """
        Executes an end-to-end scheme update and synchronization pass.
        """
        if self._is_running:
            raise RuntimeError("A scheme update synchronization run is already in progress")

        self._is_running = True
        start_time = time.time()
        summary = SyncRunSummary(dry_run=dry_run)

        try:
            logger.info("scheme_sync_started", sync_id=summary.sync_id, dry_run=dry_run)

            # 1. Load existing verified scheme records
            existing_schemes = self.load_existing_catalogue()
            existing_by_slug = {
                (s.get("slug") or s.get("scheme_id")): s for s in existing_schemes if s.get("slug") or s.get("scheme_id")
            }

            # 2. Fetch incoming scheme records
            raw_incoming: List[Dict[str, Any]] = []
            if source_feed is None:
                # If no custom source given, use current catalogue as baseline for expiration/health auditing
                raw_incoming = copy.deepcopy(existing_schemes)
            elif isinstance(source_feed, list):
                raw_incoming = copy.deepcopy(source_feed)
            elif isinstance(source_feed, (str, Path)):
                raw_incoming = await self.fetcher.fetch_source_feed(str(source_feed))

            summary.total_scanned = len(raw_incoming)
            logger.info("schemes_fetched_for_sync", count=len(raw_incoming))

            # 3. Deduplication and Validation of incoming records
            validated_incoming: List[Dict[str, Any]] = []
            seen_incoming_slugs: Dict[str, Dict[str, Any]] = {}

            for raw in raw_incoming:
                # Check validation rules
                is_valid, validation_errors = self.validator.validate_scheme(raw)
                if not is_valid:
                    summary.errors.append(f"Scheme '{raw.get('scheme_name')}' rejected: {'; '.join(validation_errors)}")
                    continue

                # Check duplicate against already accepted incoming schemes
                duplicate_match = self.validator.find_duplicate(raw, list(seen_incoming_slugs.values()))
                if duplicate_match:
                    canon, reason = duplicate_match
                    canon_slug = canon.get("slug") or canon.get("scheme_id")
                    merged = self.validator.merge_scheme_records(canon, raw)
                    seen_incoming_slugs[canon_slug] = merged
                    summary.duplicate_count += 1
                    summary.changes.append(SchemeChangeItem(
                        slug=raw.get("slug") or canon_slug,
                        scheme_name=raw.get("scheme_name", ""),
                        change_type=ChangeType.DUPLICATE_MERGED,
                        reasons=[f"Merged into canonical scheme '{canon_slug}' ({reason})"],
                        details={"canonical_slug": canon_slug},
                    ))
                    continue

                slug = raw.get("slug") or raw.get("scheme_id")
                seen_incoming_slugs[slug] = raw

            validated_incoming = list(seen_incoming_slugs.values())

            # 4. Check for duplicates against existing stored catalogue
            processed_schemes_map = dict(existing_by_slug)
            change_items: List[SchemeChangeItem] = []

            for inc in validated_incoming:
                slug = inc.get("slug") or inc.get("scheme_id")
                if target_slugs and slug not in target_slugs:
                    continue

                existing = processed_schemes_map.get(slug)

                # If slug not found, check if it duplicates an existing scheme under another slug/URL
                if existing is None:
                    dup_check = self.validator.find_duplicate(inc, list(processed_schemes_map.values()))
                    if dup_check:
                        canon, reason = dup_check
                        canon_slug = canon.get("slug") or canon.get("scheme_id")
                        existing = canon
                        slug = canon_slug
                        summary.duplicate_count += 1
                        change_items.append(SchemeChangeItem(
                            slug=inc.get("slug") or canon_slug,
                            scheme_name=inc.get("scheme_name", ""),
                            change_type=ChangeType.DUPLICATE_MERGED,
                            reasons=[f"Merged with existing '{canon_slug}' ({reason})"],
                            details={"canonical_slug": canon_slug},
                        ))

                # 5. Detect Lifecycle Changes & Field Diffs
                change_item = self.detector.evaluate_scheme_change(inc, existing)

                # 6. Optional Website Health Check
                if check_website_health:
                    off_rep, _ = await self.fetcher.verify_scheme_health(inc)
                    if off_rep and off_rep.status == WebsiteStatus.TEMPORARILY_UNAVAILABLE:
                        summary.unavailable_count += 1
                        change_item = SchemeChangeItem(
                            slug=slug,
                            scheme_name=inc.get("scheme_name", ""),
                            change_type=ChangeType.WEBSITE_UNAVAILABLE,
                            reasons=[f"Official portal temporarily unavailable: {off_rep.error_message}"],
                            details={"status_code": off_rep.status_code, "url": off_rep.url},
                        )

                if change_item.change_type != ChangeType.NO_CHANGE:
                    change_items.append(change_item)

                # Update running state
                if change_item.change_type == ChangeType.ADDED:
                    summary.added_count += 1
                    processed_schemes_map[slug] = inc
                elif change_item.change_type == ChangeType.UPDATED:
                    summary.updated_count += 1
                    merged = self.validator.merge_scheme_records(existing or {}, inc)
                    processed_schemes_map[slug] = merged
                elif change_item.change_type == ChangeType.EXPIRED:
                    summary.expired_count += 1
                    inc["status"] = "expired"
                    inc["is_active"] = False
                    processed_schemes_map[slug] = inc
                elif change_item.change_type == ChangeType.CLOSED:
                    summary.closed_count += 1
                    inc["status"] = "closed"
                    inc["is_active"] = False
                    processed_schemes_map[slug] = inc
                elif change_item.change_type == ChangeType.WEBSITE_UNAVAILABLE:
                    inc["website_health"] = "temporarily_unavailable"
                    processed_schemes_map[slug] = inc
                else:
                    if existing is None:
                        processed_schemes_map[slug] = inc

            summary.changes.extend(change_items)
            all_final_schemes = list(processed_schemes_map.values())

            # 7. Safe Multi-Store Atomic Persistence (if not dry run)
            if not dry_run and change_items:
                # Update verified_schemes.json
                self.synchronizer.sync_json_catalogue(
                    self.catalogue_path, change_items, all_final_schemes, today_date=today_date
                )

                # Update myscheme.csv
                self.synchronizer.sync_myscheme_csv(self.myscheme_csv_path, all_final_schemes)

                # Update all_schemes_eligibility_table.csv
                self.synchronizer.sync_eligibility_table_csv(self.eligibility_csv_path, all_final_schemes)

                # Update database if session provided
                if db is not None:
                    await self.synchronizer.sync_database(db, change_items, processed_schemes_map)

                # 8. Rebuild Embeddings, FAISS Index & Sync In-Memory Services
                self.indexer.rebuild_faiss_and_documents(
                    all_final_schemes, use_sentence_transformers=rebuild_embeddings
                )
                self.indexer.sync_in_memory_services()

            # 9. Audit Logging
            summary.duration_seconds = round(time.time() - start_time, 2)
            summary.completed_at = datetime.utcnow()
            self.auditor.log_sync_summary(summary)

            logger.info(
                "scheme_sync_completed",
                sync_id=summary.sync_id,
                added=summary.added_count,
                updated=summary.updated_count,
                expired=summary.expired_count,
                closed=summary.closed_count,
                duplicates=summary.duplicate_count,
                unavailable=summary.unavailable_count,
                duration=summary.duration_seconds,
            )

            self._last_summary = summary
            return summary

        except Exception as e:
            summary.status = "failed"
            summary.errors.append(str(e))
            summary.duration_seconds = round(time.time() - start_time, 2)
            summary.completed_at = datetime.utcnow()
            logger.error("scheme_sync_failed", error=str(e))
            self._last_summary = summary
            raise e

        finally:
            self._is_running = False
