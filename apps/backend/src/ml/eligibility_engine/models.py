from dataclasses import dataclass, field
from typing import List, Optional


# -----------------------------
# User Profile
# -----------------------------
@dataclass
class UserProfile:

    age: int

    gender: str

    category: str

    annual_income: float

    state: str

    district: str

    rural: bool

    disability: bool

    business_type: str

    existing_business: bool

    education: str

    minority: bool = False

    woman_entrepreneur: bool = False

    bank_account: bool = True

    aadhaar_available: bool = True

    pan_available: bool = False

    income_certificate: bool = False

    caste_certificate: bool = False

    disability_certificate: bool = False


# -----------------------------
# Scheme Eligibility Rule
# -----------------------------
@dataclass
class SchemeRule:

    scheme_name: str

    eligible_categories: List[str]

    eligible_genders: List[str]

    minimum_age: Optional[int]

    maximum_age: Optional[int]

    minimum_income: Optional[float]

    maximum_income: Optional[float]

    disability_required: bool

    rural_only: bool

    business_types: List[str]

    states: List[str]

    notes: str = ""


# -----------------------------
# Match Explanation
# -----------------------------
@dataclass
class MatchExplanation:

    matched_conditions: List[str] = field(default_factory=list)

    failed_conditions: List[str] = field(default_factory=list)

    score: float = 0.0


# -----------------------------
# Final Result
# -----------------------------
@dataclass
class EligibilityResult:

    scheme_name: str

    eligible: bool

    match_score: float

    explanation: MatchExplanation

    required_documents: List[str]