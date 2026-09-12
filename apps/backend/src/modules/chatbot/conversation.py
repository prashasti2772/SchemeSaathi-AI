"""Question routing and authored multilingual explanations, independent of providers.

The local assistant has a deliberately bounded knowledge base. Unknown questions
request clarification; only explicit discovery requests invoke catalogue search.
"""
import json
import re
import unicodedata
from pathlib import Path

COPY = json.loads(Path(__file__).with_name("knowledge.json").read_text(encoding="utf-8"))
CONCEPTS = {
    "margin": r"margin money|मार्जिन|માર્જિન|மார்ஜின்|మార్జిన్|মার্জিন|ಮಾರ್ಜಿನ್",
    "income": r"family income|annual income|household income|पारिवारिक आय|कौटुंबिक उत्पन्न|पारिवारिक उत्पन्न|પારિવારિક આવક|குடும்ப வருமானம்|కుటుంబ ఆదాయం|পারিবারিক আয়|ಕುಟುಂಬ ಆದಾಯ",
    "emi": r"\bemi\b|instalment|installment|ईएमआई|ईएमआय|किस्त|हप्ता|ઈએમઆઈ|மாதத் தவணை|వాయిదా|কিস্তি|ಕಂತು",
    "collateral": r"collateral|गिरवी|संपार्श्विक|तारण|ગીરો|அடமான|తాకట్టు|জামানত|ಅಡಮಾನ",
    "interest": r"interest|ब्याज|व्याज|byaj|byaaj|વ્યાજ|வட்டி|వడ్డీ|সুদ|ಬಡ್ಡಿ",
    "grant": r"\bgrants?\b|अनुदान|અનુદાન|நிதிக் கொடை|గ్రాంట్|অনুদান|ಅನುದಾನ",
    "loan": r"\bloans?\b|\brin\b|\bkarz\b|\budhar\b|ऋण|कर्ज|लोन|લોન|கடன|రుణ|ঋণ|ಸಾಲ",
    "subsidy": r"\bsubsid(?:y|ies)\b|\bsubs[ie]d[yi]\b|सब्सिडी|सबसीडी|सबसिडी|સબસિડી|மானிய|సబ్సిడీ|ভর্তুকি|ಸಬ್ಸಿಡಿ",
}
DEFINITION = r"how .*work|what (?:is|are)|what do.*mean|meaning|definition|define|explain|samjha|matlab|kya (?:hai|hota|hoti)|क्या (?:है|होत)|मतलब|अर्थ|समझा|म्हणजे|શું|என்றால்|என்ன|అంటే|ఏమిటి|কী|মানে|ಎಂದರೇನು|ಅರ್ಥ"
DISCOVERY = r"\b(find|search|recommend|suggest|schemes? for|list|looking for|need (?:a |an )?(?:loan|fund|subsid)|want (?:a |an )?(?:loan|fund|subsid))\b|योजनाएं|योजनाएँ|योजना बताओ|योजना खोज|योजना शोध|योजनाओं|योजना चाहिए|yojana chahiye|schemes batao|loan chahiye|યોજનાઓ|திட்டங்கள்|పథకాలు|প্রকল্পগুলি|প্রকল্প খুঁজ|ಯೋಜನೆಗಳು"
EXAMPLE = r"example|उदाहरण|मिसाल|मिसाळ|ઉદાહરણ|உதாரண|ఉదాహరణ|উদাহরণ|ಉದಾಹರಣೆ"
REPAYMENT = r"repay|pay (?:it |this )?back|return.*money|लौटान|वापस|चुकान|परत|परतफेड|वापसी|wapas|chukana|પાછ|પરત|திருப்பி|తిరిగి|ফেরত|ಹಿಂದಿರುಗಿ|ಮರುಪಾವತಿ"
FIELD_PATTERNS = {
    "documents": r"document|paperwork|दस्तावेज|कागज|कागदपत्र|દસ્તાવેજ|ஆவண|పత్రా|নথি|কাগজ|ದಾಖಲೆ",
    "application_process": r"apply|application|register|आवेदन|अर्ज|आवेदन|અરજી|விண்ணப்ப|దరఖాస్తు|আবেদন|ಅರ್ಜಿ",
    "eligibility": r"eligib|qualif|पात्र|योग्य|અર્હ|தகுதி|అర్హ|যোগ্য|ಅರ್ಹ",
    "benefits": r"benefit|amount|how much|subsidy|लाभ|राशि|कितना|કેટલ|நன்மை|பயன்|எவ்வளவு|లాభ|ఎంత|সুবিধা|কত|ಪ್ರಯೋಜನ|ಎಷ್ಟು",
}
FOLLOWUP = r"\b(it|this|that|these|those|more|documents?|apply|eligibility|benefits?|example|explain|repay|same)\b|इसके|इसमें|उसके|और बताओ|याबद्दल|આના|இதன்|దీని|এর|ಇದರ"
LANGUAGE_NAMES = {
    "en": r"english|अंग्रेजी|अंग्रेज़ी", "hi": r"hindi|हिंदी|हिन्दी",
    "mr": r"marathi|मराठी", "gu": r"gujarati|ગુજરાતી|गुजराती",
    "ta": r"tamil|தமிழ்|तमिल", "te": r"telugu|తెలుగు|तेलुगु",
    "bn": r"bengali|bangla|বাংলা|बंगाली", "kn": r"kannada|ಕನ್ನಡ|कन्नड़",
}
SCHEME_ALIASES = {
    "pmegp": (r"\bpmegp\b|पीएमईजीपी|प्रधानमंत्री रोजगार सृजन", "prime minister.*employment generation"),
    "mudra": (r"\bmudra\b|मुद्रा|முத்ரா|ముద్ర|মুদ্রা|ಮುದ್ರಾ|મુદ્રા", "pradhan mantri mudra"),
    "standup": (r"stand[ -]?up india|स्टैंड.?अप", "stand[ -]?up india"),
    "vishwakarma": (r"\bvishwakarma\b|विश्वकर्मा", "pm vishwakarma"),
    "svanidhi": (r"\bsvanidhi\b|स्वनिधि", "svanidhi"),
}


