import re


def normalize_phone_number(raw_number: str) -> str:
    digits = re.sub(r"\D", "", raw_number)
    if len(digits) == 10:
        return f"+91{digits}"
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if raw_number.startswith("+"):
        return raw_number
    return f"+{digits}"


def mask_phone_number(phone_number: str) -> str:
    if len(phone_number) < 4:
        return "****"
    return f"{phone_number[:-4].replace(phone_number[2:-4], '*' * len(phone_number[2:-4]))}{phone_number[-4:]}"


def mask_email(email: str) -> str:
    if "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    visible = local[:2]
    return f"{visible}{'*' * max(len(local) - 2, 1)}@{domain}"
