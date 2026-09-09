"""
=========================================================
api.py

FastAPI Backend for Government Scheme Eligibility Engine

=========================================================
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

from engine import EligibilityEngine


# ---------------------------------------------------------
# Load Engine
# ---------------------------------------------------------

engine = EligibilityEngine(
    "all_schemes_eligibility_table.csv"
)

app = FastAPI(
    title="Government Scheme Eligibility Engine",
    version="1.0",
    description="AI Rule-Based Eligibility Engine"
)


# ---------------------------------------------------------
# User Model
# ---------------------------------------------------------

class UserProfile(BaseModel):

    Age: int

    Gender: str

    Category: str

    Income: float

    Disability: bool

    Rural: bool

    Business_Type: str

    State: str

    District: Optional[str] = ""

    Education: Optional[str] = ""

    Existing_Business: Optional[bool] = False


# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------

@app.get("/")
def home():

    return {

        "status": "Running",

        "service": "Eligibility Engine",

        "version": "1.0"

    }


# ---------------------------------------------------------
# Recommend Schemes
# ---------------------------------------------------------

@app.post("/recommend")
def recommend(user: UserProfile):

    result = engine.recommend(

        user.dict(),

        top_n=10

    )

    return {

        "success": True,

        "total_recommendations": len(result),

        "recommendations": result

    }


# ---------------------------------------------------------
# Eligible Schemes Only
# ---------------------------------------------------------

@app.post("/eligible")
def eligible(user: UserProfile):

    result = engine.eligible_schemes(

        user.dict()

    )

    return {

        "success": True,

        "eligible_count": len(result),

        "schemes": result

    }


# ---------------------------------------------------------
# Best Scheme Only
# ---------------------------------------------------------

@app.post("/best")
def best(user: UserProfile):

    result = engine.recommend(

        user.dict(),

        top_n=1

    )

    if len(result) == 0:

        return {

            "success": False,

            "message": "No Scheme Found"

        }

    return result[0]


# ---------------------------------------------------------
# Top N Schemes
# ---------------------------------------------------------

@app.post("/top/{n}")
def top_n(n: int, user: UserProfile):

    result = engine.recommend(

        user.dict(),

        top_n=n

    )

    return result


# ---------------------------------------------------------
# Explain Best Match
# ---------------------------------------------------------

@app.post("/explain")
def explain(user: UserProfile):

    result = engine.recommend(

        user.dict(),

        top_n=1

    )

    if len(result) == 0:

        return {

            "message": "No Scheme"

        }

    scheme = result[0]

    return {

        "Scheme": scheme["Scheme Name"],

        "Eligible": scheme["Eligible"],

        "Match Score": scheme["Match Score"],

        "Confidence": scheme["Confidence"],

        "Matched Conditions": scheme["Matched Conditions"],

        "Failed Conditions": scheme["Failed Conditions"],

        "Explanation": scheme["Explanation"]

    }


# ---------------------------------------------------------
# Search By Category
# ---------------------------------------------------------

@app.get("/category/{category}")
def category(category: str):

    df = engine.df

    schemes = []

    for _, row in df.iterrows():

        text = str(row["Eligible Categories"]).lower()

        if category.lower() in text:

            schemes.append({

                "Scheme": row["Scheme Name"],

                "Categories": row["Eligible Categories"]

            })

    return {

        "count": len(schemes),

        "schemes": schemes

    }


# ---------------------------------------------------------
# Search By Gender
# ---------------------------------------------------------

@app.get("/gender/{gender}")
def gender(gender: str):

    df = engine.df

    schemes = []

    for _, row in df.iterrows():

        text = str(row["Eligible Genders"]).lower()

        if gender.lower() in text:

            schemes.append({

                "Scheme": row["Scheme Name"],

                "Gender": row["Eligible Genders"]

            })

    return {

        "count": len(schemes),

        "schemes": schemes

    }


# ---------------------------------------------------------
# Search By Business
# ---------------------------------------------------------

@app.get("/business/{business}")
def business(business: str):

    df = engine.df

    schemes = []

    for _, row in df.iterrows():

        text = str(row["Business Types"]).lower()

        if business.lower() in text:

            schemes.append({

                "Scheme": row["Scheme Name"],

                "Business": row["Business Types"]

            })

    return {

        "count": len(schemes),

        "schemes": schemes

    }