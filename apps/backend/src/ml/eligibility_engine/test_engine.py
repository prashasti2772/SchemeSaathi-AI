"""
=========================================================
test_engine.py

Test the Eligibility Engine

=========================================================
"""

from engine import EligibilityEngine

engine = EligibilityEngine(
    "all_schemes_eligibility_table.csv"
)

# -------------------------------------------------------
# Test User
# -------------------------------------------------------

user = {

    "Age": 27,

    "Gender": "Female",

    "Category": "SC",

    "Income": 180000,

    "Disability": False,

    "Rural": True,

    "Business_Type": "Tailoring",

    "State": "Uttar Pradesh",

    "District": "Ghaziabad",

    "Education": "Graduate",

    "Existing_Business": False

}

# -------------------------------------------------------
# Top 10 Schemes
# -------------------------------------------------------

recommendations = engine.recommend(user, top_n=10)

print("="*70)
print("TOP 10 RECOMMENDATIONS")
print("="*70)

for i, scheme in enumerate(recommendations):

    print()

    print(f"Rank {i+1}")

    print("Scheme :", scheme["Scheme Name"])

    print("Eligible :", scheme["Eligible"])

    print("Score :", scheme["Match Score"])

    print("Confidence :", scheme["Confidence"])

    print("Matched :", scheme["Matched Conditions"])

    print("Failed :", scheme["Failed Conditions"])

print()

print("="*70)

eligible = engine.eligible_schemes(user)

print("Eligible Schemes :", len(eligible))

print("="*70)