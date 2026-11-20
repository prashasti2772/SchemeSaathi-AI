"""Scheme data validation and duplicate detection engine."""
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse

from src.config.logging import get_logger
from src.modules.schemes.sync.fetcher import is_official_gov_url

logger = get_logger("scheme_sync.validator")

# Acronym mapping for normalized matching
ACRONYM_MAP = {
    "pm": "pradhan mantri",
    "pm-kisan": "pradhan mantri kisan samman nidhi",
    "pmkisan": "pradhan mantri kisan samman nidhi",
    "pmegp": "prime minister employment generation programme",
    "pmmy": "pradhan mantri mudra yojana",
    "mudra": "pradhan mantri mudra yojana",
    "pmjay": "ayushman bharat pradhan mantri jan arogya yojana",
    "ab-pmjay": "ayushman bharat pradhan mantri jan arogya yojana",
    "esdp": "entrepreneurship and skill development programme",
    "nssh": "national sc st hub",
    "csss": "central sector scheme of scholarship",
    "pm-usp": "pradhan mantri ucchatar shiksha protsahan",
}


def normalize_title(title: str) -> str:
    """Normalizes a scheme title for semantic deduplication comparison."""
    if not title:
        return ""
    text = title.lower()
    # Replace separators with space
    text = re.sub(r"[\(\)\[\]\-_:;,\./\\]", " ", text)
    tokens = text.split()
    expanded = []
    for tok in tokens:
        expanded.append(ACRONYM_MAP.get(tok, tok))
    # Remove generic filler words
    stopwords = {"scheme", "yojana", "for", "the", "and", "under", "in", "of", "to"}
    cleaned = [w for w in (" ".join(expanded)).split() if w not in stopwords and len(w) > 1]
    return " ".join(sorted(cleaned))


def canonical_url(url_str: str) -> str:
    """Normalizes an official URL to avoid trivial duplicate variations."""
    if not url_str:
        return ""
    try:
        parsed = urlparse(url_str.strip().lower())
        host = parsed.hostname or ""
        path = parsed.path.rstrip("/")
        return f"https://{host}{path}"
    except Exception:
        return url_str.strip().lower()


def compute_token_jaccard(str1: str, str2: str) -> float:
    """Computes Jaccard similarity between two token sets."""
    tokens1 = set(str1.split())
    tokens2 = set(str2.split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = len(tokens1.intersection(tokens2))
    union = len(tokens1.union(tokens2))
    return intersection / union if union > 0 else 0.0


def slugify(text: str) -> str:
    """Converts a title to a clean slug."""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text).strip("-")
    return text[:80]


class SchemeValidator:
    """Validates scheme structure, official domains, and detects duplicates."""

    def validate_scheme(self, scheme: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validates required fields and official government provenance.
        Returns (is_valid, list_of_errors).
        """
        errors = []
        name = scheme.get("scheme_name") or scheme.get("name")
        if not name or not str(name).strip():
            errors.append("Missing required scheme name")

        official_url = scheme.get("official_url") or ""
        if not official_url:
            errors.append("Missing official_url")
        elif not is_official_gov_url(official_url):
            errors.append(f"official_url '{official_url}' is not a valid HTTPS government domain (*.gov.in, *.nic.in, scsthub.in)")

        app_url = scheme.get("application_url") or ""
        if app_url and not is_official_gov_url(app_url):
            errors.append(f"application_url '{app_url}' is not a valid HTTPS government domain")

        if not scheme.get("category"):
            errors.append("Missing scheme category")

        if not scheme.get("description"):
            errors.append("Missing scheme description")

        if not scheme.get("benefits"):
            errors.append("Missing scheme benefits")

        if not scheme.get("eligibility") and not scheme.get("criteria"):
            errors.append("Missing eligibility text or criteria rules")

        return (len(errors) == 0, errors)

    def find_duplicate(
        self, candidate: Dict[str, Any], existing_schemes: List[Dict[str, Any]]
    ) -> Optional[Tuple[Dict[str, Any], str]]:
        """
        Detects if a candidate scheme duplicates an existing one.
        Returns (matching_existing_scheme, match_reason) or None.
        """
        cand_slug = (candidate.get("slug") or slugify(candidate.get("scheme_name", ""))).lower()
        cand_url = canonical_url(candidate.get("official_url", ""))
        cand_norm_name = normalize_title(candidate.get("scheme_name") or candidate.get("name", ""))

        for existing in existing_schemes:
            ex_slug = (existing.get("slug") or existing.get("scheme_id") or "").lower()
            ex_url = canonical_url(existing.get("official_url", ""))
            ex_norm_name = normalize_title(existing.get("scheme_name") or existing.get("name", ""))

            # 1. Exact slug match
            if cand_slug and cand_slug == ex_slug:
                return existing, f"exact slug match '{cand_slug}'"

            # 2. Canonical official URL match
            if cand_url and ex_url and cand_url == ex_url:
                return existing, f"canonical official URL match '{cand_url}'"

            # 3. Normalized title match
            if cand_norm_name and ex_norm_name:
                if cand_norm_name == ex_norm_name:
                    return existing, f"normalized title match '{cand_norm_name}'"
                # Token Jaccard match
                jaccard = compute_token_jaccard(cand_norm_name, ex_norm_name)
                if jaccard >= 0.85:
                    return existing, f"high title similarity (Jaccard: {jaccard:.2f})"

        return None

    def merge_scheme_records(
        self, canonical: Dict[str, Any], incoming: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Merges newer or richer details from an incoming duplicate into the canonical scheme.
        """
        merged = dict(canonical)
        for key in ("benefits", "eligibility", "documents", "application_process", "tags", "department"):
            # Update if incoming has richer content
            incoming_val = incoming.get(key)
            if incoming_val and len(str(incoming_val)) > len(str(merged.get(key) or "")):
                merged[key] = incoming_val

        if incoming.get("criteria") and not merged.get("criteria"):
            merged["criteria"] = incoming["criteria"]

        if incoming.get("source_urls"):
            combined = set(merged.get("source_urls", [])) | set(incoming.get("source_urls", []))
            merged["source_urls"] = sorted(combined)

        return merged
