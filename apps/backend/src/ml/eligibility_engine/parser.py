import re

# ============================================================
# Generic Text Cleaning
# ============================================================

def clean(text):

    if text is None:
        return ""

    text = str(text)

    text = text.replace("₹", "")

    # Preserve list separators; remove grouping commas only in numeric parsers.

    text = text.strip()

    return text


# ============================================================
# Parse Categories
# ============================================================

def parse_categories(text):

    text = clean(text).lower()

    if text == "":
        return ["any"]

    if "any" in text:
        return ["any"]

    separators = [",", "/", ";", "|"]

    for s in separators:
        text = text.replace(s, ",")

    values = []

    for x in text.split(","):

        x = x.strip()

        if x != "":
            values.append(x)

    return values


# ============================================================
# Parse Gender
# ============================================================

def parse_gender(text):

    text = clean(text).lower()

    if text == "":
        return ["any"]

    if "any" in text:
        return ["any"]

    if "both" in text:
        return ["male", "female"]

    result = []

    if re.search(r"\bmale\b", text):
        result.append("male")

    if re.search(r"\bfemale\b", text):
        result.append("female")

    return result


# ============================================================
# Parse Business Types
# ============================================================

def parse_business(text):

    text = clean(text).lower()

    if text == "":
        return ["any"]

    if "any" in text:
        return ["any"]

    text = text.replace("/", ",")

    text = text.replace(";", ",")

    businesses = []

    for b in text.split(","):

        b = b.strip()

        if b != "":
            businesses.append(b)

    return businesses


# ============================================================
# Parse Age Range
# ============================================================

def parse_age(rule):

    rule = clean(rule).lower().replace(",", "")

    if rule == "":
        return (0, 200)

    nums = re.findall(r"\d+", rule)

    if len(nums) >= 2:

        return (int(nums[0]), int(nums[1]))

    if len(nums) == 1:

        if "above" in rule or "minimum" in rule:

            return (int(nums[0]), 200)

        if "below" in rule or "maximum" in rule:

            return (0, int(nums[0]))

        return (int(nums[0]), 200)

    return (0, 200)


# ============================================================
# Parse Income
# ============================================================

def parse_income(rule):

    rule = clean(rule).lower().replace(",", "")

    if rule == "":
        return (0, 999999999)

    rule = rule.replace("lakhs", "lakh")

    rule = rule.replace("lacs", "lakh")

    nums = re.findall(r"\d+(?:\.\d+)?", rule)

    if len(nums) == 0:

        return (0, 999999999)

    value = float(nums[0])

    if "lakh" in rule:

        value *= 100000

    if "crore" in rule:

        value *= 10000000

    if "above" in rule:

        return (value, 999999999)

    return (0, value)


# ============================================================
# Boolean Parser
# ============================================================

def parse_bool(value):

    value = clean(value).lower()

    return value in [

        "yes",

        "true",

        "required",

        "1"

    ]


# ============================================================
# State Parser
# ============================================================

def parse_state(text):

    text = clean(text)

    if text == "":
        return ["Any"]

    text = text.replace("/", ",")

    text = text.replace(";", ",")

    return [

        x.strip()

        for x in text.split(",")

        if x.strip() != ""

    ]


# ============================================================
# Match Helpers
# ============================================================

def match_category(user, allowed):

    if "any" in allowed:

        return True

    return user.lower() in allowed


def match_gender(user, allowed):

    if "any" in allowed:

        return True

    return user.lower() in allowed


def match_business(user, allowed):

    if "any" in allowed:

        return True

    user = user.lower()

    for b in allowed:

        if b in user:

            return True

    return False


def match_state(user, allowed):

    if "Any" in allowed:

        return True

    return user in allowed