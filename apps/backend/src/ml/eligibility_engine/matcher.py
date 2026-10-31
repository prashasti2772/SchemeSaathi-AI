"""
==========================================================
matcher.py

Performs all eligibility matching for a user profile
against a scheme.

==========================================================
"""

try:
    from src.ml.eligibility_engine.parser import (
        parse_age,
        parse_income,
        parse_categories,
        parse_gender,
        parse_business,
        parse_state,
        parse_bool
    )
    from src.ml.eligibility_engine.utils import normalize
except ImportError:
    try:
        from .parser import (
            parse_age,
            parse_income,
            parse_categories,
            parse_gender,
            parse_business,
            parse_state,
            parse_bool
        )
        from .utils import normalize
    except ImportError:
        from parser import (
            parse_age,
            parse_income,
            parse_categories,
            parse_gender,
            parse_business,
            parse_state,
            parse_bool
        )
        from utils import normalize


class EligibilityMatcher:

    def __init__(self):
        pass

    # -------------------------------------------------------
    # AGE
    # -------------------------------------------------------

    def match_age(self, age, rule):

        if age is None:
            return None

        minimum, maximum = parse_age(rule)

        if minimum <= age <= maximum:
            return True

        return False

    # -------------------------------------------------------
    # INCOME
    # -------------------------------------------------------

    def match_income(self, income, rule):

        minimum, maximum = parse_income(rule)

        if income is None:
            # The parser uses this range when no income restriction is recorded.
            return True if (minimum, maximum) == (0, 999999999) else None

        if minimum <= income <= maximum:
            return True

        return False

    # -------------------------------------------------------
    # GENDER
    # -------------------------------------------------------

    def match_gender(self, gender, rule):

        genders = parse_gender(rule)

        if "any" in genders:
            return True

        if gender is None or str(gender).strip().lower() in {"", "any", "unknown", "prefer not to say"}:
            return None

        return normalize(gender) in genders

    # -------------------------------------------------------
    # CATEGORY
    # -------------------------------------------------------

    def match_category(self, category, rule):

        categories = parse_categories(rule)

        if "any" in categories:
            return True

        if category is None or str(category).strip().lower() in {"", "any", "unknown"}:
            return None

        return normalize(category) in categories

    # -------------------------------------------------------
    # BUSINESS
    # -------------------------------------------------------

    def match_business(self, business, rule):
        businesses = parse_business(rule)
        if not businesses or "any" in businesses:
            return True

        if not business or str(business).strip() == "":
            return None

        user_bus = normalize(business)
        if not user_bus or user_bus in ["any", "all", "na", "none", "n/a"]:
            return None

        # Build expanded terms for user business
        expanded_user_terms = {user_bus}

        # Services & Micro Enterprises
        if any(w in user_bus for w in ["tailor", "garment", "stitch", "parlour", "beauty", "salon", "repair", "service", "consult", "it", "software", "freelance", "hotel", "restaurant"]):
            expanded_user_terms.update(["services", "msme", "micro-enterprise", "self-employment", "small business"])

        # Trading & Retail
        if any(w in user_bus for w in ["retail", "shop", "store", "trader", "vendor", "selling", "trade", "trading", "mart", "kiosk", "stall"]):
            expanded_user_terms.update(["trading", "services", "msme", "self-employment", "micro-enterprise"])

        # Agriculture & Farming
        if any(w in user_bus for w in ["farm", "dairy", "crop", "agri", "kisan", "poultry", "cattle", "livestock", "fish", "animal"]):
            expanded_user_terms.update(["agriculture", "farming", "dairy", "allied agriculture", "rural enterprise"])

        # Manufacturing & Artisans
        if any(w in user_bus for w in ["factory", "manufac", "unit", "product", "craft", "handicraft", "weave", "loom", "artisan", "textile"]):
            expanded_user_terms.update(["manufacturing", "handicraft", "msme", "industrial"])

        for b in businesses:
            b_norm = normalize(b)
            if not b_norm or b_norm == "any":
                return True
            for term in expanded_user_terms:
                if b_norm in term or term in b_norm:
                    return True

        return False

    # -------------------------------------------------------
    # STATE
    # -------------------------------------------------------

    def match_state(self, state, rule):

        states = parse_state(rule)

        if len(states) == 0:
            return True

        if "Any" in states:
            return True

        if not state:
            return None

        for s in states:

            if normalize(state) == normalize(s):
                return True

        return False

    # -------------------------------------------------------
    # DISABILITY
    # -------------------------------------------------------

    def match_disability(self, disability, rule):

        required = parse_bool(rule)

        if not required:
            return True

        return disability

    # -------------------------------------------------------
    # RURAL
    # -------------------------------------------------------

    def match_rural(self, rural, rule):

        required = parse_bool(rule)

        if not required:
            return True

        return rural

    # -------------------------------------------------------
    # COMPLETE MATCH
    # -------------------------------------------------------

    def match_scheme(self, user, scheme):
        matched, failed, unknown = [], [], []
        checks = [
            ("Age", self.match_age, "Age", "Age Range"),
            ("Income", self.match_income, "Income", "Max Income"),
            ("Gender", self.match_gender, "Gender", "Eligible Genders"),
            ("Category", self.match_category, "Category", "Eligible Categories"),
            ("Disability", self.match_disability, "Disability", "Disability Required"),
            ("Rural", self.match_rural, "Rural", "Rural Only"),
            ("Business", self.match_business, "Business_Type", "Business Types"),
        ]
        if "State" in scheme:
            checks.append(("State", self.match_state, "State", "State"))
        for label, check, profile_key, rule_key in checks:
            result = check(user.get(profile_key), scheme.get(rule_key))
            (unknown if result is None else matched if result else failed).append(label)
        return {
            "matched": matched, "failed": failed, "unknown": unknown,
            "eligible": not failed and not unknown,
            "matched_count": len(matched), "failed_count": len(failed),
        }

    # -------------------------------------------------------
    # MULTIPLE SCHEMES
    # -------------------------------------------------------

    def recommend(self, user, dataframe):

        results = []

        for _, scheme in dataframe.iterrows():

            result = self.match_scheme(
                user,
                scheme
            )

            result["Scheme Name"] = scheme["Scheme Name"]

            result["Notes"] = scheme.get("Notes", "")

            results.append(result)

        results.sort(

            key=lambda x: x["matched_count"],

            reverse=True

        )

        return results


# ==========================================================
# Example
# ==========================================================

if __name__ == "__main__":

    import pandas as pd

    df = pd.read_csv(
        "all_schemes_eligibility_table.csv"
    )

    matcher = EligibilityMatcher()

    user = {

        "Age": 27,

        "Gender": "Female",

        "Category": "SC",

        "Income": 180000,

        "Disability": False,

        "Rural": True,

        "Business_Type": "Tailoring",

        "State": "Uttar Pradesh"

    }

    results = matcher.recommend(user, df)

    for r in results[:10]:

        print("-" * 60)

        print("Scheme :", r["Scheme Name"])

        print("Eligible :", r["eligible"])

        print("Matched :", r["matched"])

        print("Failed :", r["failed"])
