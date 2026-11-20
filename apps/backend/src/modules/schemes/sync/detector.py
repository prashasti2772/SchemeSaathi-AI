"""Lifecycle and change detection engine for government schemes."""
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from src.config.logging import get_logger
from src.modules.schemes.sync.schemas import ChangeType, SchemeChangeItem

logger = get_logger("scheme_sync.detector")

CLOSED_KEYWORDS = [
    "discontinued", "closed for application", "wound up", "subsumed under",
    "withdrawn by", "no longer active", "scheme terminated", "applications closed"
]


def parse_date_lenient(date_str: Any) -> Optional[date]:
    """Attempts to parse varied date formats into a date object."""
    if not date_str or not isinstance(date_str, str):
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            pass
    # Regex parse for e.g. "31st March 2024" or "2024-12-31"
    match = re.search(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})", date_str)
    if match:
        try:
            return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        except ValueError:
            pass
    return None


class SchemeChangeDetector:
    """Detects new, modified, expired, and closed schemes, and generates field diffs."""

    def __init__(self, reference_date: Optional[date] = None):
        self.reference_date = reference_date or date.today()

    def is_discontinued_or_closed(self, scheme: Dict[str, Any]) -> Tuple[bool, str]:
        """Checks if a scheme is declared discontinued or closed."""
        status = str(scheme.get("status") or "").lower()
        if status in ("closed", "discontinued", "wound_up", "withdrawn", "terminated"):
            return True, f"Official status marked as '{status}'"

        # Check in text content
        combined_text = " ".join([
            str(scheme.get("description") or ""),
            str(scheme.get("benefits") or ""),
            str(scheme.get("application_process") or "")
        ]).lower()

        for kw in CLOSED_KEYWORDS:
            if kw in combined_text:
                return True, f"Discontinuation notice detected: '{kw}'"

        return False, ""

    def is_expired(self, scheme: Dict[str, Any]) -> Tuple[bool, str]:
        """Checks if a scheme's validity period or application deadline has lapsed."""
        status = str(scheme.get("status") or "").lower()
        if status == "expired":
            return True, "Status explicitly marked as expired"

        # Check deadline fields
        for field in ("end_date", "valid_until", "application_deadline", "deadline"):
            val = scheme.get(field)
            if val:
                parsed = parse_date_lenient(str(val))
                if parsed and parsed < self.reference_date:
                    return True, f"Deadline {parsed.isoformat()} lapsed before {self.reference_date.isoformat()}"

        return False, ""

    def compute_field_diff(
        self, old_scheme: Dict[str, Any], new_scheme: Dict[str, Any]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Computes granular field-level changes between existing and new scheme definitions.
        """
        diffs = {}
        tracked_fields = [
            "scheme_name", "department", "category", "description",
            "benefits", "eligibility", "documents", "application_process",
            "official_url", "application_url", "criteria"
        ]

        for field in tracked_fields:
            old_val = old_scheme.get(field)
            new_val = new_scheme.get(field)

            # Clean / normalize for comparison
            old_str = str(old_val).strip() if old_val is not None else ""
            new_str = str(new_val).strip() if new_val is not None else ""

            if field == "criteria":
                # JSON/dict comparison
                if old_val != new_val and (old_val or new_val):
                    diffs[field] = {"old": old_val, "new": new_val}
            elif old_str != new_str:
                diffs[field] = {"old": old_val, "new": new_val}

        return diffs

    def evaluate_scheme_change(
        self,
        incoming: Dict[str, Any],
        existing: Optional[Dict[str, Any]] = None
    ) -> SchemeChangeItem:
        """
        Evaluates an incoming scheme against existing records and determines lifecycle action.
        """
        slug = incoming.get("slug") or incoming.get("scheme_id") or ""
        name = incoming.get("scheme_name") or incoming.get("name") or slug

        # 1. Closed / Discontinued check
        is_closed, close_reason = self.is_discontinued_or_closed(incoming)
        if is_closed:
            return SchemeChangeItem(
                slug=slug,
                scheme_name=name,
                change_type=ChangeType.CLOSED,
                reasons=[close_reason],
                details={"status": "closed"},
            )

        # 2. Expired check
        is_exp, exp_reason = self.is_expired(incoming)
        if is_exp:
            return SchemeChangeItem(
                slug=slug,
                scheme_name=name,
                change_type=ChangeType.EXPIRED,
                reasons=[exp_reason],
                details={"status": "expired"},
            )

        # 3. Newly added check
        if existing is None:
            return SchemeChangeItem(
                slug=slug,
                scheme_name=name,
                change_type=ChangeType.ADDED,
                reasons=["Newly added government scheme"],
                details=incoming,
            )

        # 4. Check for modifications
        field_diffs = self.compute_field_diff(existing, incoming)
        if field_diffs:
            reasons = [f"Field '{f}' updated" for f in field_diffs.keys()]
            return SchemeChangeItem(
                slug=slug,
                scheme_name=name,
                change_type=ChangeType.UPDATED,
                field_diffs=field_diffs,
                reasons=reasons,
                details=incoming,
            )

        # 5. No change
        return SchemeChangeItem(
            slug=slug,
            scheme_name=name,
            change_type=ChangeType.NO_CHANGE,
            reasons=["Scheme content matches existing verified record"],
        )
