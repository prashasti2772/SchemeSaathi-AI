"""
train_model.py

Trains an ML eligibility model on all_schemes_eligibility_table.csv.
The model learns to predict scheme eligibility probability and match score
given citizen demographic features and scheme criteria.
Saves the trained model artifact to eligibility_model.joblib.
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from parser import (
    parse_age,
    parse_income,
    parse_categories,
    parse_gender,
    parse_business,
    parse_bool,
)
from matcher import EligibilityMatcher
from scorer import SchemeScorer

DATASET_PATH = os.path.join(CURRENT_DIR, "all_schemes_eligibility_table.csv")
MODEL_OUTPUT_PATH = os.path.join(CURRENT_DIR, "eligibility_model.joblib")


def parse_scheme_criteria(row: pd.Series) -> dict:
    min_age, max_age = parse_age(row.get("Age Range", ""))
    min_inc, max_inc = parse_income(row.get("Max Income", ""))
    categories = parse_categories(row.get("Eligible Categories", ""))
    genders = parse_gender(row.get("Eligible Genders", ""))
    disability_req = parse_bool(row.get("Disability Required", ""))
    rural_req = parse_bool(row.get("Rural Only", ""))
    businesses = parse_business(row.get("Business Types", ""))

    return {
        "min_age": float(min_age),
        "max_age": float(max_age),
        "max_income": float(max_inc),
        "categories": categories,
        "genders": genders,
        "disability_required": 1.0 if disability_req else 0.0,
        "rural_only": 1.0 if rural_req else 0.0,
        "business_types": businesses,
    }


def extract_pair_features(user: dict, scheme_criteria: dict) -> np.ndarray:
    """
    Extracts a feature vector for a citizen profile and scheme criteria pair.
    Captures demographic attributes, constraint boundaries, and compatibility signals.
    """
    age = float(user.get("Age", user.get("age", 30)) or 30)
    income = float(user.get("Income", user.get("annual_income", 150000)) or 150000)

    # Citizen flags
    gender = str(user.get("Gender", user.get("gender", "any")) or "any").lower()
    is_female = 1.0 if "female" in gender or "woman" in gender else 0.0
    is_male = 1.0 if gender == "male" else 0.0

    category = str(user.get("Category", user.get("category", user.get("social_category", "GENERAL"))) or "GENERAL").lower()
    is_sc = 1.0 if "sc" in category else 0.0
    is_st = 1.0 if "st" in category else 0.0
    is_obc = 1.0 if "obc" in category else 0.0
    is_gen = 1.0 if "gen" in category or (not is_sc and not is_st and not is_obc) else 0.0

    has_disability = 1.0 if bool(user.get("Disability", user.get("disability", False))) else 0.0
    is_rural = 1.0 if bool(user.get("Rural", user.get("rural", False))) else 0.0

    b_type = str(user.get("Business_Type", user.get("business_type", user.get("occupation", ""))) or "").lower()

    # Scheme constraints
    min_age = scheme_criteria["min_age"]
    max_age = scheme_criteria["max_age"]
    max_income = scheme_criteria["max_income"]

    # Boundary metrics
    age_valid = 1.0 if (min_age <= age <= max_age) else 0.0
    income_valid = 1.0 if (income <= max_income) else 0.0

    # Gender match
    g_req = scheme_criteria["genders"]
    gender_match = 1.0 if ("any" in g_req or (is_female and "female" in g_req) or (is_male and "male" in g_req)) else 0.0

    # Category match
    c_req = scheme_criteria["categories"]
    cat_match = 1.0 if ("any" in c_req or any(c in category for c in c_req)) else 0.0

    # Disability match
    dis_req = scheme_criteria["disability_required"]
    dis_match = 1.0 if (dis_req == 0.0 or has_disability == 1.0) else 0.0

    # Rural match
    rur_req = scheme_criteria["rural_only"]
    rur_match = 1.0 if (rur_req == 0.0 or is_rural == 1.0) else 0.0

    # Business match
    b_req = scheme_criteria["business_types"]
    b_match = 1.0 if ("any" in b_req or any(b in b_type for b in b_req)) else 0.0

    return np.array([
        age,
        np.log1p(max(0.0, income)),
        is_female,
        is_male,
        is_sc,
        is_st,
        is_obc,
        is_gen,
        has_disability,
        is_rural,
        min_age,
        max_age,
        np.log1p(max_income),
        dis_req,
        rur_req,
        age_valid,
        income_valid,
        gender_match,
        cat_match,
        dis_match,
        rur_match,
        b_match,
    ], dtype=np.float32)


def generate_training_samples(df: pd.DataFrame, num_profiles: int = 400):
    matcher = EligibilityMatcher()
    scorer = SchemeScorer()

    schemes_criteria = [parse_scheme_criteria(row) for _, row in df.iterrows()]

    ages = [16, 18, 22, 27, 35, 42, 50, 60, 68, 75]
    incomes = [30000, 75000, 120000, 180000, 250000, 500000, 1000000, 2500000]
    genders = ["Female", "Male"]
    categories = ["SC", "ST", "OBC", "General"]
    disabilities = [False, False, False, True]
    rurals = [True, False]
    businesses = [
        "MSME Manufacturing", "Tailoring & Garments", "Farming & Agriculture",
        "Handicrafts & Handlooms", "IT Services", "Street Vendor", "Dairy & Animal Husbandry", "Unemployed"
    ]

    rng = np.random.RandomState(42)
    sample_profiles = []

    for _ in range(num_profiles):
        p = {
            "Age": int(rng.choice(ages)),
            "Income": float(rng.choice(incomes)),
            "Gender": str(rng.choice(genders)),
            "Category": str(rng.choice(categories)),
            "Disability": bool(rng.choice(disabilities)),
            "Rural": bool(rng.choice(rurals)),
            "Business_Type": str(rng.choice(businesses)),
            "State": "All India",
        }
        sample_profiles.append(p)

    X_list = []
    y_score_list = []
    y_eligible_list = []

    for p in sample_profiles:
        for idx, s in df.iterrows():
            crit = schemes_criteria[idx]
            eval_res = matcher.match_scheme(p, s)
            score, _ = scorer.calculate_score(eval_res["matched"])
            is_eligible = 1 if eval_res["eligible"] else 0

            feat = extract_pair_features(p, crit)
            X_list.append(feat)
            y_score_list.append(score / 100.0)
            y_eligible_list.append(is_eligible)

    return np.array(X_list), np.array(y_score_list), np.array(y_eligible_list), schemes_criteria


def train_and_save_model():
    print(f"Loading dataset from: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)
    df.fillna("", inplace=True)
    print(f"Total schemes in dataset: {len(df)}")

    print("Generating paired training samples...")
    X, y_score, y_eligible, schemes_criteria = generate_training_samples(df, num_profiles=200)
    print(f"Generated {X.shape[0]} training pairs with {X.shape[1]} features.")

    X_train, X_val, y_train, y_val = train_test_split(X, y_score, test_size=0.15, random_state=42)

    print("Training ML Match Regressor (Random Forest)...")
    regressor = RandomForestRegressor(
        n_estimators=60,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    regressor.fit(X_train, y_train)

    train_r2 = regressor.score(X_train, y_train)
    val_r2 = regressor.score(X_val, y_val)
    print(f"ML Model Training R2: {train_r2:.4f} | Validation R2: {val_r2:.4f}")

    artifact = {
        "model": regressor,
        "feature_count": X.shape[1],
        "total_schemes": len(df),
        "schemes_criteria": schemes_criteria,
        "dataset_path": DATASET_PATH,
    }

    joblib.dump(artifact, MODEL_OUTPUT_PATH)
    print(f"Successfully exported trained eligibility ML model to: {MODEL_OUTPUT_PATH}")
    return artifact


if __name__ == "__main__":
    train_and_save_model()
