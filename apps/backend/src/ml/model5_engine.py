"""Compatibility entry points for the citizen profile and verified rule matcher.

Historical CSVs and trained artifacts remain preserved for audit, but are not
loaded or blended into eligibility decisions. Scores cannot establish eligibility.
"""
from typing import Any
from src.modules.eligibility.service import eligibility_service, _parse_income


def normalize_state(value: str | None) -> str | None:
    if not value:
        return None
    aliases = {"up": "Uttar Pradesh", "mp": "Madhya Pradesh", "tn": "Tamil Nadu", "wb": "West Bengal", "ap": "Andhra Pradesh"}
    return aliases.get(value.strip().casefold(), value.strip().title())


def normalize_income(value: Any) -> float | None:
    return _parse_income(value)


class BeneficiaryProfileBuilder:
    """Keep legacy attributes without turning occupation into a business claim."""
    def __init__(self):
        self.profile = {}

    def build_profile(self, raw_input: dict[str, Any]) -> dict[str, Any]:
        profile = dict(raw_input)
        state = raw_input.get("state") or raw_input.get("State")
        if state:
            profile["state"] = normalize_state(state)
        return eligibility_service.normalize_profile(profile)


DEFAULT_SCHEMES_CATALOG = list(eligibility_service.scheme_catalog.values())


def match_schemes_with_engine(profile: dict[str, Any], top_n: int = 25) -> list[dict]:
    """Use the same reviewed tri-state rules as the citizen API."""
    return eligibility_service.match_schemes(profile, top_n=top_n)