def normalize(text):
    return unicodedata.normalize("NFKC", text).casefold().strip()


def topics(text):
    return [topic for topic, pattern in CONCEPTS.items() if re.search(pattern, normalize(text))]


def language_for(message, preferred="en"):
    text = normalize(message)
    # An explicit request such as 'in Hindi' wins over the UI preference.
    for code, pattern in LANGUAGE_NAMES.items():
        if re.search(r"(?:in |speak |reply |answer |explain |translate.*?)(?:" + pattern + r")\b", text) or re.search(
            r"(?:" + pattern + r")(?:\s+(?:mein|me|में|मध्ये|માં|లో|তে|ನಲ್ಲಿ)|\s*$)", text
        ):
            return code
    # A selected Indian language also works for English/transliterated input.
    if preferred in COPY and preferred != "en":
        return preferred
    for code, start, end in [("ta",0x0B80,0x0BFF),("te",0x0C00,0x0C7F),("bn",0x0980,0x09FF),
                             ("gu",0x0A80,0x0AFF),("kn",0x0C80,0x0CFF),("hi",0x0900,0x097F)]:
        if any(start <= ord(c) <= end for c in message):
            if code == "hi" and re.search(r"म्हणजे|आहे|काय|सांगा", text):
                return "mr"
            return code
    if re.search(r"\b(kya|kaise|matlab|batao|samjhao|chahiye|hota|hoti)\b", text):
        return "hi"
    return preferred if preferred in COPY else "en"


def is_language_switch(message):
    text = normalize(message)
    return any(re.search(p, text) for p in LANGUAGE_NAMES.values()) and len(text.split()) <= 5 and not topics(text)


