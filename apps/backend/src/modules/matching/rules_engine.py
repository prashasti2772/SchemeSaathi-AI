from typing import Any

OPERATORS = {
    "eq": lambda actual, expected: actual == expected,
    "neq": lambda actual, expected: actual != expected,
    "in": lambda actual, expected: actual in expected,
    "gte": lambda actual, expected: actual is not None and actual >= expected,
    "lte": lambda actual, expected: actual is not None and actual <= expected,
    "gt": lambda actual, expected: actual is not None and actual > expected,
    "lt": lambda actual, expected: actual is not None and actual < expected,
    "contains": lambda actual, expected: actual is not None and expected in actual,
    "between": lambda actual, expected: actual is not None and expected[0] <= actual <= expected[1],
}


def evaluate_condition(profile: dict[str, Any], condition: dict[str, Any]) -> bool:
    field, operator, expected = condition["field"], condition["operator"], condition["value"]
    actual = profile.get(field)
    comparator = OPERATORS.get(operator)
    if comparator is None:
        return False
    try:
        return bool(comparator(actual, expected))
    except (TypeError, ValueError):
        return False


def evaluate_eligibility(profile: dict[str, Any], criteria: list[dict[str, Any]]) -> tuple[float, list[dict], list[dict]]:
    if not criteria:
        return 0.0, [], []
    matched, unmatched = [], []
    for condition in criteria:
        if evaluate_condition(profile, condition):
            matched.append(condition)
        else:
            unmatched.append(condition)
    score = round(len(matched) / len(criteria), 4)
    return score, matched, unmatched


def build_beneficiary_profile(beneficiary) -> dict[str, Any]:
    base_profile = {
        "location": beneficiary.location,
        "occupation": beneficiary.occupation,
        "business_type": beneficiary.business_type,
        "income_band": beneficiary.income_band,
        "social_category": beneficiary.social_category,
    }
    base_profile.update(beneficiary.profile_attributes or {})
    return base_profile
