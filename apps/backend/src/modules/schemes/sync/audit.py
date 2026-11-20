"""Audit trail logger and historical reporter for scheme dataset updates."""
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.config.logging import get_logger
from src.modules.schemes.sync.schemas import SchemeChangeItem, SyncRunSummary

logger = get_logger("scheme_sync.audit")

DEFAULT_AUDIT_LOG_PATH = Path(__file__).resolve().parents[3] / "data" / "scheme_sync_audit.jsonl"


class SchemeSyncAuditor:
    """Logs every scheme change to a persistent JSONL audit log and provides reporting."""

    def __init__(self, log_path: Optional[Path] = None):
        self.log_path = Path(log_path) if log_path else DEFAULT_AUDIT_LOG_PATH
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def log_sync_summary(self, summary: SyncRunSummary) -> None:
        """Appends the overall sync summary and its individual changes to the audit file."""
        now_str = datetime.utcnow().isoformat()
        header_event = {
            "event_type": "SYNC_SUMMARY",
            "sync_id": summary.sync_id,
            "status": summary.status,
            "dry_run": summary.dry_run,
            "started_at": summary.started_at.isoformat(),
            "completed_at": summary.completed_at.isoformat() if summary.completed_at else now_str,
            "duration_seconds": summary.duration_seconds,
            "metrics": {
                "total_scanned": summary.total_scanned,
                "added": summary.added_count,
                "updated": summary.updated_count,
                "expired": summary.expired_count,
                "closed": summary.closed_count,
                "duplicates": summary.duplicate_count,
                "unavailable_sources": summary.unavailable_count,
            },
            "errors": summary.errors,
            "timestamp": now_str,
        }

        try:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(header_event) + "\n")
                for change in summary.changes:
                    change_event = {
                        "event_type": "SCHEME_CHANGE",
                        "sync_id": summary.sync_id,
                        "slug": change.slug,
                        "scheme_name": change.scheme_name,
                        "change_type": change.change_type.value,
                        "reasons": change.reasons,
                        "field_diffs": change.field_diffs,
                        "timestamp": change.timestamp.isoformat(),
                    }
                    f.write(json.dumps(change_event) + "\n")
            logger.info("audit_log_written", sync_id=summary.sync_id, changes_count=len(summary.changes))
        except Exception as e:
            logger.error("audit_log_write_failed", error=str(e))

    def get_recent_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Reads recent audit log events from the audit file in reverse chronological order."""
        if not self.log_path.exists():
            return []

        events = []
        try:
            with open(self.log_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            for line in reversed(lines):
                line = line.strip()
                if not line:
                    continue
                try:
                    events.append(json.loads(line))
                    if len(events) >= limit:
                        break
                except json.JSONDecodeError:
                    continue
        except Exception as e:
            logger.warning("audit_log_read_failed", error=str(e))

        return events

    def generate_markdown_report(self, summary: SyncRunSummary) -> str:
        """Generates a clear markdown report of the sync run for administrator review."""
        lines = [
            f"# SchemeSaathi Dataset Update Report",
            f"**Sync ID:** `{summary.sync_id}`  ",
            f"**Mode:** `{'DRY RUN (Preview)' if summary.dry_run else 'LIVE UPDATE'}`  ",
            f"**Status:** {summary.status.upper()}  ",
            f"**Started At:** {summary.started_at.strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
            f"**Duration:** {summary.duration_seconds:.2f} seconds  ",
            "",
            "## Summary Metrics",
            f"- **Total Schemes Scanned:** {summary.total_scanned}",
            f"- **Newly Added:** {summary.added_count}",
            f"- **Updated / Modified:** {summary.updated_count}",
            f"- **Expired (Lapsed Deadlines):** {summary.expired_count}",
            f"- **Closed / Discontinued:** {summary.closed_count}",
            f"- **Duplicates Detected & Merged:** {summary.duplicate_count}",
            f"- **Temporarily Unavailable Portals:** {summary.unavailable_count}",
            "",
        ]

        if summary.changes:
            lines.append("## Change Details")
            lines.append("| Type | Scheme Slug | Name | Reasons |")
            lines.append("| :--- | :--- | :--- | :--- |")
            for c in summary.changes:
                reasons_str = "; ".join(c.reasons)
                lines.append(f"| `{c.change_type.value}` | `{c.slug}` | {c.scheme_name} | {reasons_str} |")
            lines.append("")

        if summary.errors:
            lines.append("## Errors Encountered")
            for err in summary.errors:
                lines.append(f"- ⚠️ {err}")
            lines.append("")

        return "\n".join(lines)
