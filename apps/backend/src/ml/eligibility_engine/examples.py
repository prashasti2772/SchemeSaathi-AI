from engine import EligibilityEngine

engine = EligibilityEngine("all_schemes_eligibility_table.csv")
users = [

{
    "Age": 23,
    "Gender": "Female",
    "Category": "SC",
    "Income": 200000,
    "Disability": False,
    "Rural": True,
    "Business_Type": "Tailoring"
},

{
    "Age": 35,
    "Gender": "Male",
    "Category": "General",
    "Income": 900000,
    "Disability": False,
    "Rural": False,
    "Business_Type": "Manufacturing"
}

]

for user in users:

    print("="*60)

    print(user)

    results = engine.recommend(user)

    print(results[:5])