
"""
============================================================
engine.py

Main Eligibility Engine

============================================================
"""

import os
import pandas as pd

try:
    from src.ml.eligibility_engine.matcher import EligibilityMatcher
    from src.ml.eligibility_engine.scorer import SchemeScorer
except ImportError:
    try:
        from .matcher import EligibilityMatcher
        from .scorer import SchemeScorer
    except ImportError:
        from matcher import EligibilityMatcher
        from scorer import SchemeScorer


class EligibilityEngine:

    def __init__(self, csv_path=None):

        self.matcher = EligibilityMatcher()
        self.scorer = SchemeScorer()

        if csv_path is None or not os.path.exists(csv_path):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            resolved = os.path.join(base_dir, "all_schemes_eligibility_table.csv")
            if os.path.exists(resolved):
                csv_path = resolved
            elif csv_path and os.path.exists(os.path.join(base_dir, csv_path)):
                csv_path = os.path.join(base_dir, csv_path)

        self.df = pd.read_csv(csv_path)
        self.df.fillna("", inplace=True)

    # -------------------------------------------------------
    # Check One Scheme
    # -------------------------------------------------------

    def evaluate_scheme(self, user, scheme):

        result = self.matcher.match_scheme(
            user,
            scheme
        )

        score, explanation = self.scorer.calculate_score(
            result["matched"]
        )

        return {

            "Scheme Name": scheme["Scheme Name"],

            "Eligible": result["eligible"],

            "Match Score": score,

            "Confidence": self.scorer.confidence(score),

            "Matched Conditions": result["matched"],

            "Failed Conditions": result["failed"],

            "Explanation": explanation,

            "Notes": scheme.get("Notes", "")

        }

    # -------------------------------------------------------
    # Recommend Schemes
    # -------------------------------------------------------

    def recommend(self, user, top_n=10):

        recommendations = []

        for _, scheme in self.df.iterrows():

            recommendation = self.evaluate_scheme(
                user,
                scheme
            )

            recommendations.append(
                recommendation
            )

        recommendations = sorted(

            recommendations,

            key=lambda x: (

                x["Eligible"],

                x["Match Score"]

            ),

            reverse=True

        )

        return recommendations[:top_n]

    # -------------------------------------------------------
    # Get Only Eligible Schemes
    # -------------------------------------------------------

    def eligible_schemes(self, user):

        eligible = []

        for _, scheme in self.df.iterrows():

            result = self.evaluate_scheme(
                user,
                scheme
            )

            if result["Eligible"]:

                eligible.append(result)

        eligible = sorted(

            eligible,

            key=lambda x: x["Match Score"],

            reverse=True

        )

        return eligible

    # -------------------------------------------------------
    # Explain Recommendation
    # -------------------------------------------------------

    def explain(self, recommendation):

        print()

        print("=" * 60)

        print("Scheme :", recommendation["Scheme Name"])

        print("Eligible :", recommendation["Eligible"])

        print("Match Score :", recommendation["Match Score"])

        print("Confidence :", recommendation["Confidence"])

        print()

        print("Matched Conditions")

        for item in recommendation["Matched Conditions"]:

            print("✓", item)

        print()

        print("Failed Conditions")

        for item in recommendation["Failed Conditions"]:

            print("✗", item)

        print()

        print("Explanation")

        for key, value in recommendation["Explanation"].items():

            print(

                key,

                ":",

                value

            )

        print("=" * 60)


# ============================================================
# Example
# ============================================================

if __name__ == "__main__":

    engine = EligibilityEngine(

        "all_schemes_eligibility_table.csv"

    )

    user = {

        "Age": 28,

        "Gender": "Female",

        "Category": "SC",

        "Income": 180000,

        "Disability": False,

        "Rural": True,

        "Business_Type": "Tailoring",

        "State": "Uttar Pradesh"

    }

    print()

    print("Finding Best Schemes...")

    print()

    recommendations = engine.recommend(

        user,

        top_n=10

    )

    for recommendation in recommendations:

        engine.explain(

            recommendation

        )