def prior_topic(history):
    for turn in reversed(history[-12:]):
        if turn.get("role") == "user":
            found = topics(turn.get("content", ""))
            if found:
                return found[0]
    return None


def classify(message, history, named_schemes):
    text = normalize(message)
    plain = re.sub(r"[^\w\s]", "", text).strip()
    if text.rstrip("!?.। ") in {"hi", "hello", "hey", "how are you", "who are you", "what can you do", "namaste", "namaskar", "नमस्ते", "नमस्कार", "तुम कौन हो", "आप कौन हैं", "வணக்கம்", "నమస్తే", "নমস্কার", "નમસ્તે", "ನಮಸ್ಕಾರ"}:
        return "greeting", []
    if text.rstrip("!?.। ") in {"thanks", "thank you", "thankyou", "धन्यवाद", "शुक्रिया", "நன்றி", "ధన్యవాదాలు", "ধন্যবাদ", "આભાર", "ಧನ್ಯವಾದಗಳು"}:
        return "thanks", []
    found = topics(text)
    old_topic = prior_topic(history)
    remainder = text
    for pattern in CONCEPTS.values():
        remainder = re.sub(pattern, " ", remainder)
    bare_concepts = not re.sub(r"\b(a|an|the|and|or|vs|versus)\b|[\W_]", "", remainder)

    if not named_schemes:
        if re.search(EXAMPLE, text) and ("subsidy" in found or (not found and old_topic == "subsidy")):
            return "example", ["subsidy"]
        if re.search(REPAYMENT, text) and ("subsidy" in found or (not found and old_topic == "subsidy")):
            return "repayment", ["subsidy"]
        if found and not re.search(DISCOVERY, text) and (re.search(DEFINITION, text) or
                bare_concepts or
                re.search(r"differen|compare|versus|\bvs\b|अंतर|फरक|तुलना|તફાવત|வேறுபாடு|తేడా|পার্থক্য|ವ್ಯತ್ಯಾಸ", text)):
            return "explanation", found
        if not found and old_topic and re.fullmatch(r"(?:please )?(?:explain (?:more|simply|again)|tell me more|more|समझाओ|और बताओ|सरल भाषा में)", plain):
            return "explanation", [old_topic]
    for field, pattern in FIELD_PATTERNS.items():
        if re.search(pattern, text):
            if named_schemes:
                return field, []
            if field in {"documents", "application_process", "eligibility"}:
                return "which_scheme", []
    if named_schemes:
        return "description", []
    if re.search(r"am i eligible|can i get|मेरी पात्रता|क्या मुझे|मुझे मिलेगा", text):
        return "profile", []
    if re.search(DISCOVERY, text) or (len(text.split()) <= 5 and re.search(r"tailor|dairy|agriculture|women entrepreneur|महिला उद्यम|सिलाई", text)):
        return "discovery", []
    return "clarify", []


def local_answer(intent, found, language):
    words = COPY.get(language, COPY["en"])
    if intent == "explanation":
        return "\n\n".join(words[topic] for topic in found)
    return words.get(intent, words["clarify"])


def catalogue_query(message):
    # Query aliases help discovery in local languages; they are not translations
    # of whole questions and must never be presented as such.
    text = normalize(message)
    aliases = {r"महिला|महिलाओं|பெண்கள்|మహిళ|মহিলা|મહિલા|ಮಹಿಳೆ": "women",
               r"सिलाई|தையல்|కుట్టు|সেলাই|સીવણ|ಹೊಲಿಗೆ": "tailoring",
               r"कृषि|शेती|விவசாய|వ్యవసాయ|কৃষি|ખેતી|ಕೃಷಿ": "agriculture",
               CONCEPTS["loan"]: "loan", CONCEPTS["subsidy"]: "subsidy"}
    for pattern, replacement in aliases.items():
        text = re.sub(pattern, " " + replacement + " ", text)
    return text
