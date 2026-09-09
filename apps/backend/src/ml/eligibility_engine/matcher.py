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

        minimum, maximum = parse_age(rule)

        if minimum <= age <= maximum:
            return True

        return False

    # -------------------------------------------------------
    # INCOME
    # -------------------------------------------------------

    def match_income(self, income, rule):

        minimum, maximum = parse_income(rule)

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

        return normalize(gender) in genders

    # -------------------------------------------------------
    # CATEGORY
    # -------------------------------------------------------

    def match_category(self, category, rule):

        categories = parse_categories(rule)

        if "any" in categories:
            return True

        return normalize(category) in categories

    # -------------------------------------------------------
    # BUSINESS
    # -------------------------------------------------------

    def match_business(self, business, rule):
        businesses = parse_business(rule)
        if not businesses or "any" in businesses:
            return True

        if not business or str(business).strip() == "":
            return True

        user_bus = normalize(business)
        if not user_bus or user_bus in ["any", "all", "na", "none", "n/a"]:
            return True

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

        # Default fallback for general business activity
        expanded_user_terms.update(["msme", "micro-enterprise", "small business"])

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

        matched = []

        failed = []

        # AGE
        if self.match_age(
                user["Age"],
                scheme["Age Range"]):

            matched.append("Age")

        else:

            failed.append("Age")

        # INCOME
        if self.match_income(
                user["Income"],
                scheme["Max Income"]):

            matched.append("Income")

        else:

            failed.append("Income")

        # GENDER
        if self.match_gender(
                user["Gender"],
                scheme["Eligible Genders"]):

            matched.append("Gender")

        else:

            failed.append("Gender")

        # CATEGORY
        if self.match_category(
                user["Category"],
                scheme["Eligible Categories"]):

            matched.append("Category")

        else:

            failed.append("Category")

        # DISABILITY
        if self.match_disability(
                user["Disability"],
                scheme["Disability Required"]):

            matched.append("Disability")

        else:

            failed.append("Disability")

        # RURAL
        if self.match_rural(
                user["Rural"],
                scheme["Rural Only"]):

            matched.append("Rural")

        else:

            failed.append("Rural")

        # BUSINESS
        if self.match_business(
                user["Business_Type"],
                scheme["Business Types"]):

            matched.append("Business")

        else:

            failed.append("Business")

        # STATE (only if column exists)
        if "State" in scheme.index:

            if self.match_state(
                    user["State"],
                    scheme["State"]):

                matched.append("State")

            else:

                failed.append("State")

        return {

            "matched": matched,

            "failed": failed,

            "eligible": len(failed) == 0,

            "matched_count": len(matched),

            "failed_count": len(failed)

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