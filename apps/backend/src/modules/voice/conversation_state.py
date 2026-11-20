PROFILE_FIELDS_ORDER = ["full_name", "location", "occupation", "business_type", "income_band", "social_category"]

DISALLOWED_FIELDS = {"otp", "pin", "password", "bank_account_number", "upi_pin", "card_number"}

# Prompts are written in English and passed through Bhashini translation/TTS
# at call time, so adding a language only requires it to be Bhashini-supported.
PROMPT_TEXT = {
    "full_name": "Please tell me your full name.",
    "location": "Which village, town or district do you live in?",
    "occupation": "What is your main occupation or work?",
    "business_type": "What type of business do you run, or plan to run?",
    "income_band": "What is your approximate monthly household income?",
    "social_category": "What is your social category, for example general, OBC, SC, ST or minority?",
}

CONSENT_PROMPT = (
    "This is the government scheme helpline. We will ask a few questions about your work and "
    "background to find schemes you may be eligible for. We will never ask for OTP, PIN, password "
    "or bank details. Do you agree to continue?"
)

COMPLETION_PROMPT = "Thank you. We have all the details we need. We will now check which schemes match you."


def get_prompt_for_field(field: str) -> str:
    return PROMPT_TEXT.get(field, "Could you please repeat that?")


_AFFIRMATIVE_WORDS = {"yes", "haan", "ha", "theek", "ok", "okay", "sahi", "correct", "sure", "yep"}
_NEGATIVE_WORDS = {"no", "nahi", "nahin", "na", "cancel", "stop"}


def interpret_consent_response(text: str) -> bool | None:
    """Best-effort yes/no detection on the raw (already-transcribed) speech.
    Returns None when the answer is ambiguous, so the caller can re-prompt
    rather than silently assuming consent."""
    normalized = text.strip().lower()
    words = set(normalized.replace(",", " ").split())
    if words & _AFFIRMATIVE_WORDS:
        return True
    if words & _NEGATIVE_WORDS:
        return False
    return None


def get_next_question_field(conversation_state: dict) -> str | None:
    collected = conversation_state.get("collected_fields", {})
    for field in PROFILE_FIELDS_ORDER:
        if field not in collected or not collected[field]:
            return field
    return None


def record_answer(conversation_state: dict, field: str, value: str) -> dict:
    if field in DISALLOWED_FIELDS:
        raise ValueError("This system never collects OTPs, PINs, passwords or payment details")
    collected = conversation_state.setdefault("collected_fields", {})
    collected[field] = value
    return conversation_state


def is_profile_complete(conversation_state: dict) -> bool:
    return get_next_question_field(conversation_state) is None
