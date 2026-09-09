import pandas as pd
import re

# ==========================================================
# CSV Loader
# ==========================================================

def load_schemes(csv_path):

    df = pd.read_csv(csv_path)

    df.fillna("", inplace=True)

    return df


# ==========================================================
# Clean Text
# ==========================================================

def clean_text(text):

    if text is None:
        return ""

    text = str(text)

    text = text.replace("\n", " ")

    text = text.replace("\t", " ")

    text = text.strip()

    return text


# ==========================================================
# Normalize Text
# ==========================================================

def normalize(text):

    return clean_text(text).lower()


# ==========================================================
# Extract Numbers
# ==========================================================

def extract_numbers(text):

    text = normalize(text)

    nums = re.findall(r"\d+", text)

    return [int(i) for i in nums]


# ==========================================================
# Income Formatter
# ==========================================================

def income_to_number(text):

    text = normalize(text)

    text = text.replace(",", "")

    numbers = extract_numbers(text)

    if len(numbers) == 0:

        return None

    value = numbers[0]

    if "lakh" in text:

        value *= 100000

    if "crore" in text:

        value *= 10000000

    return value


# ==========================================================
# Boolean Parser
# ==========================================================

def to_bool(value):

    value = normalize(value)

    return value in [

        "yes",

        "true",

        "required",

        "1"

    ]


# ==========================================================
# Split Values
# ==========================================================

def split_values(text):

    text = clean_text(text)

    text = text.replace("/", ",")

    text = text.replace(";", ",")

    text = text.replace("|", ",")

    values = []

    for item in text.split(","):

        item = item.strip()

        if item != "":

            values.append(item)

    return values


# ==========================================================
# Contains Ignore Case
# ==========================================================

def contains(user, values):

    user = normalize(user)

    for value in values:

        if normalize(value) in user:

            return True

    return False


# ==========================================================
# Missing Value Check
# ==========================================================

def is_empty(value):

    if value is None:

        return True

    value = normalize(value)

    return value in [

        "",

        "nan",

        "none",

        "na"

    ]


# ==========================================================
# Safe String
# ==========================================================

def safe(value):

    if value is None:

        return ""

    return str(value)


# ==========================================================
# Match Percentage
# ==========================================================

def percentage(matched, total):

    if total == 0:

        return 0

    return round(

        matched / total * 100,

        2

    )