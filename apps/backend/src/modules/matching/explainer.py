def build_explanation(scheme_name: str, matched_conditions: list[dict], unmatched_conditions: list[dict]) -> str:
    if not matched_conditions and not unmatched_conditions:
        return f"{scheme_name} has no configured eligibility rules yet."
    matched_summary = ", ".join(_describe_condition(c) for c in matched_conditions) or "no conditions"
    explanation = f"You may be eligible for {scheme_name} because: {matched_summary}."
    if unmatched_conditions:
        gap_summary = ", ".join(_describe_condition(c) for c in unmatched_conditions)
        explanation += f" The following criteria could not be confirmed yet: {gap_summary}."
    return explanation


def _describe_condition(condition: dict) -> str:
    field = condition["field"].replace("_", " ")
    operator = condition["operator"]
    value = condition["value"]
    if operator == "eq":
        return f"{field} is {value}"
    elif operator == "neq":
        return f"{field} is not {value}"
    elif operator == "in":
        val_str = ", ".join(str(v) for v in value) if isinstance(value, (list, tuple)) else str(value)
        return f"{field} is one of ({val_str})"
    elif operator == "gte":
        return f"{field} is at least {value}"
    elif operator == "lte":
        return f"{field} is at most {value}"
    elif operator == "gt":
        return f"{field} is greater than {value}"
    elif operator == "lt":
        return f"{field} is less than {value}"
    elif operator == "contains":
        return f"{field} includes {value}"
    elif operator == "between" and isinstance(value, (list, tuple)) and len(value) >= 2:
        return f"{field} is between {value[0]} and {value[1]}"
    return f"{field} {operator} {value}"
