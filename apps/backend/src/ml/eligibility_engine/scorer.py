"""
=============================================================
SCORER.PY

Calculates

1. Match Percentage

2. Explainable AI

3. Confidence Score

4. Ranking Score

=============================================================
"""

WEIGHTS = {

    "Age":15,

    "Income":20,

    "Gender":10,

    "Category":20,

    "Disability":10,

    "State":5,

    "Rural":5,

    "Business":15

}


class SchemeScorer:

    def __init__(self):

        self.total = sum(WEIGHTS.values())

    # -------------------------------------------------

    def calculate_score(self, matched):

        score = 0

        explanation = {}

        for feature in WEIGHTS:

            if feature in matched:

                score += WEIGHTS[feature]

                explanation[feature] = {

                    "Matched":True,

                    "Weight":WEIGHTS[feature]

                }

            else:

                explanation[feature] = {

                    "Matched":False,

                    "Weight":0

                }

        percentage = round(

            score/self.total*100,

            2

        )

        return percentage, explanation

    # -------------------------------------------------

    def confidence(self, score):

        if score >= 90:

            return "Very High"

        elif score >= 75:

            return "High"

        elif score >= 60:

            return "Medium"

        elif score >= 40:

            return "Low"

        return "Very Low"

    # -------------------------------------------------

    def rank(self, schemes):

        return sorted(

            schemes,

            key=lambda x:x["Match Score"],

            reverse=True

        )