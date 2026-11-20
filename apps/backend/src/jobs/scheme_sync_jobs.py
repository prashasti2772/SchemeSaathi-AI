"""Celery background tasks and periodic scheduling for automated scheme synchronization."""
import asyncio
from typing import Any, Dict, Optional

from src.config.database import AsyncSessionLocal
from src.config.logging import get_logger
from src.jobs.celery_app import celery_app
from src.modules.schemes.sync.engine import SchemeSyncEngine

logger = get_logger("scheme_sync_jobs")


@celery_app.task(name="schemes.sync_government_schemes", bind=True, max_retries=2, default_retry_delay=60)
def sync_government_schemes_task(
    self,
    source_url: Optional[str] = None,
    dry_run: bool = False,
    rebuild_embeddings: bool = True,
    check_website_health: bool = False,
) -> Dict[str, Any]:
    """Celery worker task that executes the automated scheme update pipeline."""
    logger.info("celery_scheme_sync_task_started", source_url=source_url, dry_run=dry_run)
    try:
        summary = asyncio.run(
            _run_sync_async(
                source_url=source_url,
                dry_run=dry_run,
                rebuild_embeddings=rebuild_embeddings,
                check_website_health=check_website_health,
            )
        )
        return {
            "status": summary.status,
            "sync_id": summary.sync_id,
            "total_scanned": summary.total_scanned,
            "added": summary.added_count,
            "updated": summary.updated_count,
            "expired": summary.expired_count,
            "closed": summary.closed_count,
            "duplicates": summary.duplicate_count,
            "duration_seconds": summary.duration_seconds,
        }
    except Exception as exc:
        logger.error("celery_scheme_sync_task_failed", error=str(exc))
        raise self.retry(exc=exc)


async def _run_sync_async(
    source_url: Optional[str] = None,
    dry_run: bool = False,
    rebuild_embeddings: bool = True,
    check_website_health: bool = False,
):
    async with AsyncSessionLocal() as db:
        engine = SchemeSyncEngine.get_instance()
        return await engine.execute_sync(
            source_feed=source_url,
            dry_run=dry_run,
            rebuild_embeddings=rebuild_embeddings,
            check_website_health=check_website_health,
            db=db,
        )
