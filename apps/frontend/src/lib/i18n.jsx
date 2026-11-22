import categoryStrings from "./locales/categories.js";
import voiceStrings from "./locales/voice.js";
import homeStrings from "./locales/home.js";
import SUPPORT_STRINGS from "./locales/support.js";
import additionalText from "./locales/additional.tsv?raw";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

/* Dependency-free i18n layer. Every string below is keyed once, with a
   translation per language in one place -- add a key here, then wrap the
   matching text in t("key") wherever it's used. Persists to localStorage
   and is also sent to the backend as preferred_language (used for
   Bhashini voice and chatbot replies). */

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी (Hindi)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", label: "മലയാളം (Malayalam)" },
  { code: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "od", label: "ଓଡ଼ିଆ (Odia)" },
  { code: "ur", label: "اردو (Urdu)" },
  { code: "as", label: "অসমীয়া (Assamese)" },
  { code: "kok", label: "कोंकणी (Konkani)" },
  { code: "mai", label: "मैथिली (Maithili)" },
  { code: "ne", label: "नेपाली (Nepali)" },
  { code: "sa", label: "संस्कृत (Sanskrit)" },
  { code: "sd", label: "سنڌي (Sindhi)" },
  { code: "brx", label: "बोड़ो (Bodo)" },
  { code: "doi", label: "डोगरी (Dogri)" },
  { code: "mni", label: "মৈতৈলোন্ (Manipuri)" },
  { code: "sat", label: "ᱥᱟᱱᱛᱟᱲᱤ (Santali)" },
  { code: "ks", label: "کٲشُر (Kashmiri)" },
];

const STORAGE_KEY = "schemeSaathiLanguage";

/* key -> { en, hi, mr, gu, ta, te, bn, kn } */
const STRINGS = {
  // Navigation
  "Almost there! A few more details": { en: "Almost there! A few more details", hi: "बस थोड़ा और!" },
  "Update your information below.": { en: "Update your information below.", hi: "नीचे अपनी जानकारी अपडेट करें।" },
  "Annual family income in rupees (optional)": { en: "Annual family income in rupees (optional)", hi: "वार्षिक परिवार आय रुपये में (वैकल्पिक)" },
  "For example: 120000": { en: "For example: 120000", hi: "उदाहरण: 120000" },
  "Leave blank if unknown. An income range may require further information.": { en: "Leave blank if unknown. An income range may require further information.", hi: "अगर पता नहीं है तो खाली छोड़ दें। आय सीमा के लिए अतिरिक्त जानकारी चाहिए हो सकती है।" },
  "Registered Business?": { en: "Registered Business?", hi: "क्या व्यवसाय पंजीकृत है?" },
  "Funding Required": { en: "Funding Required", hi: "आवश्यक वित्तपोषण" },
  "Select Amount Range": { en: "Select Amount Range", hi: "राशि सीमा चुनें" },
  "Preferred Support": { en: "Preferred Support", hi: "पसंदीदा सहायता" },
  "Loan / Subsidy / Grant": { en: "Loan / Subsidy / Grant", hi: "ऋण / सब्सिडी / अनुदान" },
  "Loan": { en: "Loan", hi: "ऋण" },
  "Subsidy": { en: "Subsidy", hi: "सब्सिडी" },
  "Grant": { en: "Grant", hi: "अनुदान" },
  "Not sure yet": { en: "Not sure yet", hi: "अभी निश्चित नहीं" },
  "Yes / No": { en: "Yes / No", hi: "हाँ / नहीं" },
  "Previous government scheme?": { en: "Previous government scheme?", hi: "क्या पहले कोई सरकारी योजना ली है?" },
  "Interested Scheme Type": { en: "Interested Scheme Type", hi: "रुचि रखने वाली योजना का प्रकार" },
  "Select Type": { en: "Select Type", hi: "प्रकार चुनें" },
  "Healthcare": { en: "Healthcare", hi: "स्वास्थ्य सेवा" },
  "Agriculture": { en: "Agriculture", hi: "कृषि" },
  "Pension": { en: "Pension", hi: "पेंशन" },
  "Housing": { en: "Housing", hi: "आवास" },
  "Employment": { en: "Employment", hi: "रोजगार" },
  "Women and family support": { en: "Women and family support", hi: "महिला और परिवार सहायता" },
  "Disability support": { en: "Disability support", hi: "दिव्यांगजन सहायता" },
  "Financial Assistance": { en: "Financial Assistance", hi: "वित्तीय सहायता" },
  "Business Loan": { en: "Business Loan", hi: "व्यवसाय ऋण" },
  "Training": { en: "Training", hi: "प्रशिक्षण" },
  "Skill Development": { en: "Skill Development", hi: "कौशल विकास" },
  "Marketing Support": { en: "Marketing Support", hi: "विपणन सहायता" },
  "Infrastructure Support": { en: "Infrastructure Support", hi: "बुनियादी ढाँचा सहायता" },
  "Please verify your details before finding matching schemes.": { en: "Please verify your details before finding matching schemes.", hi: "मेल खाती योजनाएं खोजने से पहले अपनी जानकारी जांचें।" },
  "Personal Information": { en: "Personal Information", hi: "व्यक्तिगत जानकारी" },
  "Name": { en: "Name", hi: "नाम" },
  "Mobile Number": { en: "Mobile Number", hi: "मोबाइल नंबर" },
  "Annual Income": { en: "Annual Income", hi: "वार्षिक आय" },
  "Previous Government Scheme": { en: "Previous Government Scheme", hi: "पिछली सरकारी योजना" },
  "Entrepreneurship support": { en: "Entrepreneurship support", hi: "उद्यमिता सहायता" },
  "Registered Business": { en: "Registered Business", hi: "पंजीकृत व्यवसाय" },
  "Funding Required": { en: "Funding Required", hi: "आवश्यक वित्तपोषण" },
  "Annual Turnover": { en: "Annual Turnover", hi: "वार्षिक टर्नओवर" },
  "Uttar Pradesh": { en: "Uttar Pradesh", hi: "उत्तर प्रदेश" },
  "Name": { en: "Name", hi: "नाम", gu: "નામ", ta: "பெயர்", te: "పేరు", bn: "নাম", mr: "नाव", kn: "ಹೆಸರು", ml: "പേര്", pa: "ਨਾਮ", or: "ନାମ", ur: "نام" },
  "Mobile Number": { en: "Mobile Number", hi: "मोबाइल नंबर", gu: "મોબાઇલ નંબર", ta: "கைபேசி எண்", te: "మొబైల్ నంబర్", bn: "মোবাইল নম্বর", mr: "मोबाइल नंबर", kn: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ", ml: "മൊബൈൽ നമ്പർ", pa: "ਮੋਬਾਈਲ ਨੰਬਰ", or: "ମୋବାଇଲ୍ ନମ୍ବର", ur: "موبائل نمبر" },
  "Education": { en: "Education", hi: "शिक्षा", gu: "શિક્ષણ", ta: "கல்வி", te: "విద్య", bn: "শিক্ষা", mr: "शिक्षण", kn: "ಶಿಕ್ಷಣ", ml: "വിദ്യാഭ്യാസം", pa: "ਸਿੱਖਿਆ", or: "ଶିକ୍ଷା", ur: "تعلیم" },
  "Occupation": { en: "Occupation", hi: "व्यवसाय", gu: "વ્યવસાય", ta: "தொழில்", te: "వృత్తి", bn: "পেশা", mr: "व्यवसाय", kn: "ಉದ್ಯೋಗ", ml: "തൊഴിൽ", pa: "ਕਿੱਤਾ", or: "ବୃତ୍ତି", ur: "پیشہ" },
  "Interests": { en: "Interests", hi: "रुचियां", gu: "રસ", ta: "ஆர்வங்கள்", te: "ఆసక్తులు", bn: "আগ্রহ", mr: "आवडी", kn: "ಆಸಕ್ತಿಗಳು", ml: "താൽപര്യങ്ങൾ", pa: "ਰੁਚੀਆਂ", or: "ଆଗ୍ରହ", ur: "دلچسپیاں" },
  "Welfare needs": { en: "Welfare needs", hi: "कल्याण संबंधी जरूरतें", gu: "કલ્યાણ જરૂરિયાતો", ta: "பொது நல தேவைகள்", te: "సంక్షేమ అవసరాలు", bn: "কল্যাণ চাহিদা", mr: "कल्याण गरजा", kn: "ಸಾಮಾಜಿಕ ಕಲ್ಯಾಣ ಅಗತ್ಯಗಳು", ml: "സാമൂഹിക ക്ഷേമ ആവശ്യങ്ങൾ", pa: "ਕਲਿਆਣ ਲੋੜਾਂ", or: "କଲ୍ୟାଣ ଆବଶ୍ୟକତା", ur: "فلاحی ضروریات" },
  "Graduate": { en: "Graduate", hi: "स्नातक", gu: "સ્નાતક", ta: "பட்டதாரி", te: "గ్రాడ్యుయేట్", bn: "স্নাতক", mr: "पदवीधर", kn: "ಪದವಿ", ml: "ബിരുദധാരി", pa: "ਗ੍ਰੈਜੂਏਟ", or: "ସ୍ନାତକ", ur: "گریجویٹ" },
  "Student": { en: "Student", hi: "छात्र", gu: "વિદ્યાર્થી", ta: "மாணவர்", te: "విద్యార్థి", bn: "ছাত্র", mr: "विद्यार्थी", kn: "ವಿದ್ಯಾರ್ಥಿ", ml: "വിദ്യാർത്ഥി", pa: "ਵਿਦਿਆਰਥੀ", or: "ଛାତ୍ର", ur: "طالب علم" },
  "Not provided": { en: "Not provided", hi: "उपलब्ध नहीं", gu: "ઉપલબ્ધ નથી", ta: "வழங்கப்படவில்லை", te: "అందించబడలేదు", bn: "প্রদান করা হয়নি", mr: "दिलेले नाही", kn: "ನೀಡಲಾಗಿಲ್ಲ", ml: "നല്കിയിട്ടില്ല", pa: "ਦਿੱਤਾ ਨਹੀਂ", or: "ଦିଆଯାଇନାହିଁ", ur: "فراہم نہیں کیا گیا" },
  "MATCHED SCHEMES": { en: "MATCHED SCHEMES", hi: "मेल खाती योजनाएं" },
  "SchemeSaathi •": { en: "SchemeSaathi •", hi: "स्कीमसाथी •", gu: "SchemeSaathi •", ta: "SchemeSaathi •", te: "SchemeSaathi •", bn: "SchemeSaathi •", mr: "SchemeSaathi •", kn: "SchemeSaathi •", ml: "SchemeSaathi •", pa: "SchemeSaathi •", or: "SchemeSaathi •", ur: "SchemeSaathi •" },
  "Your application profile": { en: "Your application profile", hi: "आपकी आवेदन प्रोफ़ाइल" },
  "Personal": { en: "Personal", hi: "व्यक्तिगत" },
  "Business": { en: "Business", hi: "व्यवसाय" },
  "Other": { en: "Other", hi: "अन्य" },
  "Search schemes...": { en: "Search schemes...", hi: "योजनाएं खोजें..." },
  "Preliminary screening only. Verify all conditions and current availability on the official portal.": { en: "Preliminary screening only. Verify all conditions and current availability on the official portal.", hi: "केवल प्रारंभिक जांच। आधिकारिक पोर्टल पर सभी शर्तें और वर्तमान उपलब्धता सत्यापित करें।" },
  "More information needed": { en: "More information needed", hi: "अधिक जानकारी चाहिए" },
  "Recorded criteria met": { en: "Recorded criteria met", hi: "दर्ज शर्तें पूरी हुईं" },
  "Preliminary screening": { en: "Preliminary screening", hi: "प्रारंभिक स्क्रीनिंग" },
  "Information needed": { en: "Information needed", hi: "जानकारी चाहिए" },
  "Benefits": { en: "Benefits", hi: "लाभ" },
  "✓ Why this was suggested": { en: "✓ Why this was suggested", hi: "✓ यह क्यों सुझाया गया" },
  "How to apply": { en: "How to apply", hi: "कैसे आवेदन करें" },
  "View Connected Schemes (Neo4j Graph)": { en: "View Connected Schemes (Neo4j Graph)", hi: "जुड़ी योजनाएं देखें (Neo4j ग्राफ)" },
  "Hide Graph Connections": { en: "Hide Graph Connections", hi: "ग्राफ संबंध छिपाएं" },
  "Visit Official Scheme Page ↗": { en: "Visit Official Scheme Page ↗", hi: "आधिकारिक योजना पेज देखें ↗" },
  "Neo4j Graph Connections:": { en: "Neo4j Graph Connections:", hi: "Neo4j ग्राफ संबंध:" },
  "Open Full Graph ↗": { en: "Open Full Graph ↗", hi: "पूरा ग्राफ खोलें ↗" },
  "Finding graph relationships...": { en: "Finding graph relationships...", hi: "ग्राफ संबंध खोजे जा रहे हैं..." },
  "No other active schemes currently linked in this category.": { en: "No other active schemes currently linked in this category.", hi: "इस श्रेणी में अभी कोई अन्य सक्रिय योजना जुड़ी नहीं है।" },
  "Please provide your basic information to find suitable government schemes.": { en: "Please provide your basic information to find suitable government schemes.", hi: "सही सरकारी योजनाएं खोजने के लिए अपनी बुनियादी जानकारी दें।" },
  "Update your information and continue.": { en: "Update your information and continue.", hi: "अपनी जानकारी अपडेट करें और आगे बढ़ें।" },
  "Full Name": { en: "Full Name", hi: "पूरा नाम" },
  "Enter your full name": { en: "Enter your full name", hi: "अपना पूरा नाम लिखें" },
  "Mobile Number (optional)": { en: "Mobile Number (optional)", hi: "मोबाइल नंबर (वैकल्पिक)" },
  "10-digit mobile number": { en: "10-digit mobile number", hi: "10-अंकों का मोबाइल नंबर" },
  "Age": { en: "Age", hi: "आयु" },
  "Enter age": { en: "Enter age", hi: "आयु लिखें" },
  "Gender": { en: "Gender", hi: "लिंग" },
  "Select Gender": { en: "Select Gender", hi: "लिंग चुनें" },
  "Male": { en: "Male", hi: "पुरुष" },
  "Female": { en: "Female", hi: "महिला" },
  "Other": { en: "Other", hi: "अन्य" },
  "Prefer not to say": { en: "Prefer not to say", hi: "बताना नहीं चाहते" },
  "Social Category": { en: "Social Category", hi: "सामाजिक श्रेणी" },
  "Select Category": { en: "Select Category", hi: "श्रेणी चुनें" },
  "OBC": { en: "OBC", hi: "ओबीसी" },
  "Minority": { en: "Minority", hi: "अल्पसंख्यक" },
  "General": { en: "General", hi: "सामान्य" },
  "Disability": { en: "Disability", hi: "दिव्यांगता" },
  "Residence": { en: "Residence", hi: "निवास क्षेत्र" },
  "Not provided": { en: "Not provided", hi: "उपलब्ध नहीं" },
  "Urban": { en: "Urban", hi: "शहरी" },
  "Rural": { en: "Rural", hi: "ग्रामीण" },
  "No": { en: "No", hi: "नहीं" },
  "Yes": { en: "Yes", hi: "हाँ" },
  "State": { en: "State", hi: "राज्य" },
  "Select State": { en: "Select State", hi: "राज्य चुनें" },
  "District": { en: "District", hi: "जिला" },
  "Select your district": { en: "Select your district", hi: "अपना जिला चुनें" },
  "Select a state first": { en: "Select a state first", hi: "पहले राज्य चुनें" },
  "Education": { en: "Education", hi: "शिक्षा" },
  "Occupation": { en: "Occupation", hi: "व्यवसाय" },
  "Interests (optional)": { en: "Interests (optional)", hi: "रुचियां (वैकल्पिक)" },
  "For example: education, healthcare, agriculture": { en: "For example: education, healthcare, agriculture", hi: "उदाहरण: शिक्षा, स्वास्थ्य सेवा, कृषि" },
  "Welfare needs (optional)": { en: "Welfare needs (optional)", hi: "कल्याण संबंधी जरूरतें (वैकल्पिक)" },
  "For example: housing, pension, disability support": { en: "For example: housing, pension, disability support", hi: "उदाहरण: आवास, पेंशन, दिव्यांगजन सहायता" },
  "Do you want entrepreneurship support?": { en: "Do you want entrepreneurship support?", hi: "क्या आपको उद्यमिता सहायता चाहिए?" },
  "Not sure / not provided": { en: "Not sure / not provided", hi: "पता नहीं / उपलब्ध नहीं" },
  "Saving your details?": { en: "Saving your details?", hi: "आपकी जानकारी सहेजी जा रही है?" },
  "Why we ask this?": {
    en: "Why we ask this?",
    hi: "हम यह क्यों पूछते हैं?",
    gu: "અમે આ શા માટે પૂછીએ છીએ?",
    mr: "आम्ही हे का विचारतो?",
    bn: "আমরা এটি কেন জিজ্ঞাসা করি?",
    ta: "நாங்கள் இதை ஏன் கேட்கிறோம்?",
    te: "మేము దీన్ని ఎందుకు అడుగుతున్నాము?",
    kn: "ನಾವು ಇದನ್ನು ಏಕೆ ಕೇಳುತ್ತೇವೆ?",
    ml: "ഞങ്ങൾ ഇതെന്തിനാണ് ചോദിക്കുന്നത്?",
    pa: "ਅਸੀਂ ਇਹ ਕਿਉਂ ਪੁੱਛਦੇ ਹਾਂ?",
    od: "ଆମେ ଏହା କାହିଁକି ପଚାରୁଛୁ?",
    ur: "ہم یہ کیوں پوچھتے ہیں؟"
  },
  "Better scheme matches": {
    en: "Better scheme matches",
    hi: "बेहतर योजना मेल",
    gu: "વધુ સારા યોજના મેળ",
    mr: "उत्तम योजना जुळणी",
    bn: "উন্নত প্রকল্প মেলানো",
    ta: "சிறந்த திட்ட பொருத்தங்கள்",
    te: "మెరుగైన పథకాల సరిపోలిక",
    kn: "ಉತ್ತಮ ಯೋಜನೆ ಹೊಂದಾಣಿಕೆಗಳು",
    ml: "മെച്ചപ്പെട്ട പദ്ധതി പൊരുത്തങ്ങൾ",
    pa: "ਬਿਹਤਰ ਯੋਜਨਾ ਮੇਲ",
    od: "ଉନ୍ନତ ଯୋଜନା ମେଳ",
    ur: "بہتر اسکیم میچز"
  },
  "Relevant benefits": {
    en: "Relevant benefits",
    hi: "प्रासंगिक लाभ",
    gu: "સંબંધિત લાભો",
    mr: "संबंधित फायदे",
    bn: "প্রাসঙ্গিক সুবিধা",
    ta: "பொருத்தமான நன்மைகள்",
    te: "సంబంధిత ప్రయోజనాలు",
    kn: "ಸಂಬಂಧಿತ ಪ್ರಯೋಜನಗಳು",
    ml: "പ്രസക്തമായ ആനുകൂല്യങ്ങൾ",
    pa: "ਸੰਬੰਧਿਤ ਲਾਭ",
    od: "ପ୍ରାସଙ୍ଗିକ ଲାଭ",
    ur: "متعلقہ فوائد"
  },
  "Save time & effort": {
    en: "Save time & effort",
    hi: "समय और प्रयास बचाएं",
    gu: "સમય અને શ્રમ બચાવો",
    mr: "वेळ आणि श्रम वाचवा",
    bn: "সময় ও পরিশ্রম বাঁচান",
    ta: "நேரம் மற்றும் முயற்சியைச் சேமிக்கவும்",
    te: "సమయం మరియు శ్రమను ఆదా చేసుకోండి",
    kn: "ಸಮಯ ಮತ್ತು ಶ್ರಮವನ್ನು ಉಳಿಸಿ",
    ml: "സമയവും അധ്വാനവും ലാഭിക്കുക",
    pa: "ਸਮਾਂ ਅਤੇ ਮਿਹਨਤ ਬਚਾਓ",
    od: "ସମୟ ଏବଂ ପରିଶ୍ରମ ବଞ୍ଚାନ୍ତୁ",
    ur: "وقت اور محنت بچائیں"
  },
  "Trusted recommendations": {
    en: "Trusted recommendations",
    hi: "विश्वसनीय सुझाव",
    gu: "વિશ્વસનીય ભલામણો",
    mr: "विश्वसनीय शिफारसी",
    bn: "নির্ভরযোগ্য সুপারিশ",
    ta: "நம்பகமான பரிந்துரைகள்",
    te: "విశ్వసనీయ సిఫార్సులు",
    kn: "ವಿಶ್ವಾಸಾರ್ಹ ಶಿಫಾರಸುಗಳು",
    ml: "വിശ്വസനീയമായ ശുപാർശകൾ",
    pa: "ਭਰੋਸੇਯੋਗ ਸਿਫਾਰਸ਼ਾਂ",
    od: "ବିଶ୍ୱାସନୀୟ ସୁପାରିଶ",
    ur: "قابل اعتماد تجاویز"
  },
  "No formal education": { en: "No formal education", hi: "कोई औपचारिक शिक्षा नहीं" },
  "Primary": { en: "Primary", hi: "प्राथमिक" },
  "Secondary": { en: "Secondary", hi: "माध्यमिक" },
  "Higher secondary": { en: "Higher secondary", hi: "उच्च माध्यमिक" },
  "Diploma": { en: "Diploma", hi: "डिप्लोमा" },
  "Graduate": { en: "Graduate", hi: "स्नातक" },
  "Postgraduate": { en: "Postgraduate", hi: "स्नातकोत्तर" },
  "Student": { en: "Student", hi: "छात्र" },
  "Farmer": { en: "Farmer", hi: "किसान" },
  "Agricultural worker": { en: "Agricultural worker", hi: "कृषि श्रमिक" },
  "Employed": { en: "Employed", hi: "कार्यरत" },
  "Unemployed": { en: "Unemployed", hi: "बेरोजगार" },
  "Homemaker": { en: "Homemaker", hi: "गृहणी" },
  "Self-employed": { en: "Self-employed", hi: "स्व-रोजगार" },
  "Retired": { en: "Retired", hi: "सेवानिवृत्त" },
  "Grants and subsidies": { en: "Grants and subsidies", hi: "अनुदान और सब्सिडी", mr: "अनुदाने आणि अनुदान", gu: "ગ્રાન્ટ અને સબસિડી", ta: "மானியங்கள் மற்றும் உதவித்தொகைகள்", te: "గ్రాంట్లు మరియు సబ్సిడీలు", bn: "অনুদান এবং ভর্তুকি", kn: "ಅನುದಾನ ಮತ್ತು ಸಬ್ಸಿಡಿಗಳು", ml: "ഗ്രാന്റുകളും സബ്സിഡികളും", pa: "ਗ੍ਰਾਂਟਾਂ ਅਤੇ ਸਬਸਿਡੀਆਂ", or: "অনुदান ও ସବସିଡି", ur: "گرانٹس اور سبسڈی" },
  "Skills and training": { en: "Skills and training", hi: "कौशल और प्रशिक्षण", mr: " कौशल्य आणि प्रशिक्षण", gu: "કુશળતા અને પ્રશિક્ષણ", ta: "திறன்கள் மற்றும் பயிற்சி", te: "నైపుణ్యాలు మరియు శిక్షణ", bn: "দক্ষতা এবং প্রশিক্ষণ", kn: "ಕೌಶಲ್ಯ ಮತ್ತು ತರಬೇತಿ", ml: "കൗശലവും പരിശീലനവും", pa: "ਹੁਨਰ ਅਤੇ ਸਿਖਲਾਈ", or: "ଦକ୍ଷତା ଏବଂ ପ୍ରଶିକ୍ଷଣ", ur: "مہارت اور تربیت" },
  "Artisan support": { en: "Artisan support", hi: "कारीगर सहायता", mr: "कारागीर समर्थन", gu: "કારીગર સહાય", ta: "கைவினைஞர் ஆதரவு", te: "కళాకారులకు సహాయం", bn: "কারিগর সহায়তা", kn: "ಕರಕುಶಲಗಾರರ ಬೆಂಬಲ", ml: "കരകൗശല ശിൽപികൾക്ക് പിന്തുണ", pa: "ਕਾਰੀਗਰ ਸਹਾਇਤਾ", or: "କାରିଗର ସହାୟତା", ur: "کاریگروں کی مدد" },
  "Marketing and technology": { en: "Marketing and technology", hi: "मार्केटिंग और प्रौद्योगिकी", mr: "मार्केटिंग आणि तंत्रज्ञान", gu: "માર્કેટિંગ અને ટેકનોલોજી", ta: "சந்தைப்படுத்தல் மற்றும் தொழில்நுட்பம்", te: "मार్కెటింగ్ మరియు సాంకేతికత", bn: "বিপণন ও প্রযুক্তি", kn: "ಮಾರುಕಟ್ಟೆ ಮತ್ತು ತಂತ್ರಜ್ಞಾನ", ml: "マーケറ്റിംഗും സാങ്കേതികവിദ്യയും", pa: "ਮਾਰਕੀਟਿੰਗ ਅਤੇ ਤਕਨਾਲੋਜੀ", or: "ବଜାରଯୋଜନା ଏବଂ ପ୍ରଯୁକ୍ତି", ur: "مارکیٹنگ اور ٹیکنالوجی" },
  "Loans and credit": { en: "Loans and credit", hi: "ऋण और उधार", mr: "कर्ज आणि क्रेडिट", gu: "લોન અને ક્રેડિટ", ta: "கடன்கள் மற்றும் வரவு", te: "రుణాలు మరియు అప్పులు", bn: "ঋণ এবং ক্রেডিট", kn: "ಸಾಲಗಳು ಮತ್ತು ಕ್ರೆಡಿಟ್", ml: "കടവും ക്രെഡിറ്റും", pa: "ਲੋਨ ਅਤੇ ਕ੍ਰੈਡਿਟ", or: "ଋଣ ଏବଂ ଶ୍ରେଣୀ", ur: "قرض اور کریڈٹ" },
  "Employment and livelihoods": { en: "Employment and livelihoods", hi: "रोजगार और आजीविका", mr: "रोजगार आणि उदरनिर्वाह", gu: "રોજગાર અને જીવનোপાય", ta: "வேலைவாய்ப்பு மற்றும் வாழ்வாதாரம்", te: "ఉపాధి మరియు జీవనం", bn: "কর্মসংস্থান ও জীবিকা", kn: "ಉದ್ಯೋಗ ಮತ್ತು ಜೀವನೋಪಾಯ", ml: "തൊഴിലും ഉപജീവനവും", pa: "ਰੁਜ਼ਗਾਰ ਅਤੇ ਰੋਜ਼ੀ-ਰੋਟੀ", or: "ରୋଜଗାର ଏବଂ ଜୀବିକା", ur: "روزگار اور معاش" },
  "Education and scholarships": { en: "Education and scholarships", hi: "शिक्षा और छात्रवृत्ति", mr: "शिक्षण आणि शिष्यवृत्ती", gu: "શિક્ષણ અને વિદ્યાર્થીઓ", ta: "கல்வி மற்றும் உதவித்தொகைகள்", te: "విద్య మరియు స్కాలర్‌షిప్‌లు", bn: "শিক্ষা ও বৃত্তি", kn: "ಶಿಕ್ಷಣ ಮತ್ತು ವಿದ್ಯಾರ್ಥಿವೇತನ", ml: "വിദ്യാഭ്യാസവും സ്കോളർഷിപ്പുകളും", pa: "ਸਿੱਖਿਆ ਅਤੇ ਸਕਾਲਰਸ਼ਿਪ", or: "ଶିକ୍ଷା ଏବଂ ବୃତ୍ତି", ur: "تعلیم اور اسکالرشپس" },
  "Health and social support": { en: "Health and social support", hi: "स्वास्थ्य और सामाजिक सहायता", mr: "आरोग्य आणि सामाजिक सहाय्य", gu: "સ્વાસ્થ્ય અને સામાજિક સહાય", ta: "சுகாதாரம் மற்றும் சமூக ஆதரவு", te: "ఆరోగ్యం మరియు సామాజిక సహాయం", bn: "স্বাস্থ্য ও সামাজিক সহায়তা", kn: "ಆರೋಗ್ಯ ಮತ್ತು ಸಾಮಾಜಿಕ ಬೆಂಬಲ", ml: "ആരോഗ്യവും സാമൂഹിക പിന്തുണയും", pa: "ਸਿਹਤ ਅਤੇ ਸਮਾਜਿਕ ਸਹਾਇਤਾ", or: "ସ୍ୱାସ୍ଥ୍ୟ ଏବଂ ସାମାଜିକ ସହାୟତା", ur: "صحت اور سماجی مدد" },
  "ARTISAN SUPPORT": { en: "Artisan Support", hi: "कारीगर सहायता", mr: "कारागीर समर्थन", gu: "કારીગર સહાય", ta: "கைவினைஞர் ஆதரவு", te: "కళాకారులకు సహాయం", bn: "কারিগর সহায়তা", kn: "ಕರಕುಶಲಗಾರರ ಬೆಂಬಲ", ml: "കരകൗശല ശിൽപികൾക്ക് പിന്തുണ", pa: "ਕਾਰੀਗਰ ਸਹਾਇਤਾ", or: "କାରିଗର ସହାୟତା", ur: "کاریگروں کی مدد" },
  "ENTREPRENEURSHIP": { en: "Entrepreneurship", hi: "उद्यमिता", mr: "उद्योजकता", gu: "ઉદ્યમિતા", ta: "தொழில் முனைவோர்", te: "ఉద్యమశీలత", bn: "উদ্যোক্তা", kn: "ಉದಯೋಕ್ತೆ", ml: "വ്യാപാര സംരംഭനം", pa: "ਉਦਯੋਗਪਤ", or: "ଉଦ୍ୟୋଗପତିତ୍ୱ", ur: "کاروباری قیادت" },
  "SKILL DEVELOPMENT": { en: "Skill Development", hi: "कौशल विकास", mr: " कौशल्य विकास", gu: "કુશળતા વિકાસ", ta: "திறன் மேம்பாடு", te: "నైపుణ్య అభివృద్ధి", bn: "দক্ষতা উন্নয়ন", kn: "ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ", ml: "കൗശല വികസനം", pa: "ਹੁਨਰ ਵਿਕਾਸ", or: "ଦକ୍ଷତା ବିକାଶ", ur: "ہنر کی ترقی" },
  "Guidance reviewed": { en: "Guidance reviewed", hi: "मार्गदर्शन समीक्षित", mr: "मार्गदर्शन पुनरावलोकन केले", gu: "માર્ગદર્શનની સમીક્ષા", ta: "வழிகாட்டுதல் மதிப்பாய்வு செய்யப்பட்டது", te: "మార్గదర్శకం సమీక్షించబడింది", bn: "নির্দেশিকা পর্যালোচনা করা হয়েছে", kn: "ಮಾರ್ಗದರ್ಶನ ಪರಿಶೀಲಿಸಲಾಗಿದೆ", ml: "വഴികാട്ടൽ പരിശോധിച്ചു", pa: "ਮਾਰਗਦਰਸ਼ਨ ਦੀ ਸਮੀਖਿਆ", or: "ମାର୍ଗଦର୍ଶନ ସମୀକ୍ଷା", ur: "رہنمائی کا جائزہ لیا گیا" },
  "Browse all schemes": { en: "Browse all schemes", hi: "सभी योजनाएं देखें", mr: "सर्व योजना ब्राउझ करा", gu: "બધી યોજનાઓ જુઓ", ta: "அனைத்து திட்டங்களையும் பார்க்கவும்", te: "అన్ని పథకాలను చూడండి", bn: "সব প্রকল্প দেখুন", kn: "ಎಲ್ಲಾ ಯೋಜನೆಗಳನ್ನು ನೋಡಿ", ml: "എല്ലാ പദ്ധതികളും കാണുക", pa: "ਸਾਰੀਆਂ ਯੋਜਨਾਵਾਂ ਵੇਖੋ", or: "ସମସ୍ତ ଯୋଜନା ଦେଖନ୍ତୁ", ur: "تمام اسکیمیں دیکھیں" },
  "Basic profile details used for relevant eligibility screening.": {
    en: "Basic profile details used for relevant eligibility screening.",
    hi: "संबंधित पात्रता जांच के लिए बुनियादी प्रोफ़ाइल विवरण।",
    gu: "પાત્રતા ચકાસણી માટે મૂળભૂત પ્રોફાઇલ વિગતોનો ઉપયોગ થાય છે.",
    mr: "पात्रता तपासणीसाठी मूलभूत प्रोफाइल तपशीलांचा वापर केला जातो.",
    bn: "যোগ্যতা যাচাইয়ের জন্য প্রাথমিক প্রোফাইলের বিবরণ ব্যবহার করা হয়।",
    ta: "தகுதி சரிபார்ப்பிற்கு அடிப்படை சுயவிவர விவரங்கள் பயன்படுத்தப்படுகின்றன.",
    te: "అర్హత పరిశీలనకు ప్రాథమిక ప్రొఫైల్ వివరాలు ఉపయోగించబడతాయి.",
    kn: "ಅರ್ಹತಾ ಪರಿಶೀಲನೆಗೆ ಮೂಲ ಪ್ರೊಫೈಲ್ ವಿವರಗಳನ್ನು ಬಳಸಲಾಗುತ್ತದೆ.",
    ml: "യോഗ്യതാ പരിശോധനയ്ക്കായി അടിസ്ഥാന പ്രൊഫൈൽ വിവരങ്ങൾ ഉപയോഗിക്കുന്നു.",
    pa: "ਯੋਗਤਾ ਦੀ ਜਾਂਚ ਲਈ ਬੁਨਿਆਦੀ ਪ੍ਰੋਫਾਈਲ ਵੇਰਵੇ ਵਰਤੇ ਜਾਂਦੇ ਹਨ।",
    od: "ଯୋଗ୍ୟତା ଯାଞ୍ଚ ପାଇଁ ମୌଳିକ ପ୍ରୋଫାଇଲ୍ ବିବରଣୀ ବ୍ୟବହୃତ ହୁଏ।"
  },
  "Support needs": {
    en: "Support needs",
    hi: "सहायता की ज़रूरतें",
    gu: "સહાયની જરૂરિયાતો",
    mr: "सहाय्याची गरज",
    bn: "সহায়তার প্রয়োজন",
    ta: "ஆதரவு தேவைகள்",
    te: "మద్దతు అవసరాలు",
    kn: "ಬೆಂಬಲದ ಅಗತ್ಯಗಳು",
    ml: "പിന്തുണ ആവശ്യങ്ങൾ",
    pa: "ਸਹਾਇਤਾ ਦੀਆਂ ਲੋੜਾਂ",
    od: "ସହାୟତା ଆବଶ୍ୟକତା"
  },
  "Education, occupation, interests and welfare needs help refine scheme suggestions. Business questions appear when you request entrepreneurship support.": {
    en: "Education, occupation, interests and welfare needs help refine scheme suggestions. Business questions appear when you request entrepreneurship support.",
    hi: "शिक्षा, व्यवसाय, रुचियां और कल्याण संबंधी जरूरतें योजना सुझाव बेहतर बनाने में मदद करती हैं। उद्यमिता सहायता चुनने पर व्यवसाय संबंधी प्रश्न दिखेंगे।",
    gu: "શિક્ષણ, વ્યવસાય, રસ અને કલ્યાણની જરૂરિયાતો યોજનાના સૂચનોને વધુ ચોક્કસ બનાવે છે. જ્યારે તમે ઉદ્યોગસાહસિકતા સહાય પસંદ કરો છો ત્યારે વ્યવસાયિક પ્રશ્નો દેખાય છે.",
    mr: "शिक्षण, व्यवसाय, आवडी आणि कल्याणकारी गरजा योजनांच्या सूचना सुधारण्यास मदत करतात. आपण उद्योजकता समर्थन निवडल्यास व्यवसाय प्रश्न दिसतात.",
    bn: "শিক্ষা, পেশা, আগ্রহ এবং কল্যাণের চাহিদা প্রকল্পের পরামর্শ উন্নত করতে সাহায্য করে।",
    ta: "கல்வி, தொழில், ஆர்வங்கள் மற்றும் நலத்தேவைகள் திட்ட பரிந்துரைகளைச் செம்மைப்படுத்த உதவுகின்றன.",
    te: "విద్య, వృత్తి, ఆసక్తులు మరియు సంక్షేమ అవసరాలు పథక సూచనలను మెరుగుపరచడంలో సహాయపడతాయి.",
    kn: "ಶಿಕ್ಷಣ, ಉದ್ಯೋಗ, ಆಸಕ್ತಿಗಳು ಮತ್ತು ಕಲ್ಯಾಣ ಅಗತ್ಯಗಳು ಯೋಜನೆ ಸಲಹೆಗಳನ್ನು ಪರಿಷ್ಕರಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತವೆ.",
    ml: "വിദ്യാഭ്യാസം, തൊഴിൽ, താൽപ്പര്യങ്ങൾ, ക്ഷേമ ആവശ്യങ്ങൾ എന്നിവ പദ്ധതി നിർദ്ദേശങ്ങൾ മെച്ചപ്പെടുത്താൻ സഹായിക്കുന്നു.",
    pa: "ਸਿੱਖਿਆ, ਕਿੱਤਾ, ਰੁਚੀਆਂ ਅਤੇ ਭਲਾਈ ਲੋੜਾਂ ਯੋਜਨਾ ਦੇ ਸੁਝਾਵਾਂ ਨੂੰ ਬਿਹਤਰ ਬਣਾਉਣ ਵਿੱਚ ਮਦਦ ਕਰਦੀਆਂ ਹਨ।",
    od: "ଶିକ୍ଷା, ବୃତ୍ତି, ଆଗ୍ରହ ଏବଂ କଲ୍ୟାଣ ଆବଶ୍ୟକତା ଯୋଜନା ସୁପାରିଶକୁ ଉନ୍ନତ କରିବାରେ ସାହାଯ୍ୟ କରେ।"
  },
  "Additional financial/requirement information improves relevance.": {
    en: "Additional financial/requirement information improves relevance.",
    hi: "अतिरिक्त वित्तीय और आवश्यक जानकारी प्रासंगिकता बढ़ाती है।",
    gu: "વધારાની નાણાકીય/જરૂરિયાત માહિતી યોજનાઓની સુસંગતતા વધારે છે.",
    mr: "अतिरिक्त आर्थिक/आवश्यक माहिती प्रासंगिकता वाढवते.",
    bn: "অতিরিক্ত আর্থিক/প্রয়োজনীয় তথ্য প্রাসঙ্গিকতা বৃদ্ধি করে।",
    ta: "கூடுதல் நிதி/தேவை தகவல்கள் பொருத்தத்தை மேம்படுத்துகின்றன.",
    te: "అదనపు ఆర్థిక/అవసరాల సమాచారం సరిపోలికను మెరుగుపరుస్తుంది.",
    kn: "ಹೆಚ್ಚುವರಿ ಆರ್ಥಿಕ/ಅಗತ್ಯ ಮಾಹಿತಿಯು ಪ್ರಸ್ತುತತೆಯನ್ನು ಸುಧಾರಿಸುತ್ತದೆ.",
    ml: "കൂടുതൽ സാമ്പത്തിക വിവരങ്ങൾ ಪ್ರಸಕ್ತಿ വർദ്ധിപ്പിക്കുന്നു.",
    pa: "ਵਾਧੂ ਵਿੱਤੀ/ਲੋੜ ਦੀ ਜਾਣਕਾਰੀ ਸਾਰਥਕਤਾ ਵਿੱਚ ਸੁਧਾਰ ਕਰਦੀ ਹੈ।",
    od: "ଅତିରିକ୍ତ ଆର୍ଥିକ/ଆବଶ୍ୟକତା ସୂଚନା ପ୍ରାସଙ୍ଗିକତାକୁ ଉନ୍ନତ କରେ।"
  },
  "Receive suitable schemes with eligibility, benefits and next steps.": {
    en: "Receive suitable schemes with eligibility, benefits and next steps.",
    hi: "पात्रता, लाभ और अगले कदमों के साथ उपयुक्त योजनाएं प्राप्त करें।",
    gu: "પાત્રતા, લાભો અને આગળના પગલાં સાથે યોગ્ય યોજનાઓ મેળવો.",
    mr: "पात्रता, फायदे आणि पुढील पायऱ्यांसह योग्य योजना मिळवा.",
    bn: "যোগ্যতা, সুবিধা এবং পরবর্তী পদক্ষেপ সহ উপযুক্ত প্রকল্পগুলি পান।",
    ta: "தகுதி, நன்மைகள் மற்றும் அடுத்த படிகளுடன் பொருத்தமான திட்டங்களைப் பெறுங்கள்.",
    te: "అర్హత, ప్రయోజనాలు మరియు తదుపరి దశలతో తగిన పథకాలను పొందండి.",
    kn: "ಅರ್ಹತೆ, ಪ್ರಯೋಜನಗಳು ಮತ್ತು ಮುಂದಿನ ಹಂತಗಳೊಂದಿಗೆ ಸೂಕ್ತವಾದ ಯೋಜನೆಗಳನ್ನು ಪಡೆಯಿರಿ.",
    ml: "യോഗ്യത, ആനുകൂല്യങ്ങൾ, അടുത്ത ഘട്ടങ്ങൾ എന്നിവയോടെ അനുയോജ്യമായ പദ്ധതികൾ നേടുക.",
    pa: "ਯੋਗਤਾ, ਲਾਭ ਅਤੇ ਅਗਲੇ ਕਦਮਾਂ ਦੇ ਨਾਲ ਢੁਕਵੀਆਂ ਯੋਜਨਾਵਾਂ ਪ੍ਰਾਪਤ ਕਰੋ।",
    od: "ଯୋଗ୍ୟତା, ଲାଭ ଏବଂ ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ ସହିତ ଉପଯୁକ୍ତ ଯୋଜନାଗୁଡ଼ିକ ପ୍ରାପ୍ତ କରନ୍ତୁ।"
  },
  "Search resources (e.g. Udyam, Documents, Checklist, Loan, Tips)": {
    en: "Search resources (e.g. Udyam, Documents, Checklist, Loan, Tips)",
    hi: "संसाधन खोजें (उदा. उद्यम, दस्तावेज़, चेकलिस्ट, ऋण, सुझाव)",
    gu: "સંસાધનો શોધો (દા.ત. ઉદ્યમ, દસ્તાવેજ, ચેકલિસ્ટ, લોન, ટિપ્સ)",
    mr: "संसाधने शोधा (उदा. उद्यम, कागदपत्रे, चेकलिस्ट, कर्ज, टिप्स)",
    bn: "সম্পদ অনুসন্ধান করুন (যেমন উদ্যোগ, নথিপত্র, চেকলিস্ট, ঋণ, পরামর্শ)",
    ta: "வளங்களைத் தேடுங்கள் (எ.கா. உத்யம், ஆவணங்கள், சரிபார்ப்புப் பட்டியல், கடன், குறிப்புகள்)",
    te: "వనరులను శోధించండి (ఉదా. ఉద్యమ్, పత్రాలు, చెక్‌లిస్ట్, రుణం, చిట్కాలు)",
    kn: "ಸಂಪನ್ಮೂಲಗಳನ್ನು ಹುಡುಕಿ (ಉದಾ. ಉದ್ಯಮ್, ದಾಖಲೆಗಳು, ಪರಿಶೀಲನಾ ಪಟ್ಟಿ, ಸಾಲ, ಸಲಹೆಗಳು)",
    ml: "വിഭവങ്ങൾ തിരയുക (ഉദാ. ഉദ്യം, രേഖകൾ, ചെക്ക്‌ലിസ്റ്റ്, വായ്പ, നുറുങ്ങുകൾ)",
    pa: "ਸਰੋਤਾਂ ਦੀ ਖੋਜ ਕਰੋ (ਜਿਵੇਂ ਉਦਯਮ, ਦਸਤਾਵੇਜ਼, ਚੈੱਕਲਿਸਟ, ਲੋਨ, ਸੁਝਾਅ)",
    od: "ସମ୍ବଳ ସନ୍ଧାନ କରନ୍ତୁ (ଯଥା ଉଦ୍ୟମ, ଦଲିଲପତ୍ର, ଯାଞ୍ଚ ତାଲିକା, ଋଣ, ପରାମର୍ଶ)"
  },
  "Artisan Support": { en: "Artisan Support", hi: "कारीगर सहायता", mr: "कारागीर समर्थन", gu: "કારીગર સહાય", ta: "கைவினைஞர் ஆதரவு", te: "కళాకారులకు సహాయం", bn: "কারিগর সহায়তা", kn: "ಕರಕುಶಲಗಾರರ ಬೆಂಬಲ", ml: "കരകൗശല ശിൽപികൾക്ക് പിന്തുണ", pa: "ਕਾਰੀਗਰ ਸਹਾਇਤਾ", or: "କାରିଗର ସହାୟତା", ur: "کاریگروں کی مدد" },
  "Graph Database": {
    en: "Graph Database",
    hi: "ग्राफ डेटाबेस",
    gu: "ગ્રાફ ડેટાબેસ",
    mr: "ग्राफ डेटाबेस",
    bn: "গ্রাফ ডাটাবেস",
    ta: "வரைபட தரவுத்தளம்",
    te: "గ్రాఫ్ డేటాబేస్",
    kn: "ಗ್ರಾಫ್ ಡೇಟಾಬೇಸ್",
    ml: "ഗ്രാഫ് ഡാറ്റാബേസ്",
    pa: "ਗ੍ਰਾਫ਼ ਡੇਟਾਬੇਸ",
    od: "ଗ୍ରାଫ୍ ଡାଟାବେସ୍"
  },
  "Neo4j Graph (Active)": {
    en: "Neo4j Graph (Active)",
    hi: "Neo4j ग्राफ (सक्रिय)",
    gu: "Neo4j ગ્રાફ (સક્રિય)",
    mr: "Neo4j ग्राफ (सक्रिय)",
    bn: "Neo4j গ্রাফ (সক্রিয়)",
    ta: "Neo4j வரைபடம் (செயலில்)",
    te: "Neo4j గ్రాఫ్ (యాక్టివ్)",
    kn: "Neo4j ಗ್ರಾಫ್ (ಸಕ್ರಿಯ)",
    ml: "Neo4j ഗ്രാഫ് (സജീവം)",
    pa: "Neo4j ਗ੍ਰਾਫ਼ (ਐਕਟਿਵ)",
    od: "Neo4j ଗ୍ରାଫ୍ (ସକ୍ରିୟ)"
  },
  "Schemes": {
    en: "Schemes",
    hi: "योजनाएं",
    gu: "યોજનાઓ",
    mr: "योजना",
    bn: "প্রকল্প",
    ta: "திட்டங்கள்",
    te: "పథకాలు",
    kn: "ಯೋಜನೆಗಳು",
    ml: "പദ്ധതികൾ",
    pa: "ਯੋਜਨਾਵਾਂ",
    od: "ଯୋଜନା"
  },
  "Sectors": {
    en: "Sectors",
    hi: "क्षेत्र",
    gu: "ક્ષેત્રો",
    mr: "क्षेत्रे",
    bn: "ক্ষেত্র",
    ta: "துறைகள்",
    te: "రంగాలు",
    kn: "ವಲಯಗಳು",
    ml: "മേഖലകൾ",
    pa: "ਖੇਤਰ",
    od: "କ୍ଷେତ୍ର"
  },
  "Departments": {
    en: "Departments",
    hi: "विभाग",
    gu: "વિભાગો",
    mr: "विभाग",
    bn: "দপ্তরসমূহ",
    ta: "துறைகள்",
    te: "విభాగాలు",
    kn: "ಇಲಾಖೆಗಳು",
    ml: "വകുപ്പുകൾ",
    pa: "ਵਿਭਾਗ",
    od: "ବିଭାଗ"
  },
  "Graph Search": {
    en: "Graph Search",
    hi: "ग्राफ खोज",
    gu: "ગ્રાફ શોધ",
    mr: "ग्राफ शोध",
    bn: "গ্রাফ অনুসন্ধান",
    ta: "வரைபட தேடல்",
    te: "గ్రాఫ్ శోధన",
    kn: "ಗ್ರಾಫ್ ಹುಡುಕಾಟ",
    ml: "ഗ്രാഫ് തിരയൽ",
    pa: "ਗ੍ਰਾਫ਼ ਖੋਜ",
    od: "ଗ୍ରାଫ୍ ସନ୍ଧାନ"
  },
  "Filter by Sector Node (14 Sectors):": {
    en: "Filter by Sector Node (14 Sectors):",
    hi: "क्षेत्र नोड द्वारा फ़िल्टर करें (14 क्षेत्र):",
    gu: "ક્ષેત્ર નોડ દ્વારા ફિલ્ટર કરો (14 ક્ષેત્રો):",
    mr: "क्षेत्र नोडनुसार फिल्टर करा (14 क्षेत्रे):",
    bn: "সেক্টর নোড দ্বারা ফিল্টার করুন (১৪টি সেক্টর):",
    ta: "துறை முனை மூலம் வடிகட்டவும் (14 துறைகள்):",
    te: "రంగం నోడ్ ద్వారా ఫిల్టర్ చేయండి (14 రంగాలు):",
    kn: "ವಲಯ ನೋಡ್ ಮೂಲಕ ಫಿಲ್ಟರ್ ಮಾಡಿ (14 ವಲಯಗಳು):",
    ml: "മേഖല നോഡ് അനുಸരിച്ച് ഫിൽട്ടർ ചെയ്യുക (14 മേഖലകൾ):",
    pa: "ਸੈਕਟਰ ਨੋਡ ਅਨੁਸਾਰ ਫਿਲਟਰ ਕਰੋ (14 ਖੇਤਰ):",
    od: "କ୍ଷେତ୍ର ନୋଡ୍ ଦ୍ୱାରା ଫିଲ୍ଟର୍ କରନ୍ତୁ (୧୪ କ୍ଷେତ୍ର):"
  },
  "All Sectors": {
    en: "All Sectors",
    hi: "सभी क्षेत्र",
    gu: "બધા ક્ષેત્રો",
    mr: "सर्व क्षेत्रे",
    bn: "সমস্ত ক্ষেত্র",
    ta: "அனைத்து துறைகளும்",
    te: "అన్ని రంగాలు",
    kn: "ಎಲ್ಲಾ ವಲಯಗಳು",
    ml: "ಎಲ್ಲಾ മേഖലകളും",
    pa: "ਸਾਰੇ ਖੇਤਰ",
    od: "ସମସ୍ତ କ୍ଷେତ୍ର"
  },
  "All Categories": {
    en: "All Categories",
    hi: "सभी श्रेणियां",
    gu: "બધી શ્રેણીઓ",
    mr: "सर्व श्रेणी",
    bn: "সব বিভাগ",
    ta: "அனைத்து பிரிவுகளும்",
    te: "అన్ని విభాగాలు",
    kn: "ಎಲ್ಲಾ ವರ್ಗಗಳು",
    ml: "ಎಲ್ಲಾ വിഭാഗങ്ങളും",
    pa: "ਸਾਰੀਆਂ ਸ਼੍ਰੇਣੀਆਂ",
    od: "ସମସ୍ତ ବର୍ଗ"
  },
  "Graph Nodes & Connected Schemes": {
    en: "Graph Nodes & Connected Schemes",
    hi: "ग्राफ नोड्स और जुड़ी योजनाएं",
    gu: "ગ્રાફ નોડ્સ અને જોડાયેલી યોજનાઓ",
    mr: "ग्राफ नोड्स आणि जोडलेल्या योजना",
    bn: "গ্রাফ নোড এবং সংযুক্ত প্রকল্পসমূহ",
    ta: "வரைபட முனைகள் & இணைக்கப்பட்ட திட்டங்கள்",
    te: "గ్రాఫ్ నోడ్‌లు & అనుసంధానించబడిన పథకాలు",
    kn: "ಗ್ರಾಫ್ ನೋಡ್‌ಗಳು ಮತ್ತು ಸಂಬಂಧಿತ ಯೋಜನೆಗಳು",
    ml: "ഗ്രാഫ് നോഡുകളും ബന്ധിപ്പിച്ച പദ്ധതികളും",
    pa: "ਗ੍ਰਾਫ਼ ਨੋਡਸ ਅਤੇ ਜੁੜੀਆਂ ਯੋਜਨਾਵਾਂ",
    od: "ଗ୍ରାଫ୍ ନୋଡ୍ ଏବଂ ସଂଯୁକ୍ତ ଯୋଜନାଗୁଡ଼ିକ"
  },
  "Showing page": { en: "Showing page", hi: "दिखाया जा रहा पेज", gu: "દર્શાવેલ પેજ", mr: "दर्शविलेले पान", bn: "প্রদর্শিত পাতা", ta: "காட்டப்படும் பக்கம்", te: "చూపిస్తున్న పేజీ", kn: "ತೋರಿಸಲಾಗುತ್ತಿರುವ ಪುಟ", ml: "കാണിക്കുന്ന പേജ്", pa: "ਦਿਖਾਇਆ ਜਾ ਰਿਹਾ ਪੰਨਾ", od: "ପ୍ରଦର୍ଶିତ ପୃଷ୍ଠା" },
  "of": { en: "of", hi: "में से", gu: "માંથી", mr: "पैकी", bn: "এর", ta: "இல்", te: "లో", kn: "ರ", ml: "ൽ", pa: "ਵਿੱਚੋਂ", od: "ମଧ୍ୟରୁ" },
  "in": { en: "in", hi: "में", gu: "માં", mr: "मध्ये", bn: "এ", ta: "இல்", te: "లో", kn: "ನಲ್ಲಿ", ml: "ൽ", pa: "ਵਿੱਚ", od: "ରେ" },
  "Querying Knowledge Graph across 3,400 schemes...": { en: "Querying Knowledge Graph across 3,400 schemes...", hi: "3,400 योजनाओं के ज्ञान ग्राफ में खोज जारी है...", gu: "3,400 યોજનાઓના નોલેજ ગ્રાફમાં શોધ ચાલુ છે...", mr: "3,400 योजनांच्या नॉलेज ग्राफमध्ये शोध सुरू आहे...", bn: "৩,৪০০ প্রকল্পের নলেজ গ্রাফ অনুসন্ধান করা হচ্ছে...", ta: "3,400 திட்டங்களின் அறிவு வரைபடத்தில் தேடுகிறது...", te: "3,400 పథకాల నాలెడ్జ్ గ్రాఫ్‌లో శోధన జరుగుతోంది...", kn: "3,400 ಯೋಜನೆಗಳ ಜ್ಞಾನ ಗ್ರಾಫ್‌ನಲ್ಲಿ ಹುಡುಕಲಾಗುತ್ತಿದೆ...", ml: "3,400 പദ്ധതികളുടെ നോളജ് ഗ്രാഫിൽ തിരയുന്നു...", pa: "3,400 ਯੋਜਨਾਵਾਂ ਦੇ ਗਿਆਨ ਗ੍ਰਾਫ਼ ਵਿੱਚ ਖੋਜ ਜਾਰੀ ਹੈ...", od: "୩,୪୦୦ ଯୋଜନାର ଜ୍ଞାନ ଗ୍ରାଫରେ ସନ୍ଧାନ ଚାଲିଛି..." },
  "No graph schemes matched your criteria.": { en: "No graph schemes matched your criteria.", hi: "आपके मानदंडों से मेल खाने वाली कोई ग्राफ योजना नहीं मिली।", gu: "તમારા માપદંડ સાથે મેળ ખાતી કોઈ ગ્રાફ યોજના મળી નથી.", mr: "तुमच्या निकषांशी जुळणारी कोणतीही ग्राफ योजना आढळली नाही.", bn: "আপনার মানদণ্ডের সাথে মেলে এমন কোনো গ্রাফ স্কিম পাওয়া যায়নি।", ta: "உங்கள் அளவுகோல்களுடன் பொருந்தக்கூடிய வரைபடத் திட்டம் எதுவும் கிடைக்கவில்லை.", te: "మీ ప్రమాణాలకు సరిపోయే గ్రాఫ్ పథకం ఏదీ కనుగొనబడలేదు.", kn: "ನಿಮ್ಮ ಮಾನದಂಡಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಯಾವುದೇ ಗ್ರಾಫ್ ಯೋಜನೆ ಕಂಡುಬಂದಿಲ್ಲ.", ml: "നിങ്ങളുടെ മാനദണ്ഡങ്ങളുമായി പൊരുത്തപ്പെടുന്ന ഗ്രാഫ് സ്കീമുകളൊന്നും കണ്ടെത്തിയില്ല.", pa: "ਤੁਹਾਡੇ ਮਾਪਦੰਡਾਂ ਨਾਲ ਮੇਲ ਖਾਂਦੀ ਕੋਈ ਗ੍ਰਾਫ਼ ਯੋਜਨਾ ਨਹੀਂ ਮਿਲੀ।", od: "ଆପଣଙ୍କ ମାନଦଣ୍ଡ ସହିତ ମେଳ ଖାଉଥିବା କୌଣସି ଗ୍ରାଫ୍ ଯୋଜନା ମିଳିଲା ନାହିଁ।" },
  "Try another keyword or select All Sectors.": { en: "Try another keyword or select All Sectors.", hi: "दूसरा शब्द प्रयास करें या सभी क्षेत्र चुनें।", gu: "બીજો શબ્દ પ્રયાસ કરો અથવા બધા ક્ષેત્રો પસંદ કરો.", mr: "दुसरा शब्द वापरून पहा किंवा सर्व क्षेत्रे निवडा.", bn: "অন্য কোনো কিওয়ার্ড ব্যবহার করুন বা সমস্ত ক্ষেত্র নির্বাচন করুন।", ta: "வேறொரு முக்கிய சொல்லை முயற்சிக்கவும் அல்லது அனைத்து துறைகளையும் தேர்ந்தெடுக்கவும்.", te: "మరొక కీవర్డ్‌ని ప్రయత్నించండి లేదా అన్ని రంగాలను ఎంచుకోండి.", kn: "ಮತ್ತೊಂದು ಕೀವರ್ಡ್ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಎಲ್ಲಾ ವಲಯಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ.", ml: "മറ്റൊരു കീവേഡ് ശ്രമിക്കുക അല്ലെങ്കിൽ എല്ലാ മേഖലകളും തിരഞ്ഞെടുക്കുക.", pa: "ਕੋਈ ਹੋਰ ਸ਼ਬਦ ਵਰਤੋ ਜਾਂ ਸਾਰੇ ਖੇਤਰ ਚੁਣੋ।", od: "ଅନ୍ୟ ଏକ ଶବ୍ଦ ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା ସମସ୍ତ କ୍ଷେତ୍ର ଚୟନ କରନ୍ତୁ।" },
  "Key Benefit:": { en: "Key Benefit:", hi: "मुख्य लाभ:", gu: "મુખ્ય લાભ:", mr: "मुख्य फायदा:", bn: "প্রধান সুবিধা:", ta: "முக்கிய நன்மை:", te: "ముఖ్య ప్రయోజనం:", kn: "ಮುಖ್ಯ ಪ್ರಯೋಜನ:", ml: "പ്രധാന നേട്ടം:", pa: "ਮੁੱਖ ਲਾਭ:", od: "ମୁଖ୍ୟ ଲାଭ:" },
  "Knowledge Graph Topology:": { en: "Knowledge Graph Topology:", hi: "ज्ञान ग्राफ संरचना:", gu: "નોલેજ ગ્રાફ રચના:", mr: "नॉलेज ग्राफ रचना:", bn: "নলেজ গ্রাফ টপোলজি:", ta: "அறிவு வரைபட அமைப்பு:", te: "నాలెడ్జ్ గ్రాఫ్ టోపోలాజీ:", kn: "ಜ್ಞಾನ ಗ್ರಾಫ್ ರಚನೆ:", ml: "നോളജ് ഗ്രാഫ് ടോപ്പോളജി:", pa: "ਗਿਆਨ ਗ੍ਰਾਫ਼ ਸੰਰਚਨਾ:", od: "ଜ୍ଞାନ ଗ୍ରାଫ୍ ସଂରଚନା:" },
  "SchemeSaathi": { en: "SchemeSaathi", hi: "स्कीमसाथी - SchemeSaathi", gu: "સ્કીમસાથી - SchemeSaathi", mr: "स्कीमसाथी - SchemeSaathi", bn: "স্কিমসাথী - SchemeSaathi", ta: "ஸ்கீம்சாதி - SchemeSaathi", te: "స్కీమ్‌సాథి - SchemeSaathi", kn: "ಸ್ಕೀಮ್‌ಸಾಥಿ - SchemeSaathi", ml: "സ്കീംസാഥി - SchemeSaathi", pa: "ਸਕੀਮਸਾਥੀ - SchemeSaathi", od: "ସ୍କିମ୍‌ସାଥି - SchemeSaathi" },
  "Explore government schemes": {
    en: "Explore government schemes",
    hi: "सरकारी योजनाएं देखें",
    gu: "સરકારી યોજનાઓ શોધો",
    mr: "सरकारी योजना एक्सप्लोर करा",
    bn: "সরকারি প্রকল্প অনুসন্ধান করুন",
    ta: "அரசு திட்டங்களை ஆராயுங்கள்",
    te: "ప్రభుత్వ పథకాలను అన్వేషించండి",
    kn: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
    ml: "സർക്കാർ പദ്ധതികൾ പരിശോധിക്കുക",
    pa: "ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਦੀ ਪੜਚੋਲ ਕਰੋ",
    od: "ସରକାରୀ ଯୋଜନାଗୁଡ଼ିକୁ ଅନୁସନ୍ଧାନ କରନ୍ତୁ"
  },
  "Browse the verified pilot catalogue by your needs. Availability and application windows vary; some searches may have no verified entry yet.": {
    en: "Browse the verified pilot catalogue by your needs. Availability and application windows vary; some searches may have no verified entry yet.",
    hi: "अपनी ज़रूरतों के अनुसार सत्यापित सूची देखें। उपलब्धता और आवेदन की अवधि बदल सकती है।",
    gu: "તમારી જરૂરિયાતો અનુસાર ચકાસાયેલ યોજનાઓની યાદી જુઓ. ઉપલબ્ધતા અને અરજીનો સમયગાળો બદલાઈ શકે છે.",
    mr: "तुमच्या गरजांनुसार सत्यापित योजनांची यादी तपासा. उपलब्धता आणि अर्जाची मुदत बदलू शकते.",
    bn: "আপনার প্রয়োজন অনুযায়ী যাচাইকৃত প্রকল্পের তালিকা দেখুন। প্রাপ্যতা এবং আবেদনের সময়সীমা পরিবর্তিত হতে পারে।",
    ta: "உங்கள் தேவைகளுக்கேற்ப சரிபார்க்கப்பட்ட திட்டப் பட்டியலை உலாவவும். கிடைக்கும் தன்மை மாறுபடலாம்.",
    te: "మీ అవసరాలకు తగిన ధృవీకరించిన పథకాల జాబితాను బ్రౌజ్ చేయండి.",
    kn: "ನಿಮ್ಮ ಅಗತ್ಯಗಳಿಗೆ ತಕ್ಕಂತೆ ಪರಿಶೀಲಿಸಿದ ಯೋಜನೆಗಳ ಪಟ್ಟಿಯನ್ನು ನೋಡಿ.",
    ml: "നിങ്ങളുടെ ആവശ്യങ്ങൾക്കനുസരിച്ച് പരിശോധിച്ച പദ്ധതികളുടെ പട്ടിക കാണുക.",
    pa: "ਆਪਣੀਆਂ ਲੋੜਾਂ ਅਨੁਸਾਰ ਪ੍ਰਮਾਣਿਤ ਯੋਜਨਾਵਾਂ ਦੀ ਸੂਚੀ ਵੇਖੋ।",
    od: "ଆପଣଙ୍କ ଆବଶ୍ୟକତା ଅନୁଯାୟୀ ପ୍ରମାଣିତ ଯୋଜନା ତାଲିକା ଦେଖନ୍ତୁ।"
  },
  "Sync 3,400 Schemes → Graph": {
    en: "Sync 3,400 Schemes → Graph",
    hi: "3,400 योजनाएं ग्राफ से सिंक करें",
    gu: "3,400 યોજનાઓ ગ્રાફ સાથે સિંક કરો",
    mr: "3,400 योजना ग्राफशी सिंक करा",
    bn: "৩,৪০০ প্রকল্প গ্রাফের সাথে সিঙ্ক করুন",
    ta: "3,400 திட்டங்களை வரைபடத்துடன் ஒத்திசைக்கவும்",
    te: "3,400 పథకాలను గ్రాఫ్‌తో సమకాలీకరించండి",
    kn: "3,400 ಯೋಜನೆಗಳನ್ನು ಗ್ರಾಫ್‌ಗೆ ಸಿಂಕ್ ಮಾಡಿ",
    ml: "3,400 പദ്ധതികൾ ഗ്രാഫുമായി സമന്വയിപ്പിക്കുക",
    pa: "3,400 ਯੋਜਨਾਵਾਂ ਗ੍ਰਾਫ਼ ਨਾਲ ਸਿੰਕ ਕਰੋ",
    od: "୩,୪୦୦ ଯୋଜନା ଗ୍ରାଫ୍ ସହିତ ସିଙ୍କ କରନ୍ତୁ"
  },
  "Sync Schemes → Knowledge Graph": {
    en: "Sync Schemes → Knowledge Graph",
    hi: "योजनाएं ज्ञान ग्राफ से सिंक करें",
    gu: "યોજનાઓ નોલેજ ગ્રાફ સાથે સિંક કરો",
    mr: "योजना नॉलेज ग्राफशी सिंक करा",
    bn: "প্রকল্পগুলি নলেজ গ্রাফের সাথে সিঙ্ক করুন",
    ta: "திட்டங்களை அறிவு வரைபடத்துடன் ஒத்திசைக்கவும்",
    te: "పథకాలను నాలెడ్జ్ గ్రాఫ్‌తో సమకాలీకరించండి",
    kn: "ಯೋಜನೆಗಳನ್ನು ಜ್ಞಾನ ಗ್ರಾಫ್‌ಗೆ ಸಿಂಕ್ ಮಾಡಿ",
    ml: "പദ്ധതികൾ നോളജ് ഗ്രാഫുമായി സമന്വയിപ്പിക്കുക",
    pa: "ਯੋਜਨਾਵਾਂ ਗਿਆਨ ਗ੍ਰਾਫ਼ ਨਾਲ ਸਿੰਕ ਕਰੋ",
    od: "ଯୋଜନାଗୁଡ଼ିକୁ ଜ୍ଞାନ ଗ୍ରାଫ୍ ସହିତ ସିଙ୍କ କରନ୍ତୁ"
  },
  "Search among 3,400 schemes (e.g. loan, farmer, scholarship, women, subsidy, artisan, pension)...": {
    en: "Search among 3,400 schemes (e.g. loan, farmer, scholarship, women, subsidy, artisan, pension)...",
    hi: "3,400 योजनाओं में खोजें (उदा. ऋण, किसान, छात्रवृत्ति, महिला, सब्सिडी, कारीगर, पेंशन)...",
    gu: "3,400 યોજનાઓમાં શોધો (દા.ત. લોન, ખેડૂત, શિષ્યવૃત્તિ, મહિલા, સબસિડી, કારીગર, પેન્શન)...",
    mr: "3,400 योजनांमध्ये शोधा (उदा. कर्ज, शेतकरी, शिष्यवृत्ती, महिला, अनुदान, कारागीर, पेन्शन)...",
    bn: "৩,৪০০ প্রকল্পের মধ্যে খুঁজুন (যেমন ঋণ, কৃষক, বৃত্তি, মহিলা, ভর্তুকি, কারিগর, পেনশন)...",
    ta: "3,400 திட்டங்களில் தேடுங்கள் (எ.கா. கடன், விவசாயி, கல்வி உதவித்தொகை, பெண்கள், மானியம், கைவினைஞர், ஓய்வூதியம்)...",
    te: "3,400 పథకాలలో శోధించండి (ఉదా. రుణం, రైతు, స్కాలర్‌షిప్, మహిళలు, సబ్సిడీ, కళాకారుడు, పెన్షన్)...",
    kn: "3,400 ಯೋಜನೆಗಳಲ್ಲಿ ಹುಡುಕಿ (ಉದಾ. ಸಾಲ, ರೈತ, ವಿದ್ಯಾರ್ಥಿವೇತನ, ಮಹಿಳೆಯರು, ಸಬ್ಸಿಡಿ, ಕರಕುಶಲಕರ್ಮಿ, ಪಿಂಚಣಿ)...",
    ml: "3,400 പദ്ധതികളിൽ തിരയുക (ഉദാ. വായ്പ, കർഷകൻ, സ്കോളർഷിപ്പ്, സ്ത്രീകൾ, സബ്സിഡി, പെൻഷൻ)...",
    pa: "3,400 ਯੋਜਨਾਵਾਂ ਵਿੱਚੋਂ ਖੋਜੋ (ਜਿਵੇਂ ਲੋਨ, ਕਿਸਾਨ, ਵਜ਼ੀਫ਼ਾ, ਔਰਤਾਂ, ਸਬਸਿਡੀ, ਕਾਰੀਗਰ, ਪੈਨਸ਼ਨ)...",
    od: "୩,୪୦୦ ଯୋଜନା ମଧ୍ୟରେ ଖୋଜନ୍ତୁ (ଯଥା ଋଣ, କୃଷକ, ବୃତ୍ତି, ମହିଳା, ସବସିଡି, କାରିଗର, ପେନ୍ସନ୍)..."
  },
  "Search schemes across knowledge graph (e.g. loan, farmer, scholarship, women, subsidy, artisan)...": {
    en: "Search schemes across knowledge graph (e.g. loan, farmer, scholarship, women, subsidy, artisan)...",
    hi: "ज्ञान ग्राफ में योजनाएं खोजें (उदा. ऋण, किसान, छात्रवृत्ति, महिला, सब्सिडी, कारीगर)...",
    gu: "નોલેજ ગ્રાફમાં યોજનાઓ શોધો (દા.ત. લોન, ખેડૂત, શિષ્યવૃત્તિ, મહિલા, સબસિડી, કારીગર)...",
    mr: "नॉलेज ग्राफमध्ये योजना शोधा (उदा. कर्ज, शेतकरी, शिष्यवृत्ती, महिला, अनुदान, कारागीर)...",
    bn: "নলেজ গ্রাফে প্রকল্প খুঁজুন (যেমন ঋণ, কৃষক, বৃত্তি, মহিলা, ভর্তুকি, কারিগর)...",
    ta: "அறிவு வரைபடத்தில் திட்டங்களைத் தேடுங்கள் (எ.கா. கடன், விவசாயி, கல்வி உதவித்தொகை, பெண்கள், மானியம், கைவினைஞர்)...",
    te: "నాలెడ్జ్ గ్రాఫ్‌లో పథకాలను శోధించండి (ఉదా. రుణం, రైతు, స్కాలర్‌షిప్, మహిళలు, సబ్సిడీ, కళాకారుడు)...",
    kn: "ಜ್ಞಾನ ಗ್ರಾಫ್‌ನಲ್ಲಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ (ಉದಾ. ಸಾಲ, ರೈತ, ವಿದ್ಯಾರ್ಥಿವೇತನ, ಮಹಿಳೆಯರು, ಸಬ್ಸಿಡಿ, ಕರಕುಶಲಕರ್ಮಿ)...",
    ml: "നോളജ് ഗ്രാഫിൽ പദ്ധതികൾ തിരയുക (ഉദാ. വായ്പ, കർഷകൻ, സ്കോളർഷിപ്പ്, സ്ത്രീകൾ, സബ്സിഡി, കരകൗശലത്തൊഴിലാളി)...",
    pa: "ਗਿਆਨ ਗ੍ਰਾਫ਼ ਵਿੱਚ ਯੋਜਨਾਵਾਂ ਖੋਜੋ (ਜਿਵੇਂ ਲੋਨ, ਕਿਸਾਨ, ਵਜ਼ੀਫ਼ਾ, ਔਰਤਾਂ, ਸਬਸਿਡੀ, ਕਾਰੀਗਰ)...",
    od: "ଜ୍ଞାନ ଗ୍ରାଫରେ ଯୋଜନା ଖୋଜନ୍ତୁ (ଯଥା ଋଣ, କୃଷକ, ବୃତ୍ତି, ମହିଳା, ସବସିଡି, କାରିଗର)..."
  },
  "Social Welfare & Empowerment": {
    en: "Social Welfare & Empowerment",
    hi: "सामाजिक कल्याण और सशक्तिकरण",
    gu: "સામાજિક કલ્યાણ અને સશક્તિકરણ",
    mr: "समाजकल्याण आणि सक्षमीकरण",
    bn: "সমাজকল্যাণ ও ক্ষমতায়ন",
    ta: "சமூக நலம் மற்றும் அதிகாரமளித்தல்",
    te: "సామాజిక సంక్షేమం మరియు సాధికారత",
    kn: "ಸಾಮಾಜಿಕ ಕಲ್ಯಾಣ ಮತ್ತು ಸಬಲೀಕರಣ",
    ml: "സാമൂഹ്യക്ഷേമവും ശാക്തീകരണവും",
    pa: "ਸਮਾਜ ਭਲਾਈ ਅਤੇ ਸਸ਼ਕਤੀਕਰਨ",
    od: "ସାମାଜିକ କଲ୍ୟାଣ ଏବଂ ସଶକ୍ତୀକରଣ"
  },
  "Education & Learning": {
    en: "Education & Learning",
    hi: "शिक्षा और अध्ययन",
    gu: "શિક્ષણ અને શિક્ષણ",
    mr: "शिक्षण आणि अध्ययन",
    bn: "শিক্ষা ও শিখন",
    ta: "கல்வி மற்றும் கற்றல்",
    te: "విద్య మరియు అభ్యాసం",
    kn: "ಶಿಕ್ಷಣ ಮತ್ತು ಕಲಿಕೆ",
    ml: "വിദ്യാഭ്യാസവും പഠനവും",
    pa: "ਸਿੱਖਿਆ ਅਤੇ ਸਿਖਲਾਈ",
    od: "ଶିକ୍ଷା ଏବଂ ଶିକ୍ଷଣ"
  },
  "Agriculture, Rural & Environment": {
    en: "Agriculture, Rural & Environment",
    hi: "कृषि, ग्रामीण और पर्यावरण",
    gu: "કૃષિ, ગ્રામીણ અને પર્યાવરણ",
    mr: "शेती, ग्रामीण आणि पर्यावरण",
    bn: "কৃষি, গ্রামীণ ও পরিবেশ",
    ta: "விவசாயம், கிராமப்புறம் & சுற்றுச்சூழல்",
    te: "వ్యవసాయం, గ్రామీణ & పర్యావరణం",
    kn: "ಕೃಷಿ, ಗ್ರಾಮೀಣ ಮತ್ತು ಪರಿಸರ",
    ml: "കൃഷി, ഗ്രാമീണം, പരിസ്ഥിതി",
    pa: "ਖੇਤੀਬਾੜੀ, ਪੇਂਡੂ ਅਤੇ ਵਾਤਾਵਰਣ",
    od: "କୃଷି, ଗ୍ରାମୀଣ ଏବଂ ପରିବେଶ"
  },
  "Business & Entrepreneurship": {
    en: "Business & Entrepreneurship",
    hi: "व्यवसाय और उद्यमिता",
    gu: "વ્યવસાય અને ઉદ્યોગસાહસિકતા",
    mr: "व्यवसाय आणि उद्योजकता",
    bn: "ব্যবসা ও উদ্যোগ",
    ta: "வணிகம் மற்றும் தொழில்முனைவு",
    te: "వ్యాపారం మరియు ఉద్యమశీలత",
    kn: "ವ್ಯಾಪಾರ ಮತ್ತು ಉದ್ಯಮಶೀಲತೆ",
    ml: "വ്യാപാരവും സംരംഭകത്വവും",
    pa: "ਕਾਰੋਬਾਰ ਅਤੇ ਉੱਦਮਤਾ",
    od: "ବ୍ୟବସାୟ ଏବଂ ଉଦ୍ୟୋଗପତିତ୍ୱ"
  },
  "Women & Child Development": {
    en: "Women & Child Development",
    hi: "महिला और बाल विकास",
    gu: "મહિલા અને બાળ વિકાસ",
    mr: "महिला आणि बाल विकास",
    bn: "মহিলা ও শিশু বিকাশ",
    ta: "மகளிர் மற்றும் குழந்தைகள் மேம்பாடு",
    te: "మహిళా & శిశు అభివృద్ధి",
    kn: "ಮಹಿಳಾ ಮತ್ತು ಮಕ್ಕಳ ಅಭಿವೃದ್ಧಿ",
    ml: "വനിതാ ശിശു വികസനം",
    pa: "ਮਹਿਲਾ ਅਤੇ ਬਾਲ ਵਿਕਾਸ",
    od: "ମହିଳା ଏବଂ ଶିଶୁ ବିକାଶ"
  },
  "Skills & Employment": {
    en: "Skills & Employment",
    hi: "कौशल और रोजगार",
    gu: "કૌશલ્ય અને રોજગાર",
    mr: "कौशल्ये आणि रोजगार",
    bn: "দক্ষতা ও কর্মসংস্থান",
    ta: "திறன்கள் மற்றும் வேலைவாய்ப்பு",
    te: "నైపుణ్యాలు మరియు ఉపాధి",
    kn: "ಕೌಶಲ್ಯಗಳು ಮತ್ತು ಉದ್ಯೋಗ",
    ml: "നൈപുണ്യവും തൊഴിലും",
    pa: "ਹੁਨਰ ਅਤੇ ਰੁਜ਼ਗਾਰ",
    od: "ଦକ୍ଷତା ଏବଂ ନିଯୁକ୍ତି"
  },
  "Banking, Financial Services and Insurance": {
    en: "Banking, Financial Services and Insurance",
    hi: "बैंकिंग, वित्तीय सेवाएं और बीमा",
    gu: "બેંકિંગ, નાણાકીય સેવાઓ અને વીમો",
    mr: "बँकिंग, वित्तीय सेवा आणि विमा",
    bn: "ব্যাংকিং, আর্থিক সেবা এবং বীমা",
    ta: "வங்கி, நிதி சேவைகள் மற்றும் காப்பீடு",
    te: "బ్యాంకింగ్, ఆర్థిక సేవలు మరియు బీమా",
    kn: "ಬ್ಯಾಂಕಿಂಗ್, ಹಣಕಾಸು ಸೇವೆಗಳು ಮತ್ತು ವಿಮೆ",
    ml: "ബാങ്കിംഗ്, ധനകാര്യ സേവനങ്ങൾ, ഇൻഷുറൻസ്",
    pa: "ਬੈਂਕਿੰਗ, ਵਿੱਤੀ ਸੇਵਾਵਾਂ ਅਤੇ ਬੀਮਾ",
    od: "ବ୍ୟାଙ୍କିଙ୍ଗ, ଆର୍ଥିକ ସେବା ଏବଂ ବୀମା"
  },
  "Health & Wellness": {
    en: "Health & Wellness",
    hi: "स्वास्थ्य और कल्याण",
    gu: "આરોગ્ય અને સુખાકારી",
    mr: "आरोग्य आणि कल्याण",
    bn: "স্বাস্থ্য ও সুস্থতা",
    ta: "சுகாதாரம் மற்றும் நல்வாழ்வு",
    te: "ఆరోగ్యం మరియు శ్రేయస్సు",
    kn: "ಆರೋಗ್ಯ ಮತ್ತು ಯೋಗಕ್ಷೇಮ",
    ml: "ആരോഗ്യവും ക്ഷേമവും",
    pa: "ਸਿਹਤ ਅਤੇ ਤੰਦਰੁਸਤੀ",
    od: "ସ୍ୱାସ୍ଥ୍ୟ ଏବଂ କଲ୍ୟାଣ"
  },
  "Housing & Shelter": {
    en: "Housing & Shelter",
    hi: "आवास और आश्रय",
    gu: "આવાસ અને આશ્રય",
    mr: "गृहनिर्माण आणि निवारा",
    bn: "আবাসন ও আশ্রয়",
    ta: "வீட்டுவசதி மற்றும் தங்குமிடம்",
    te: "గృహనిర్మాణం & ఆశ్రయం",
    kn: "ವಸತಿ ಮತ್ತು ಆಶ್ರಯ",
    ml: "ಭವನവും പാർപ്പിടവും",
    pa: "ਰਿਹਾਇਸ਼ ਅਤੇ ਆਸਰਾ",
    od: "ଗୃହନିର୍ମାଣ ଏବଂ ଆଶ୍ରୟ"
  },
  "Sports & Culture": {
    en: "Sports & Culture",
    hi: "खेल और संस्कृति",
    gu: "રમતગમત અને સંસ્કૃતિ",
    mr: "खेळ आणि संस्कृती",
    bn: "ক্রীড়া ও সংস্কৃতি",
    ta: "விளையாட்டு மற்றும் கலாச்சாரம்",
    te: "క్రీడలు మరియు సంస్కృతి",
    kn: "ಕ್ರೀಡೆ ಮತ್ತು ಸಂಸ್ಕೃತಿ",
    ml: "കായികവും സംസ്കാരവും",
    pa: "ਖੇਡਾਂ ਅਤੇ ਸੱਭਿਆਚਾਰ",
    od: "ଖେଳ ଏବଂ ସଂସ୍କୃତି"
  },
  "Science, IT & Communications": {
    en: "Science, IT & Communications",
    hi: "विज्ञान, आईटी और संचार",
    gu: "વિજ્ઞાન, આઇટી અને સંચાર",
    mr: "विज्ञान, आयटी आणि संप्रेषण",
    bn: "বিজ্ঞান, আইটি ও যোগাযোগ",
    ta: "அறிவியல், தகவல் தொழில்நுட்பம் மற்றும் தகவல் தொடர்பு",
    te: "సైన్స్, ఐటీ మరియు కమ్యూనికేషన్స్",
    kn: "ವಿಜ್ಞಾನ, ಐಟಿ ಮತ್ತು ಸಂವಹನ",
    ml: "ശാസ്ത്രം, ഐടി, ആശയവിനിമയം",
    pa: "ਵਿਗਿਆਨ, ਆਈਟੀ ਅਤੇ ਸੰਚਾਰ",
    od: "ବିଜ୍ଞାନ, ଆଇଟି ଏବଂ ଯୋଗାଯୋଗ"
  },
  "Transport & Infrastructure": {
    en: "Transport & Infrastructure",
    hi: "परिवहन और बुनियादी ढांचा",
    gu: "પરિવહન અને માળખાગત સુવિધાઓ",
    mr: "વાहतूक आणि पायाभूत सुविधा",
    bn: "পরিবহন ও পরিকাঠামো",
    ta: "போக்குவரத்து மற்றும் உள்கட்டமைப்பு",
    te: "రవాణా మరియు మౌలిక సదుపాయాలు",
    kn: "ಸಾರಿಗೆ ಮತ್ತು ಮೂಲಸೌಕರ್ಯ",
    ml: "ഗതാഗതവും അടിസ്ഥാന സൗകര്യങ്ങളും",
    pa: "ਆਵਾਜਾਈ ਅਤੇ ਬੁਨਿਆਦੀ ਢਾਂਚਾ",
    od: "ପରିବହନ ଏବଂ ଭିତ୍ତିଭୂମି"
  },
  "Travel & Tourism": {
    en: "Travel & Tourism",
    hi: "यात्रा और पर्यटन",
    gu: "મુસાફરી અને પ્રવાસન",
    mr: "प्रवास आणि पर्यटन",
    bn: "ভ্রমণ ও পর্যটন",
    ta: "பயணம் மற்றும் சுற்றுலா",
    te: "ప్రయాణం మరియు పర్యాటకం",
    kn: "ಪ್ರವಾಸ ಮತ್ತು ಪ್ರವಾಸೋದ್ಯಮ",
    ml: "യാത്രയും ടൂറിസവും",
    pa: "ਯਾਤਰਾ ਅਤੇ ਸੈਰ-ਸਪਾਟਾ",
    od: "ଯାତ୍ରା ଏବଂ ପର୍ଯ୍ୟଟନ"
  },
  "Public Safety, Law & Justice": {
    en: "Public Safety, Law & Justice",
    hi: "सार्वजनिक सुरक्षा, कानून और न्याय",
    gu: "જાહેર સુરક્ષા, કાયદો અને ન્યાય",
    mr: "सार्वजनिक सुरक्षा, कायदा आणि न्याय",
    bn: "জননিরাপত্তা, আইন ও বিচার",
    ta: "பொது பாதுகாப்பு, சட்டம் மற்றும் நீதி",
    te: "ప్రజా భద్రత, చట్టం మరియు న్యాయం",
    kn: "ಸಾರ್ವಜನಿಕ ಸುರಕ್ಷತೆ, ಕಾನೂನು ಮತ್ತು ನ್ಯಾಯ",
    ml: "പൊതുസുരക്ഷ, നിയമം, നീതി",
    pa: "ਜਨਤਕ ਸੁਰੱਖਿਆ, ਕਾਨੂੰਨ ਅਤੇ ਨਿਆਂ",
    od: "ଜନ ସୁରକ୍ଷା, ଆଇନ ଏବଂ ନ୍ୟାୟ"
  },
  "Sign in to save this scheme": { en: "Sign in to save this scheme", hi: "यह योजना सहेजने के लिए साइन इन करें" },
  "Save scheme": { en: "Save scheme", hi: "योजना सहेजें" },
  "Remove saved scheme": { en: "Remove saved scheme", hi: "सहेजी गई योजना हटाएं" },
  "Saving…": { en: "Saving…", hi: "सहेजा जा रहा है…" },
  "Try again": { en: "Try again", hi: "फिर प्रयास करें" },
  "Hide Connected Graph": { en: "Hide Connected Graph", hi: "जुड़ा ग्राफ छिपाएं" },
  "Explore Related Schemes (Graph)": { en: "Explore Related Schemes (Graph)", hi: "संबंधित योजनाएं देखें (ग्राफ)" },
  "Official Portal ↗": { en: "Official Portal ↗", hi: "आधिकारिक पोर्टल ↗" },
  "Connected Schemes in this Sector:": { en: "Connected Schemes in this Sector:", hi: "इस क्षेत्र की जुड़ी योजनाएं:" },
  "Loading...": { en: "Loading...", hi: "लोड हो रहा है..." },
  "Traversing relationship paths...": { en: "Traversing relationship paths...", hi: "संबंध पथ खोजे जा रहे हैं..." },
  "No additional related schemes found sharing this category.": { en: "No additional related schemes found sharing this category.", hi: "इस श्रेणी में और कोई संबंधित योजना नहीं मिली।" },
  "Showing": { en: "Showing", hi: "दिखाए जा रहे" },
  "Previous": { en: "Previous", hi: "पिछला" },
  "Next": { en: "Next", hi: "अगला" },
  "Page": { en: "Page", hi: "पेज" },
  "Scheme": { en: "Scheme", hi: "योजना" },
  "TARGETS": { en: "TARGETS", hi: "लक्षित" },
  "MANAGED_BY": { en: "MANAGED_BY", hi: "प्रबंधित" },
  "Department": { en: "Department", hi: "विभाग" },
  "Entrepreneurship": { en: "Entrepreneurship", hi: "उद्यमिता", mr: "उद्योजकता", gu: "ઉદ્યમિતા", ta: "தொழில் முனைவோர்", te: "ఉద్యమశీలత", bn: "উদ্যোক্তা", kn: "ಉದ್ಯಮಶೀಲತೆ", ml: "ഉദ്യമശീലത", pa: "ਉਦਯੋਗਪਤ", or: "ଉଦ୍ୟୋଗପତିତ୍ୱ", ur: "کاروباری قیادت" },
  "Skill Development": { en: "Skill Development", hi: "कौशल विकास", mr: "कौशल्य विकास", gu: "કુશળતા વિકાસ", ta: "திறன் மேம்பாடு", te: "నైపుణ్య అభివృద్ధి", bn: "দক্ষতা উন্নয়ন", kn: "ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ", ml: "കൗശല വികസനം", pa: "ਹੁਨਰ ਵਿਕਾਸ", or: "ଦକ୍ଷତା ବିକାଶ", ur: "ہنر کی ترقی" },
  nav_home: { en: "Home", hi: "होम", mr: "मुख्यपृष्ठ", gu: "હોમ", ta: "முகப்பு", te: "హోమ్", bn: "হোম", kn: "ಮುಖಪುಟ" },
  nav_find_schemes: { en: "Find Schemes", hi: "योजनाएं खोजें", mr: "योजना शोधा", gu: "યોજનાઓ શોધો", ta: "திட்டங்களைக் கண்டறியவும்", te: "పథకాలను కనుగొనండి", bn: "প্রকল্প খুঁজুন", kn: "ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ" },
  nav_categories: { en: "Categories", hi: "श्रेणियां", mr: "श्रेणी", gu: "શ્રેણીઓ", ta: "வகைகள்", te: "వర్గాలు", bn: "বিভাগ", kn: "ವರ್ಗಗಳು" },
  nav_graph: { en: "Scheme Graph", hi: "योजना ग्राफ", mr: "योजना आलेख", gu: "યોજના ગ્રાફ", ta: "திட்ட வரைபடம்", te: "పథకం గ్రాఫ్", bn: "প্রকল্প গ্রাফ", kn: "ಯೋಜನೆ ಗ್ರಾಫ್" },
  nav_resources: { en: "Resources", hi: "संसाधन", mr: "संसाधने", gu: "સંસાધનો", ta: "வளங்கள்", te: "వనరులు", bn: "সম্পদ", kn: "ಸಂಪನ್ಮೂಲಗಳು" },
  nav_about: { en: "About", hi: "हमारे बारे में", mr: "आमच्याबद्दल", gu: "અમારા વિશે", ta: "எங்களை பற்றி", te: "మా గురించి", bn: "আমাদের সম্পর্কে", kn: "ನಮ್ಮ ಬಗ್ಗೆ" },
  nav_search: { en: "Search", hi: "खोजें", mr: "शोधा", gu: "શોધો", ta: "தேடு", te: "శోధించండి", bn: "অনুসন্ধান", kn: "ಹುಡುಕಿ" },

  // Auth
  sign_in: { en: "Sign in", hi: "साइन इन करें", mr: "साइन इन करा", gu: "સાઇન ઇન કરો", ta: "உள்நுழைக", te: "సైన్ ఇన్", bn: "সাইন ইন করুন", kn: "ಸೈನ್ ಇನ್" },
  sign_out: { en: "Sign out", hi: "साइन आउट", mr: "साइन आउट", gu: "સાઇન આઉટ", ta: "வெளியேறு", te: "సైన్ అవుట్", bn: "সাইন আউট", kn: "ಸೈನ್ ಔಟ್" },
  profile: { en: "My Profile", hi: "मेरी प्रोफ़ाइल", mr: "माझी प्रोफाइल", gu: "મારી પ્રોફાઇલ", ta: "எனது சுயவிவரம்", te: "నా ప్రొఫైల్", bn: "আমার প্রোফাইল", kn: "ನನ್ನ ಪ್ರೊಫೈಲ್" },

  // Home hero
  hero_title: { en: "Find government schemes you're eligible for", hi: "उन सरकारी योजनाओं को खोजें जिनके आप पात्र हैं", mr: "तुम्ही पात्र असलेल्या सरकारी योजना शोधा", gu: "તમે જેના માટે પાત્ર છો તે સરકારી યોજનાઓ શોધો", ta: "நீங்கள் தகுதியுள்ள அரசு திட்டங்களைக் கண்டறியவும்", te: "మీరు అర్హులైన ప్రభుత్వ పథకాలను కనుగొనండి", bn: "আপনি যে সরকারি প্রকল্পগুলির জন্য যোগ্য তা খুঁজুন", kn: "ನೀವು ಅರ್ಹರಾಗಿರುವ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ" },
  hero_subtitle: { en: "Answer a few simple questions and we'll match you with real schemes, explained in plain language.", hi: "कुछ सरल सवालों के जवाब दें और हम आपको असली योजनाओं से जोड़ेंगे, सरल भाषा में समझाया गया।", mr: "काही सोप्या प्रश्नांची उत्तरे द्या आणि आम्ही तुम्हाला योग्य योजनांशी जोडू.", gu: "થોડા સરળ પ્રશ્નોના જવાબ આપો અને અમે તમને સાચી યોજનાઓ સાથે જોડીશું.", ta: "சில எளிய கேள்விகளுக்கு பதிலளியுங்கள், உண்மையான திட்டங்களுடன் பொருத்துவோம்.", te: "కొన్ని సాధారణ ప్రశ్నలకు సమాధానం ఇవ్వండి, నిజమైన పథకాలతో మిమ్మల్ని సరిపోల్చుతాము.", bn: "কয়েকটি সহজ প্রশ্নের উত্তর দিন, আমরা আপনাকে প্রকৃত প্রকল্পের সাথে মেলাবো।", kn: "ಕೆಲವು ಸರಳ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ, ನಾವು ನಿಮ್ಮನ್ನು ನಿಜವಾದ ಯೋಜನೆಗಳೊಂದಿಗೆ ಹೊಂದಿಸುತ್ತೇವೆ." },
  start_now: { en: "Start Now", hi: "अभी शुरू करें", mr: "आता सुरू करा", gu: "હમણાં શરૂ કરો", ta: "இப்போது தொடங்கு", te: "ఇప్పుడు ప్రారంభించండి", bn: "এখনই শুরু করুন", kn: "ಈಗ ಪ್ರಾರಂಭಿಸಿ" },

  // Common actions
  common_continue: { en: "Continue", hi: "जारी रखें", mr: "पुढे जा", gu: "ચાલુ રાખો", ta: "தொடரவும்", te: "కొనసాగించండి", bn: "চালিয়ে যান", kn: "ಮುಂದುವರಿಸಿ" },
  common_back: { en: "Back", hi: "वापस", mr: "मागे", gu: "પાછળ", ta: "பின்", te: "వెనుకకు", bn: "ফিরে যান", kn: "ಹಿಂದೆ" },
  common_edit: { en: "Edit", hi: "संपादित करें", mr: "संपादित करा", gu: "સંપાદિત કરો", ta: "திருத்து", te: "సవరించండి", bn: "সম্পাদনা করুন", kn: "ಸಂಪಾದಿಸಿ" },
  common_loading: { en: "Loading...", hi: "लोड हो रहा है...", mr: "लोड होत आहे...", gu: "લોડ થઈ રહ્યું છે...", ta: "ஏற்றுகிறது...", te: "లోడ్ అవుతోంది...", bn: "লোড হচ্ছে...", kn: "ಲೋಡ್ ಆಗುತ್ತಿದೆ..." },

  // Wizard step 1 -- personal info
  wizard_personal_title: { en: "Let's start with some basic information", hi: "आइए कुछ बुनियादी जानकारी से शुरू करें", mr: "चला काही मूलभूत माहितीने सुरुवात करूया", gu: "ચાલો કેટલીક મૂળભૂત માહિતીથી શરૂ કરીએ", ta: "சில அடிப்படை தகவல்களுடன் தொடங்குவோம்", te: "కొన్ని ప్రాథమిక వివరాలతో ప్రారంభిద్దాం", bn: "কিছু মৌলিক তথ্য দিয়ে শুরু করা যাক", kn: "ಕೆಲವು ಮೂಲ ಮಾಹಿತಿಯೊಂದಿಗೆ ಪ್ರಾರಂಭಿಸೋಣ" },
  wizard_personal_edit_title: { en: "Update your personal information", hi: "अपनी व्यक्तिगत जानकारी अपडेट करें", mr: "तुमची वैयक्तिक माहिती अद्यतनित करा", gu: "તમારી વ્યક્તિગત માહિતી અપડેટ કરો", ta: "உங்கள் தனிப்பட்ட தகவலைப் புதுப்பிக்கவும்", te: "మీ వ్యక్తిగత సమాచారాన్ని నవీకరించండి", bn: "আপনার ব্যক্তিগত তথ্য আপডেট করুন", kn: "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ನವೀಕರಿಸಿ" },

  // Wizard step 4 -- review
  review_title: { en: "Review your information", hi: "अपनी जानकारी की समीक्षा करें", mr: "तुमच्या माहितीचे पुनरावलोकन करा", gu: "તમારી માહિતીની સમીક્ષા કરો", ta: "உங்கள் தகவலை மதிப்பாய்வு செய்யவும்", te: "మీ సమాచారాన్ని సమీక్షించండి", bn: "আপনার তথ্য পর্যালোচনা করুন", kn: "ನಿಮ್ಮ ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ" },
  review_find_matches: { en: "Find Matching Schemes", hi: "मेल खाती योजनाएं खोजें", mr: "जुळणाऱ्या योजना शोधा", gu: "મેળ ખાતી યોજનાઓ શોધો", ta: "பொருந்தும் திட்டங்களைக் கண்டறியவும்", te: "సరిపోలే పథకాలను కనుగొనండి", bn: "মিলিত প্রকল্প খুঁজুন", kn: "ಹೊಂದಾಣಿಕೆಯ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ" },

  // Wizard step 5 -- results
  results_title: { en: "Schemes matched for you", hi: "आपके लिए मिलान की गई योजनाएं", mr: "तुमच्यासाठी जुळलेल्या योजना", gu: "તમારા માટે મેળ ખાતી યોજનાઓ", ta: "உங்களுக்குப் பொருந்திய திட்டங்கள்", te: "మీ కోసం సరిపోలిన పథకాలు", bn: "আপনার জন্য মিলিত প্রকল্প", kn: "ನಿಮಗಾಗಿ ಹೊಂದಿಸಿದ ಯೋಜನೆಗಳು" },
  results_subtitle: { en: "Based on your profile, our matching engine checked every scheme's eligibility rules and explains why each one matched.", hi: "आपकी प्रोफ़ाइल के आधार पर, हमारे मिलान इंजन ने हर योजना के पात्रता नियमों की जांच की और बताया कि हर एक क्यों मेल खाती है।", mr: "तुमच्या प्रोफाइलवर आधारित, आमच्या जुळणी इंजिनने प्रत्येक योजनेचे पात्रता नियम तपासले आणि प्रत्येक का जुळली ते स्पष्ट केले.", gu: "તમારી પ્રોફાઇલના આધારે, અમારા મેચિંગ એન્જિને દરેક યોજનાના પાત્રતા નિયમો તપાસ્યા અને દરેક શા માટે મેળ ખાય છે તે સમજાવ્યું.", ta: "உங்கள் சுயவிவரத்தின் அடிப்படையில், எங்கள் பொருத்தும் இயந்திரம் ஒவ்வொரு திட்டத்தின் தகுதி விதிகளையும் சரிபார்த்தது.", te: "మీ ప్రొఫైల్ ఆధారంగా, మా మ్యాచింగ్ ఇంజిన్ ప్రతి పథకం అర్హత నియమాలను తనిఖీ చేసింది.", bn: "আপনার প্রোফাইলের ভিত্তিতে, আমাদের ম্যাচিং ইঞ্জিন প্রতিটি প্রকল্পের যোগ্যতার নিয়ম পরীক্ষা করেছে।", kn: "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಆಧಾರದ ಮೇಲೆ, ನಮ್ಮ ಮ್ಯಾಚಿಂಗ್ ಎಂಜಿನ್ ಪ್ರತಿ ಯೋಜನೆಯ ಅರ್ಹತಾ ನಿಯಮಗಳನ್ನು ಪರಿಶೀಲಿಸಿದೆ." },

  // Profile page
  profile_signed_out_note: { en: "Not provided", hi: "उपलब्ध नहीं", mr: "उपलब्ध नाही", gu: "ઉપલબ્ધ નથી", ta: "வழங்கப்படவில்லை", te: "అందించలేదు", bn: "প্রদান করা হয়নি", kn: "ಒದಗಿಸಿಲ್ಲ" },

  // AI Assistant
  assistant_title: { en: "AI Scheme Assistant", hi: "एआई योजना सहायक", mr: "एआय योजना सहाय्यक", gu: "AI योजना સહાયક", ta: "AI திட்ட உதவியாளர்", te: "AI పథక సహాయకుడు", bn: "এআই স্কিম সহায়ক", kn: "AI ಯೋಜನಾ ಸಹಾಯಕ" },
  assistant_placeholder: { en: "Type your message...", hi: "अपना संदेश लिखें...", mr: "तुमचा संदेश टाइप करा...", gu: "તમારો સંદેશ ટાઇપ કરો...", ta: "உங்கள் செய்தியை தட்டச்சு செய்யவும்...", te: "మీ సందేశాన్ని టైప్ చేయండి...", bn: "আপনার বার্তা টাইপ করুন...", kn: "ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ..." },

  // Homepage / public pages
  homepage_badge: { en: "AI-POWERED DISCOVERY", hi: "एआई-संचालित खोज", mr: "एआय-संचालित शोध", gu: "AI-સંચालित શોધ", ta: "AI-இயங்கும் கண்டுபிடிப்பு", te: "AI-ఆధారిత అన్వేషణ", bn: "AI-চালিত আবিষ্কার", kn: "AI-ಚಾಲಿತ ಅನ್ವೇಷಣೆ" },
  homepage_title_line1: { en: "Find Government", hi: "सरकारी योजनाएं", mr: "सरकारी योजना", gu: "સરકારી યોજનાઓ", ta: "அரசு திட்டங்களை", te: "ప్రభుత్వ పథకాలను", bn: "সরকারি প্রকল্প খুঁজুন", kn: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು" },
  homepage_title_line2: { en: "Schemes You", hi: "खोजें जो", mr: "शोधा ज्यांची", gu: "ખોજો જે", ta: "கண்டறியவும்", te: "కనుగొనండి", bn: "খুঁজুন যেগুলি", kn: "ಹುಡುಕಿ" },
  homepage_highlight: { en: "Actually Qualify For", hi: "आप वास्तव में पात्र हैं", mr: "खरंच पात्र आहात", gu: "તમે વાસ્તવમાં પાત્ર છો", ta: "நீங்கள் உண்மையில் தகுதியுள்ளீர்கள்", te: "మీరు వాస్తవంగా అర్హులు", bn: "আপনি প্রকৃতপক্ষে যোগ্য", kn: "ನೀವು ನಿಜವಾಗಿಯೂ ಅರ್ಹರಾಗಿರುವ" },
  homepage_subtitle: {"en":"AI-driven scheme matching that connects citizens with relevant government schemes, welfare programs, education, healthcare, employment, and skill development opportunities.","hi":"एआई-संचालित योजना मिलान जो नागरिकों को प्रासंगिक सरकारी योजनाओं, कल्याण कार्यक्रमों, शिक्षा, स्वास्थ्य सेवा, रोजगार और कौशल विकास के अवसरों से जोड़ता है।","mr":"एआय-आधारित योजना जुळणी नागरिकांना संबंधित सरकारी योजना, कल्याण कार्यक्रम, शिक्षण, आरोग्यसेवा, रोजगार आणि कौशल्य विकासाच्या संधींशी जोडते.","gu":"એઆઈ આધારિત યોજના મેળવણી નાગરિકોને સંબંધિત સરકારી યોજનાઓ, કલ્યાણ કાર્યક્રમો, શિક્ષણ, આરોગ્યસંભાળ, રોજગાર અને કૌશલ્ય વિકાસની તકો સાથે જોડે છે.","ta":"AI சார்ந்த திட்டப் பொருத்தம் குடிமக்களை தொடர்புடைய அரசுத் திட்டங்கள், நலத்திட்டங்கள், கல்வி, சுகாதாரம், வேலைவாய்ப்பு மற்றும் திறன் மேம்பாட்டு வாய்ப்புகளுடன் இணைக்கிறது.","te":"AI ఆధారిత పథక సరిపోలిక పౌరులను సంబంధిత ప్రభుత్వ పథకాలు, సంక్షేమ కార్యక్రమాలు, విద్య, ఆరోగ్య సంరక్షణ, ఉపాధి మరియు నైపుణ్యాభివృద్ధి అవకాశాలతో అనుసంధానిస్తుంది.","bn":"এআই-চালিত প্রকল্প মিলন নাগরিকদের প্রাসঙ্গিক সরকারি প্রকল্প, কল্যাণ কর্মসূচি, শিক্ষা, স্বাস্থ্যসেবা, কর্মসংস্থান ও দক্ষতা উন্নয়নের সুযোগের সঙ্গে যুক্ত করে।","kn":"AI ಆಧಾರಿತ ಯೋಜನೆ ಹೊಂದಾಣಿಕೆ ನಾಗರಿಕರನ್ನು ಸಂಬಂಧಿತ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು, ಕಲ್ಯಾಣ ಕಾರ್ಯಕ್ರಮಗಳು, ಶಿಕ್ಷಣ, ಆರೋಗ್ಯಸೇವೆ, ಉದ್ಯೋಗ ಮತ್ತು ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ ಅವಕಾಶಗಳೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ."},
  homepage_cta_find: { en: "Find Schemes Now", hi: "अभी योजनाएं खोजें", mr: "आता योजना शोधा", gu: "હમણાં યોજનાઓ શોધો", ta: "இப்போது திட்டங்களைக் கண்டறியவும்", te: "ఇప్పుడే పథకాలను కనుగొనండి", bn: "এখনই প্রকল্প খুঁজুন", kn: "ಈಗ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ" },
  homepage_cta_explore: { en: "Explore Categories", hi: "श्रेणियाँ देखें", mr: "श्रेणी पाहा", gu: "શ્રેણીઓ જુઓ", ta: "வகைகளை ஆராயுங்கள்", te: "వర్గాలను అన్వేషించండి", bn: "বিভাগ দেখুন", kn: "ವರ್ಗಗಳನ್ನು ಅನ್ವೇಷಿಸಿ" },
  homepage_stats_dataset: {"en": "Research Dataset Records", "hi": "शोध डेटा के रिकॉर्ड", "mr": "संशोधन डेटातील नोंदी", "gu": "સંશોધન ડેટાના રેકોર્ડ", "ta": "ஆய்வுத் தரவுப் பதிவுகள்", "te": "పరిశోధన డేటా రికార్డులు", "bn": "গবেষণা তথ্যের রেকর্ড", "kn": "ಸಂಶೋಧನಾ ದತ್ತಾಂಶ ದಾಖಲೆಗಳು"},
  homepage_stats_reviewed: {"en": "reviewed schemes in live catalogue", "hi": "समीक्षित योजनाएं लाइव सूची में", "mr": "पुनरावलोकित योजना सध्याच्या यादीत", "gu": "સમીક્ષા કરેલી યોજનાઓ હાલની યાદીમાં", "ta": "மதிப்பாய்வு செய்யப்பட்ட திட்டங்கள் தற்போதைய பட்டியலில்", "te": "సమీక్షించిన పథకాలు ప్రస్తుత జాబితాలో", "bn": "পর্যালোচিত প্রকল্প বর্তমান তালিকায়", "kn": "ಪರಿಶೀಲಿಸಿದ ಯೋಜನೆಗಳು ಪ್ರಸ್ತುತ ಪಟ್ಟಿಯಲ್ಲಿ"},
  homepage_stats_schemes: { en: "Government Schemes", hi: "सरकारी योजनाएं", mr: "सरकारी योजना", gu: "સરકારી યોજનાઓ", ta: "அரசு திட்டங்கள்", te: "ప్రభుత్వ పథకాలు", bn: "সরকারি প্রকল্প", kn: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು" },
  homepage_stats_categories: { en: "Sector Categories", hi: "क्षेत्र श्रेणियाँ", mr: "क्षेत्र श्रेणी", gu: "સેક્ટર શ્રેણીઓ", ta: "துறை வகைகள்", te: "సెక్టార్ వర్గాలు", bn: "সেক্টর বিভাগ", kn: "ವಲಯ ವರ್ಗಗಳು" },
  home_support: { en: "Support", hi: "सहायता", mr: "सहाय्य", gu: "સહાય", ta: "உதவி", te: "మద్దతు", bn: "সহায়তা", kn: "ಬೆಂಬಲ" },
  home_training: { en: "Training", hi: "प्रशिक्षण", mr: "प्रशिक्षण", gu: "તાલીમ", ta: "பயிற்சி", te: "శిక్షణ", bn: "প্রशिक्षণ", kn: "ತರಬೇತಿ" },
  homepage_stats_states: { en: "States & UTs Covered", hi: "आच्छादित राज्य और केंद्र शासित प्रदेश", mr: "कवरेत राज्य आणि केंद्रशासित प्रदेश", gu: "આવરીત રાજ્યો અને કેન્દ્ર-શાસित પ્રદેશો", ta: "கவர் செய்யப்பட்ட மாநிலங்கள் மற்றும் ஒன்றியப் பகுதிகள்", te: "మొత్తం రాష్ట్రాలు మరియు కేంద్రపాలిత ప్రాంతాలు", bn: "আচ্ছাদিত রাজ্য ও কেন্দ্রশাসিত অঞ্চল", kn: "ಕವರಿತ ರಾಜ್ಯಗಳು ಮತ್ತು కేంద్రಾಡಳಿತ ಪ್ರದೇಶಗಳು" },
  homepage_stats_guidance: { en: "Clear Guidance", hi: "स्पष्ट मार्गदर्शन", mr: "स्पष्ट मार्गदर्शन", gu: "સ્પષ્ટ માર્ગદર્શન", ta: "தெளிவான வழிகாட்டுதல்", te: "స్పష్టమైన మార్గదర్శకం", bn: "স্পষ্ট নির্দেশনা", kn: "ಸ್ಪಷ್ಟ ಮಾರ್ಗದರ್ಶನ" },
  homepage_stats_screening: { en: "Preliminary Screening", hi: "प्रारंभिक स्क्रीनिंग", mr: "प्रारंभिक स्क्रीनिंग", gu: "પ્રારંભિક સ્ક्रीनિંગ", ta: "தொடக்க திரையிடல்", te: "ప్రాథమిక స్క్రీనింగ్", bn: "প্রাথমিক স্ক্রিনিং", kn: "ಪ್ರಾಥಮಿಕ ಸ್ಕ್ರೀನಿಂಗ್" },
  "What government schemes might I be eligible for?": {"en":"What government schemes might I be eligible for?","hi":"मैं किन सरकारी योजनाओं के लिए पात्र हो सकता हूँ?","mr":"मी कोणत्या सरकारी योजनांसाठी पात्र असू शकतो?","gu":"હું કઈ સરકારી યોજનાઓ માટે પાત્ર હોઈ શકું?","ta":"எந்த அரசுத் திட்டங்களுக்கு நான் தகுதி பெறலாம்?","te":"నేను ఏ ప్రభుత్వ పథకాలకు అర్హుడిని కావచ్చు?","bn":"আমি কোন সরকারি প্রকল্পের জন্য যোগ্য হতে পারি?","kn":"ನಾನು ಯಾವ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳಿಗೆ ಅರ್ಹನಾಗಿರಬಹುದು?"},
  "Are there government schemes for students?": {"en":"Are there government schemes for students?","hi":"क्या छात्रों के लिए सरकारी योजनाएं हैं?","mr":"विद्यार्थ्यांसाठी सरकारी योजना आहेत का?","gu":"શું વિદ્યાર્થીઓ માટે સરકારી યોજનાઓ છે?","ta":"மாணவர்களுக்கான அரசுத் திட்டங்கள் உள்ளனவா?","te":"విద్యార్థుల కోసం ప్రభుత్వ పథకాలు ఉన్నాయా?","bn":"শিক্ষার্থীদের জন্য কি সরকারি প্রকল্প আছে?","kn":"ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳಿವೆಯೇ?"},
  "Which schemes are available in my state?": {"en":"Which schemes are available in my state?","hi":"मेरे राज्य में कौन सी योजनाएं उपलब्ध हैं?","mr":"माझ्या राज्यात कोणत्या योजना उपलब्ध आहेत?","gu":"મારા રાજ્યમાં કઈ યોજનાઓ ઉપલબ્ધ છે?","ta":"என் மாநிலத்தில் எந்தத் திட்டங்கள் கிடைக்கின்றன?","te":"నా రాష్ట్రంలో ఏ పథకాలు అందుబాటులో ఉన్నాయి?","bn":"আমার রাজ্যে কোন প্রকল্পগুলি উপলব্ধ?","kn":"ನನ್ನ ರಾಜ್ಯದಲ್ಲಿ ಯಾವ ಯೋಜನೆಗಳು ಲಭ್ಯವಿವೆ?"},
  "Are there education or scholarship schemes for me?": {"en":"Are there education or scholarship schemes for me?","hi":"क्या मेरे लिए शिक्षा या छात्रवृत्ति की योजनाएं हैं?","mr":"माझ्यासाठी शिक्षण किंवा शिष्यवृत्ती योजना आहेत का?","gu":"શું મારા માટે શિક્ષણ અથવા શિષ્યવૃત્તિ યોજનાઓ છે?","ta":"எனக்கான கல்வி அல்லது உதவித்தொகைத் திட்டங்கள் உள்ளனவா?","te":"నా కోసం విద్య లేదా స్కాలర్‌షిప్ పథకాలు ఉన్నాయా?","bn":"আমার জন্য কি শিক্ষা বা বৃত্তির প্রকল্প আছে?","kn":"ನನಗಾಗಿ ಶಿಕ್ಷಣ ಅಥವಾ ವಿದ್ಯಾರ್ಥಿವೇತನ ಯೋಜನೆಗಳಿವೆಯೇ?"},
  "Are there healthcare or welfare schemes I may qualify for?": {"en":"Are there healthcare or welfare schemes I may qualify for?","hi":"क्या ऐसी स्वास्थ्य सेवा या कल्याण योजनाएं हैं जिनके लिए मैं पात्र हो सकता हूँ?","mr":"मी पात्र ठरू शकेन अशा आरोग्यसेवा किंवा कल्याण योजना आहेत का?","gu":"શું એવી આરોગ્યસંભાળ કે કલ્યાણ યોજનાઓ છે જેના માટે હું પાત્ર હોઈ શકું?","ta":"நான் தகுதி பெறக்கூடிய சுகாதார அல்லது நலத்திட்டங்கள் உள்ளனவா?","te":"నేను అర్హత పొందగల ఆరోగ్య సంరక్షణ లేదా సంక్షేమ పథకాలు ఉన్నాయా?","bn":"আমি যোগ্য হতে পারি এমন স্বাস্থ্যসেবা বা কল্যাণ প্রকল্প আছে কি?","kn":"ನಾನು ಅರ್ಹನಾಗಬಹುದಾದ ಆರೋಗ್ಯಸೇವೆ ಅಥವಾ ಕಲ್ಯಾಣ ಯೋಜನೆಗಳಿವೆಯೇ?"},
  "Which employment or skill-development schemes can I apply for?": {"en":"Which employment or skill-development schemes can I apply for?","hi":"मैं किन रोजगार या कौशल विकास योजनाओं के लिए आवेदन कर सकता हूँ?","mr":"मी कोणत्या रोजगार किंवा कौशल्य विकास योजनांसाठी अर्ज करू शकतो?","gu":"હું કઈ રોજગાર અથવા કૌશલ્ય વિકાસ યોજનાઓ માટે અરજી કરી શકું?","ta":"எந்த வேலைவாய்ப்பு அல்லது திறன் மேம்பாட்டுத் திட்டங்களுக்கு நான் விண்ணப்பிக்கலாம்?","te":"నేను ఏ ఉపాధి లేదా నైపుణ్యాభివృద్ధి పథకాలకు దరఖాస్తు చేయవచ్చు?","bn":"আমি কোন কর্মসংস্থান বা দক্ষতা উন্নয়ন প্রকল্পে আবেদন করতে পারি?","kn":"ನಾನು ಯಾವ ಉದ್ಯೋಗ ಅಥವಾ ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ ಯೋಜನೆಗಳಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಬಹುದು?"},
  "What documents do I need?": {"en":"What documents do I need?","hi":"मुझे किन दस्तावेज़ों की आवश्यकता है?","mr":"मला कोणती कागदपत्रे लागतील?","gu":"મારે કયા દસ્તાવેજોની જરૂર છે?","ta":"எனக்கு என்ன ஆவணங்கள் தேவை?","te":"నాకు ఏ పత్రాలు అవసరం?","bn":"আমার কী কী নথি প্রয়োজন?","kn":"ನನಗೆ ಯಾವ ದಾಖಲೆಗಳು ಬೇಕು?"},
  "How can I apply for my matched scheme?": {"en":"How can I apply for my matched scheme?","hi":"मैं अपनी मिलान की गई योजना के लिए कैसे आवेदन कर सकता हूँ?","mr":"माझ्याशी जुळलेल्या योजनेसाठी मी अर्ज कसा करू?","gu":"મારી સાથે મેળ ખાતી યોજના માટે હું કેવી રીતે અરજી કરું?","ta":"எனக்குப் பொருந்திய திட்டத்திற்கு நான் எப்படி விண்ணப்பிப்பது?","te":"నాకు సరిపోయిన పథకానికి ఎలా దరఖాస్తు చేయాలి?","bn":"আমার সঙ্গে মিলে যাওয়া প্রকল্পে কীভাবে আবেদন করব?","kn":"ನನಗೆ ಹೊಂದುವ ಯೋಜನೆಗೆ ಹೇಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಬಹುದು?"},
  "How does SchemeSaathi calculate my match?": {"en":"How does SchemeSaathi calculate my match?","hi":"SchemeSaathi मेरे मिलान की गणना कैसे करता है?","mr":"SchemeSaathi माझी योजना जुळणी कशी मोजते?","gu":"SchemeSaathi મારા મેળની ગણતરી કેવી રીતે કરે છે?","ta":"SchemeSaathi எனது பொருத்தத்தை எவ்வாறு கணக்கிடுகிறது?","te":"SchemeSaathi నా సరిపోలికను ఎలా లెక్కిస్తుంది?","bn":"SchemeSaathi আমার মিল কীভাবে গণনা করে?","kn":"SchemeSaathi ನನ್ನ ಹೊಂದಾಣಿಕೆಯನ್ನು ಹೇಗೆ ಲೆಕ್ಕಿಸುತ್ತದೆ?"},
  "Can I update my details later?": {"en":"Can I update my details later?","hi":"क्या मैं बाद में अपना विवरण बदल सकता हूँ?","mr":"मी नंतर माझे तपशील बदलू शकतो का?","gu":"શું હું પછી મારી વિગતો બદલી શકું?","ta":"எனது விவரங்களைப் பிறகு மாற்ற முடியுமா?","te":"నేను నా వివరాలను తరువాత మార్చవచ్చా?","bn":"আমি কি পরে আমার তথ্য পরিবর্তন করতে পারি?","kn":"ನಂತರ ನನ್ನ ವಿವರಗಳನ್ನು ಬದಲಾಯಿಸಬಹುದೇ?"},
  footer_citizen_description: {"en":"Empowering citizens with the right government support.","hi":"सही सरकारी सहायता से नागरिकों को सशक्त बनाना।","mr":"योग्य सरकारी सहाय्याने नागरिकांना सक्षम करणे.","gu":"યોગ્ય સરકારી સહાયથી નાગરિકોને સશક્ત બનાવવું.","ta":"சரியான அரசு ஆதரவுடன் குடிமக்களை மேம்படுத்துதல்.","te":"సరైన ప్రభుత్వ సహాయంతో పౌరులను సాధికారులుగా చేయడం.","bn":"সঠিক সরকারি সহায়তায় নাগরিকদের ক্ষমতায়ন।","kn":"ಸರಿಯಾದ ಸರ್ಕಾರಿ ನೆರವಿನಿಂದ ನಾಗರಿಕರನ್ನು ಸಬಲಗೊಳಿಸುವುದು."},
  audience_title: {"en":"Built for Citizens, Especially Underserved Communities","hi":"नागरिकों के लिए, विशेष रूप से वंचित समुदायों के लिए बनाया गया","mr":"नागरिकांसाठी, विशेषतः वंचित समुदायांसाठी तयार केलेले","gu":"નાગરિકો માટે, ખાસ કરીને વંચિત સમુદાયો માટે બનાવેલ","ta":"குடிமக்களுக்காக, குறிப்பாக சேவைகள் குறைவாகக் கிடைக்கும் சமூகங்களுக்காக உருவாக்கப்பட்டது","te":"పౌరుల కోసం, ముఖ్యంగా సేవలు తక్కువగా అందే సమాజాల కోసం రూపొందించబడింది","bn":"নাগরিকদের জন্য, বিশেষ করে সুবিধাবঞ্চিত সম্প্রদায়ের জন্য তৈরি","kn":"ನಾಗರಿಕರಿಗಾಗಿ, ವಿಶೇಷವಾಗಿ ಸೇವೆಗಳು ಕಡಿಮೆ ದೊರೆಯುವ ಸಮುದಾಯಗಳಿಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ"},
  audience_women: { en: "Women", hi: "महिलाएं", mr: "महिलां", gu: "સ્ત્રીઓ", ta: "பெண்கள்", te: "మహిళలు", bn: "নারী", kn: "ಮಹಿಳೆಯರು" },
  audience_scst: { en: "SC/ST", hi: "अनुसूचित जाति/जनजाति", mr: "SC/ST", gu: "SC/ST", ta: "SC/ST", te: "SC/ST", bn: "SC/ST", kn: "SC/ST" },
  audience_obc: { en: "OBC", hi: "ओबीसी", mr: "ओबीसी", gu: "ઓબીસી", ta: "பிற்படுத்தப்பட்டோருக்கான", te: "OBC", bn: "OBC", kn: "OBC" },
  audience_minority: { en: "Minorities", hi: "अल्पसंख्यक", mr: "अल्पसंख्यक", gu: "અल्पસંખ્યકો", ta: "சிறுபான்மையினர்", te: "మినారిటీల", bn: "সংখ্যালঘু", kn: "ಸಂಖ್ಯಲಘು" },
  audience_rural: { en: "Rural", hi: "ग्रामीण", mr: "ग्रामीण", gu: "ગ્રામીણ", ta: "கிராமப்புற", te: "గ్రామీణ", bn: "গ্রামীণ", kn: "ಗ್ರಾಮೀಣ" },
  audience_first_time: { en: "First-time business owners", hi: "पहली बार व्यवसाय शुरू करने वाले", mr: "पहिल्यांदा व्यवसाय सुरू करणारे", gu: "પ્રથમ વખત વ્યવસાય શરૂ કરનારા", ta: "முதல் முறை தொழில் தொடங்குபவர்கள்", te: "మొద lần వ్యాపారం ప్రారంభించేవారు", bn: "প্রথমবার ব্যবসা চালু করতে চান এমনরা", kn: "ಮೊದಲ ಬಾರಿಗೆ ವ್ಯಾಪಾರ ಆರಂಭಿಸುವವರು" },

  categories_page_badge: { en: "SchemeSaathi", hi: "स्कीमसाथी - SchemeSaathi", mr: "स्कीमसाथी - SchemeSaathi", gu: "સ્કીમસાથી - SchemeSaathi", ta: "ஸ்கீம்சாதி - SchemeSaathi", te: "స్కీమసాధీ - SchemeSaathi", bn: "স্কীমসাথি - SchemeSaathi", kn: "ಸ್ಕೀಮಸಾಥಿ - SchemeSaathi" },
  categories_page_title: { en: "Explore government schemes", hi: "सरकारी योजनाएं देखें", mr: "सरकारी योजना एक्सप्लोर करा", gu: "સરકારી યોજનાઓ શોધો", ta: "அரசு திட்டங்களை ஆராயுங்கள்", te: "ప్రభుత్వ పథకాలను అన్వేషించండి", bn: "সরকারি প্রকল্প দেখুন", kn: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ" },
  categories_page_subtitle: { en: "Search business finance, self-employment, skills and inclusion support. Use Find Schemes for screening against your profile.", hi: "व्यवसाय वित्त, स्वरोजगार, कौशल और समावेशन सहायता खोजें। अपनी प्रोफ़ाइल के अनुसार स्क्रीनिंग के लिए योजनाएं खोजें।", mr: "व्यवसाय वित्त, स्व-रोजगार, कौशल्य आणि समावेशन मदत शोधा. तुमच्या प्रोफाइलवर स्क्रीनिंगसाठी योजना वापरा.", gu: "વ્યાવસાયિક ફાઇનાન્સ, સ્વ-રોજગારી, કુશળતા અને સમાવેશ સહાય શોધો. તમારી પ્રોફાઇલ સામે સ્ક્રીનિંગ માટે ફાઇન્ડ સ્કીમ્સનો ઉપયોગ કરો.", ta: "வணிக நிதி, சுயதொழில், திறன்கள் மற்றும் உள்ளடக்கம் உதவியைத் தேடுங்கள். உங்கள் சுயவிவரத்துடன் திரையிடுவதற்கு திட்டங்களைக் கண்டறியவும்.", te: "వ్యాపార ఆర్థిక సహాయం, స్వయం ఉపాధి, నైపుణ్యం మరియు చేర్చు సాయం కోసం శోధించండి. మీ ప్రొఫైల్ ఆధారంగా స్క్రీనింగ్ కోసం పథకాలను కనుగొనండి.", bn: "ব্যবসায়িক অর্থ, স্ব-নিয়োগ, দক্ষতা এবং অন্তর্ভুক্তি সহায়তা খুঁজুন। আপনার প্রোফাইলের বিরুদ্ধে স্ক্রিনিংয়ের জন্য প্রকল্প খুঁজুন।", kn: "ವ್ಯವಹಾರದ ಹಣಕಾಸು, ಸ್ವನಿಯೋಗ, ಕೌಶಲ್ಯ ಮತ್ತು ಒಳಗೊಂಡಿರುವ ಸಹಾಯವನ್ನು ಹುಡುಕಿ. ನಿಮ್ಮ ಪ್ರೊಫೈಲ್‌ಗೆ ವಿರುದ್ಧ ಸ್ಕ್ರೀನಿಂಗ್‌ಗಾಗಿ ಯೋಜನೆಗಳ ಹುಡುಕಾಟ ಬಳಸಿ." },
  categories_search_label: { en: "Search schemes", hi: "योजनाएं खोजें", mr: "योजना शोधा", gu: "યોજનાઓ શોધો", ta: "திட்டங்களைத் தேடு", te: "పథకాలను శోధించండి", bn: "প্রকল্প খুঁজুন", kn: "ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ" },
  categories_search_placeholder: { en: "Scheme name or keywords, e.g. MUDRA, women loan, tailoring", hi: "योजना का नाम या कीवर्ड, उदाहरण: MUDRA, महिला ऋण, कढ़ाई", mr: "योजनेचे नाव किंवा कीवर्ड, उदा. MUDRA, महिला कर्ज, कापडकाम", gu: "યોજના નામ અથવા કીવર્ડ, ઉદાહરણ: MUDRA, મહિલા લોન, ટેલરિંગ", ta: "திட்டத்தின் பெயர் அல்லது முக்கிய சொற்கள், எடுத்துக்காட்டு: MUDRA, பெண்கள் கடன், தையல்", te: "పథకం పేరు లేదా కీవర్డ్, ఉదాహరణ: MUDRA, మహిళా రుణం, టైలరింగ్", bn: "প্রকল্পের নাম বা কীওয়ার্ড, উদাহরণ: MUDRA, মহিলাদের ঋণ, টেইলরিং", kn: "ಯೋಜನೆ ಹೆಸರು ಅಥವಾ ಕೀವರ್ಡ್, ಉದಾಹರಣೆಗೆ: MUDRA, ಮಹಿಳೆಯರ ಸಾಲ, ಟೇಲರಿಂಗ್" },
  categories_searching: { en: "Searching catalogue...", hi: "कैटलॉग खोजा जा रहा है...", mr: "कॅटलॉग शोधत आहे...", gu: "કેટાલોગ શોધી રહ્યા છીએ...", ta: "கேடலாக் தேடப்படுகிறது...", te: "కేటలాగ్ శోధిస్తున్నాం...", bn: "ক্যাটালগ খুঁজছি...", kn: "ಕ್ಯಾಟಲಾಗ್ ಹುಡುಕಲಾಗುತ್ತಿದೆ..." },
  categories_retry: { en: "Retry search", hi: "फिर से खोजें", mr: "पुन्हा शोधा", gu: "ફરીથી શોધો", ta: "மீண்டும் தேடவும்", te: "మళ్లీ శోధించండి", bn: "আবার খুঁজুন", kn: "ಮತ್ತೆ ಹುಡುಕಿ" },
  categories_found: { en: "schemes found", hi: "योजनाएं मिलीं", mr: "योजना सापडल्या", gu: "યોજનાઓ મળી", ta: "திட்டங்கள் கிடைத்தன", te: "పథకాలు దొరికాయి", bn: "প্রকল্প পাওয়া গেছে", kn: "ಯೋಜನೆಗಳು ಸಿಕ್ಕಿವೆ" },
  categories_all: { en: "All schemes", hi: "सभी योजनाएं", mr: "सर्व योजना", gu: "બધી યોજનાઓ", ta: "அனைத்து திட்டங்கள்", te: "అన్ని పథకాలు", bn: "সব প্রকল্প", kn: "ಎಲ್ಲಾ ಯೋಜನೆಗಳು" },
  categories_no_match: { en: "No matching schemes", hi: "कोई मेल खाने वाली योजना नहीं", mr: "जुळणारी योजना नाही", gu: "મેળ ખાતી કોઈ યોજનાઓ નથી", ta: "பொருந்தும் திட்டங்கள் இல்லை", te: "సరిపోలే పథకాలు లేవు", bn: "মিলছে এমন প্রকল্প নেই", kn: "ಹೊಂದಾಣಿಕೆಯ ಯೋಜನೆಗಳಿಲ್ಲ" },
  categories_no_match_hint: { en: "Try fewer keywords or remove the category filter.", hi: "कम कीवर्ड आजमाएं या श्रेणी फ़िल्टर निकालें।", mr: "कमी कीवर्ड वापरून पहा किंवा श्रेणी फिल्टर काढा.", gu: "ઓછા કીવર્ડ્સ અજમાવો અથવા કેટેગરી ફિલ્ટર દૂર કરો.", ta: "குறைந்த முக்கிய சொற்களை முயற்சிக்கவும் அல்லது வகை வடிகட்டியை நீக்கவும்.", te: "తక్కువ కీవర్డ్‌లను ప్రయత్నించండి లేదా వర్గం ఫిల్టర్‌ను తీసివేయండి.", bn: "কম কীওয়ার্ড ব্যবহার করুন বা ক্যাটাগরি ফিল্টার সরিয়ে দিন।", kn: "ಕಡಿಮೆ ಕೀವರ್ಡ್‌ಗಳನ್ನು ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ವಿಭಾಗ ಫಿಲ್ಟರ್ ಅನ್ನು ತೆಗೆದುಹಾಕಿ." },
  categories_clear: { en: "Clear search and filters", hi: "खोज और फ़िल्टर साफ़ करें", mr: "शोध आणि फिल्टर साफ करा", gu: "શોધ અને ફિલ્ટર સાફ કરો", ta: "தேடல் மற்றும் வடிகட்டிகளை அழிக்கவும்", te: "శోధన మరియు ఫిల్టర్‌లను క్లియర్ చేయండి", bn: "অনুসন্ধান ও ফিল্টার পরিষ্কার করুন", kn: "ಹುಡುಕಾಟ ಮತ್ತು ಫಿಲ್ಟರ್‌ಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ" },
  categories_hide_details: { en: "Hide details", hi: "विवरण छुपाएं", mr: "तपशील लपवा", gu: "વિગતો છુપાવો", ta: "விவரங்களை மறைக்கவும்", te: "వివరాలను దాచండి", bn: "বিস্তারিত লুকান", kn: "ವಿವರಗಳನ್ನು ಮರೆಮಾಡಿ" },
  categories_show_details: { en: "Benefits, eligibility and application details", hi: "लाभ, पात्रता और आवेदन विवरण", mr: "फायदा, पात्रता आणि अर्जाचा तपशील", gu: "લાભ, પાત્રતા અને અરજી વિગતો", ta: "நன்மைகள், தகுதி மற்றும் விண்ணப்ப விவரங்கள்", te: "ప్రయోజనాలు, అర్హత మరియు దరఖాస్తు వివరాలు", bn: "সুবিধা, যোগ্যতা এবং আবেদন বিবরণ", kn: "ಲಾಭಗಳು, ಅರ್ಹತೆ ಮತ್ತು ಅರ್ಜಿ ವಿವರಗಳು" },
  categories_benefits: { en: "Benefits", hi: "लाभ", mr: "फायदा", gu: "લાભ", ta: "நன்மைகள்", te: "ప్రయోజనాలు", bn: "সুবিধা", kn: "ಲಾಭಗಳು" },
  categories_eligibility: { en: "Eligibility", hi: "पात्रता", mr: "पात्रता", gu: "પાત્રતા", ta: "தகுதி", te: "అర్హత", bn: "যোগ্যতা", kn: "ಅರ್ಹತೆ" },
  categories_documents: { en: "Documents", hi: "दस्तावेज़", mr: "कागदपत्रे", gu: "દસ્તાવેજો", ta: "ஆவணங்கள்", te: "పత్రాలు", bn: "নথি", kn: "ದಾಖಲೆಗಳು" },
  categories_how_to_apply: { en: "How to apply", hi: "कैसे Apply करें", mr: "कसे अर्ज करायचे", gu: "કઈ રીતે અરજી કરવી", ta: "எப்படி விண்ணப்பிப்பது", te: "ఎలా దరఖాస్తు చేయాలి", bn: "কিভাবে আবেদন করবেন", kn: "ಎങ്ങനെ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು" },
  categories_official_guidance: { en: "Official guidance", hi: "अधिकृत मार्गदर्शन", mr: "अधिकृत मार्गदर्शन", gu: "સત્તાવાર માર્ગદર્શન", ta: "அதிகாரப்பூர்வ வழிகாட்டுதல்", te: "అధికారిక మార్గదర్శకత్వం", bn: "অফিসিয়াল গাইডেন্স", kn: "ಅಧಿಕೃತ ಮಾರ್ಗದರ್ಶನ" },
  categories_ask_assistant: { en: "Ask assistant", hi: "सहायक से पूछें", mr: "सहाय्यकाला विचारा", gu: "સહાયકનો પ્રશ્ન કરો", ta: "உதவியாளரிடம் கேளுங்கள்", te: "సహాయకుడిని అడగండి", bn: "সহায়কের কাছে জিজ্ঞাসা করুন", kn: "ಸಹಾಯಕನನ್ನು ಕೇಳಿ" },
  categories_previous: { en: "Previous", hi: "पिछला", mr: "मागील", gu: "પહેલાનું", ta: "முந்தையது", te: "మునుపటి", bn: "পূর্ববর্তী", kn: "ಹಿಂದಿನ" },
  categories_next: { en: "Next", hi: "अगला", mr: "पुढील", gu: "આગળ", ta: "அடுத்தது", te: "తదుపరి", bn: "পরবর্তী", kn: "ಮುಂದಿನ" },
  categories_page_of: { en: "Page", hi: "पेज", mr: "पेज", gu: "પેજ", ta: "பக்கம்", te: "పేజీ", bn: "পৃষ্ঠা", kn: "ಪುಟ" },

  about_badge: { en: "ABOUT SCHEMESAATHI", hi: "स्कीमसाथी के बारे में", mr: "स्कीमसाथी बद्दल", gu: "સ્કીમસાથી વિશે", ta: "ஸ்கீம்சாதி பற்றி", te: "స్కీమసాధీ గురించి", bn: "স্কীমসাথি সম্পর্কে", kn: "ಸ್ಕೀಮಸಾಥಿ ಬಗ್ಗೆ" },
  about_title_line1: { en: "Discover the right government schemes,", hi: "सही सरकारी योजनाएं खोजें,", mr: "योग्य सरकारी योजना शोधा,", gu: "સાચી સરકારી યોજનાઓ શોધો,", ta: "சரியான அரசு திட்டங்களைக் கண்டறியவும்,", te: "సరైన ప్రభుత్వ పథకాలను కనుగొనండి,", bn: "সঠিক সরকারি প্রকল্প খুঁজুন,", kn: "ಸರಿಯಾದ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ," },
  about_title_line2: { en: "made simple.", hi: "सरल बनाएं।", mr: "सोपे करून घ्या.", gu: "સાદું બનાવેલ.", ta: "எளிதாக்கப்பட்டது.", te: "సరళంగా చేసారు.", bn: "সহজ করে।", kn: "ಸರಳವಾಗಿ." },
  about_intro: { en: "SchemeSaathi is a smart platform designed to help individuals, entrepreneurs and businesses discover government schemes that may match their needs, eligibility and goals.", hi: "SchemeSaathi एक स्मार्ट प्लेटफॉर्म है जो व्यक्तियों, उद्यमियों और व्यवसायों को ऐसी सरकारी योजनाओं को खोजने में मदद करता है जो उनकी आवश्यकताओं, पात्रता और लक्ष्यों से मेल खा सकती हैं।", mr: "SchemeSaathi हे एक स्मार्ट प्लॅटफॉर्म आहे जे व्यक्ती, उद्योजक आणि व्यवसायांना अशा सरकारी योजना शोधण्यात मदत करते जे त्यांच्या गरज, पात्रता आणि उद्देशांशी जुळू शकतात.", gu: "SchemeSaathi એક સ્માર્ટ પ્લેટફોર્મ છે જે વ્યક્તિઓ, ઉદ્યોગપતિઓ અને વ્યવસાયોને એવી સરકારી યોજનાઓ શોધવામાં મદદ કરે છે જે તેમની જરૂરિયાતો, પાત્રતા અને લક્ષ્યો સાથે મેળ ખાઈ શકે.", ta: "SchemeSaathi என்பது தனிநபர்கள், தொழில்முனைவோர்கள் மற்றும் வணிகங்களுக்கு அவர்களின் தேவைகள், தகுதி மற்றும் இலக்குகளுடன் பொருந்தக்கூடிய அரசு திட்டங்களைக் கண்டறிய உதவும் ஒரு ஸ்மார்ட் தளமாகும்.", te: "SchemeSaathi అనేది వ్యక్తులు, వ్యాపారవేత్తలు మరియు వ్యాపారాలకు వారి అవసరాలు, అర్హత మరియు లక్ష్యాలకు సరిపోయే ప్రభుత్వ పథకాలను కనుగొనడంలో సహాయపడే ఒక స్మార్ట్ ప్లాట్ఫారమ్.", bn: "SchemeSaathi এমন একটি স্মার্ট প্ল্যাটফর্ম যা ব্যক্তিদের, উদ্যোক্তাদের এবং ব্যবসায়ীদের এমন সরকারি প্রকল্প খুঁজতে সাহায্য করে যা তাদের চাহিদা, যোগ্যতা এবং লক্ষ্যগুলির সাথে মেলে।", kn: "SchemeSaathi ಒಂದು ಸ್ಮಾರ್ಟ್ ಪ್ಲಾಟ್ಫಾರ್ಮ್ ಆಗಿದ್ದು, ವ್ಯಕ್ತಿಗಳು, ಉದ್ಯಮಿಗಳು ಮತ್ತು ವ್ಯವಹಾರಗಳಿಗೆ ಅವರ ಅಗತ್ಯತೆಗಳು, ಅರ್ಹತೆ ಮತ್ತು ಉದ್ದೇಶಗಳಿಗೆ ಹೊಂದುವ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ." },
  about_mission: { en: "Our Mission", hi: "हमारा मिशन", mr: "आमचे ध्येय", gu: "અમનું ધ્યેય", ta: "எங்கள் தொலைநோக்கு", te: "మన మిషన్", bn: "আমাদের লক্ষ্য", kn: "ನಮ್ಮ ಗುರಿ" },
  about_mission_title: { en: "Making government schemes easier to understand", hi: "सरकारी योजनाओं को समझना आसान बनाना", mr: "सरकारी योजना समजणे सोपे करणे", gu: "સરકારી યોજનાઓને સમજવી સરળ બનાવવું", ta: "அரசு திட்டங்களை புரிந்துகொள்வதை எளிதாக்குதல்", te: "ప్రభుత్వ పథకాలను అర్థం చేసుకోవడాన్ని సులభతరం చేయడం", bn: "সরকারি প্রকল্প বুঝতে সহজ করে তোলা", kn: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸುಲಭವಾಗಿಸುವುದು" },
  about_how_it_works: { en: "How It Works", hi: "यह कैसे काम करता है", mr: "हे कसे काम करते", gu: "આ એક રીતે કામ કરે છે", ta: "இது எப்படி செயல்படுகிறது", te: "ఇది ఎలా పని చేస్తుంది", bn: "এটি কীভাবে কাজ করে", kn: "ಇದು ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ" },
  about_how_subtitle: { en: "Finding schemes in a few simple steps", hi: "कुछ सरल चरणों में योजनाएं ढूंढें", mr: "काही सोप्या पायऱ्यांमध्ये योजना शोधा", gu: "થોડા સરળ પગલાંમાં યોજનાઓ શોધો", ta: "சில எளிய படிகளில் திட்டங்களைக் கண்டறியவும்", te: "కొన్ని సరళమైన దశలలో పథకాలను కనుగొనండి", bn: "কয়েকটি সহজ ধাপে প্রকল্প খুঁজুন", kn: "ಕೆಲವು ಸರಳ ಹಂತಗಳಲ್ಲಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ" },
  about_why: { en: "Why SchemeSaathi", hi: "SchemeSaathi क्यों", mr: "SchemeSaathi का का कारण", gu: "SchemeSaathi શા માટે", ta: "SchemeSaathi ஏன்", te: "SchemeSaathi ఎందుకు", bn: "SchemeSaathi কেন", kn: "SchemeSaathi ಏಕೆ" },
  about_why_title: { en: "Built to make scheme discovery easier", hi: "योजना खोज को आसान बनाने के लिए बनाया गया", mr: "योजना शोध सोपा करण्यासाठी तयार केले आहे", gu: "યોજનાનું શોધવું সহজ બનાવવા માટે બનાવવામાં આવ્યું", ta: "திட்ட கண்டுபிடிப்பை எளிதாக்குவதற்காக உருவாக்கப்பட்டது", te: "పథకాలను కనుగొనడాన్ని సులభతరం చేయడానికి నిర్మించబడింది", bn: "প্রকল্প খোঁজাকে সহজ बनाने জন্য তৈরি", kn: "ಯೋಜನೆ ಹುಡುಕಾಟವನ್ನು ಸುಲಭವಾಗಿಸಲು ನಿರ್ಮಿಸಲಾಗಿದೆ" },
  about_ready: { en: "Ready to find schemes for you?", hi: "आपके लिए योजनाएं खोजने के लिए तैयार हैं?", mr: "तुमच्यासाठी योजना शोधण्यास तयार आहात का?", gu: "તમારા માટે યોજનાઓ શોધવા માટે તૈયાર છો?", ta: "உங்களுக்கான திட்டங்களைக் கண்டறிய தயாரா?", te: "మీ కోసం పథకాలను కనుగొనడానికి సిద్ధంగా ఉన్నారా?", bn: "আপনার জন্য প্রকল্প খুঁজতে প্রস্তুত?", kn: "ನಿಮಗಾಗಿ ಯೋಜನೆಗಳ ಹುಡುಕಾಟಕ್ಕೆ ಸಿದ್ಧರಾಗಿದ್ದೀರಾ?" },
  about_find_matches: { en: "Find Matching Schemes", hi: "मेल खाती योजनाएं खोजें", mr: "जुळणाऱ्या योजना शोधा", gu: "મેળ खातી યોજનાઓ શોધો", ta: "பொருந்தும் திட்டங்களைக் கண்டறியவும்", te: "సరిపోలే పథకాలను కనుగొనండి", bn: "মিলিত প্রকল্প খুঁজুন", kn: "హೊಂದಾಣಿಕೆಯ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ" },
  about_step_profile: { en: "Personal Information", hi: "व्यक्तिगत जानकारी", gu: "વ્યક્તિગત માહિતી", mr: "वैयक्तिक माहिती", bn: "ব্যক্তিগত তথ্য", ta: "தனிப்பட்ட தகவல்", te: "వ్యక్తిగత సమాచారం", kn: "ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ", ml: "വ്യക്തിഗത വിവരങ്ങൾ", pa: "ਨਿੱਜੀ ਜਾਣਕਾਰੀ", od: "ବ୍ୟକ୍ତିଗତ ସୂଚନା" },
  about_step_business: { en: "Business Details", hi: "व्यावसायिक विवरण", gu: "વ્યવસાયિક વિગતો", mr: "व्यावसायिक तपशील", bn: "ব্যবসায়িক বিবরণ", ta: "வணிக விவரங்கள்", te: "వ్యాపార వివరాలు", kn: "ವ್ಯಾಪಾರ ವಿವರಗಳು", ml: "ബിസിനസ്സ് വിവരങ്ങൾ", pa: "ਕਾਰੋਬਾਰੀ ਵੇਰਵੇ", od: "ବ୍ୟବସାୟ ବିବରଣୀ" },
  about_step_other: { en: "Other Details", hi: "अन्य विवरण", gu: "અન્ય વિગતો", mr: "इतर तपशील", bn: "অন্যান্য বিবরণ", ta: "பிற விவரங்கள்", te: "ఇతర వివరాలు", kn: "ಇತರ ವಿವರಗಳು", ml: "മറ്റ് വിവരങ്ങൾ", pa: "ਹੋਰ ਵੇਰਵੇ", od: "ଅନ୍ୟାନ୍ୟ ବିବରଣୀ" },
  about_step_matches: { en: "Get Matches", hi: "मेल खाते परिणाम", gu: "મેળ ખાતી યોજનાઓ", mr: "जुळणारे निकाल", bn: "উপযুক্ত স্কিম পান", ta: "பொருத்தமான திட்டங்களைப் பெறுங்கள்", te: "సరిపోయే పథకాలను పొందండి", kn: "ಹೊಂದಾಣಿಕೆಯ ಯೋಜನೆಗಳನ್ನು ಪಡೆಯಿರಿ", ml: "പൊരുത്തങ്ങൾ നേടുക", pa: "ਮੇਲ ਖਾਂਦੀਆਂ ਯੋਜਨਾਵਾਂ ਲੱਭੋ", od: "ମେଳ ଖାଉଥିବା ଯୋଜନା ପାଆନ୍ତୁ" },
  about_mission_title: { en: "Making Government Schemes Clear & Understandable", hi: "सरकारी योजनाओं को समझना सरल बनाना", gu: "સરકારી યોજનાઓને સમજવી સરળ બનાવવી", mr: "सरकारी योजना समजण्यास सोप्या करणे", bn: "সরকারি প্রকল্পগুলি সহজ ও বোধগম্য করা", ta: "அரசுத் திட்டங்களைப் புரிந்துகொள்வதை எளிதாக்குதல்", te: "ప్రభుత్వ పథకాలను అర్థం చేసుకోవడం సులభతరం చేయడం", kn: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಸುಲಭವಾಗಿ ಅರ್ಥವಾಗುವಂತೆ ಮಾಡುವುದು", ml: "സർക്കാർ പദ്ധതികൾ ലളിതമായി മനസ്സിലാക്കാവുന്നതാക്കുന്നു", pa: "ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਨੂੰ ਸਮਝਣਾ ਆਸਾਨ ਬਣਾਉਣਾ", od: "ସରକାରୀ ଯୋଜନାଗୁଡ଼ିକୁ ବୁଝିବା ସହଜ କରିବା" },
  about_mission_text: {
    en: "We simplify the process of discovering schemes by turning complex eligibility rules into clear, actionable guidance for every user.",
    hi: "हम योजना खोज की प्रक्रिया को सरल बनाते हैं, जटिल पात्रता नियमों को साफ़ और उपयोगी मार्गदर्शन में बदलकर।",
    gu: "અમે જટિલ પાત્રતા નિયમોને સ્પષ્ટ અને ઉપયોગી માર્ગદર્શનમાં ફેરવીને સરકારી યોજનાઓ શોધવાની પ્રક્રિયાને સરળ બનાવીએ છીએ.",
    mr: "आम्ही क्लिष्ट पात्रता नियमांचे स्पष्ट, कृतीयोग्य मार्गदर्शनात रूपांतर करून सरकारी योजना शोधण्याची प्रक्रिया सुलभ करतो.",
    bn: "আমরা জটিল যোগ্যতার নিয়মগুলিকে স্পষ্ট ও কার্যকর নির্দেশিকায় রূপান্তরিত করে সরকারি প্রকল্প খোঁজার প্রক্রিয়াটি সহজ করি।",
    ta: "சிக்கலான தகுதி விதிகளை தெளிவான, நடைமுறை வழிகாட்டுதலாக மாற்றி அரசுத் திட்டங்களைக் கண்டறியும் செயல்முறையை எளிதாக்குகிறோம்.",
    te: "క్లిష్టమైన అర్హత నిబంధనలను స్పష్టమైన, ఆచరణాత్మక మార్గదర్శకత్వంగా మార్చడం ద్వారా ప్రభుత్వ పథకాలను కనుగొనే ప్రక్రియను సులభతరం చేస్తాము.",
    kn: "ಸಂಕೀರ್ಣ ಅರ್ಹತಾ ನಿಯಮಗಳನ್ನು ಸ್ಪಷ್ಟ, ಕ್ರಿಯಾತ್ಮಕ ಮಾರ್ಗದರ್ಶನವನ್ನಾಗಿ ಪರಿವರ್ತಿಸುವ ಮೂಲಕ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಹುಡುಕಾಟ ಪ್ರಕ್ರಿಯೆಯನ್ನು ಸುಲಭಗೊಳಿಸುತ್ತೇವೆ.",
    ml: "സങ്കീർണ്ണമായ യോഗ്യതാ മാനദണ്ഡങ്ങളെ ലളിതവും വ്യക്തവുമായ മാർഗ്ഗനിർദ്ദേശങ്ങളാക്കി മാറ്റി സർക്കാർ പദ്ധതികൾ കണ്ടെത്തുന്നത് എളുപ്പമാക്കുന്നു.",
    pa: "ਅਸੀਂ ਗੁੰਝਲਦਾਰ ਯੋਗਤਾ ਨਿਯਮਾਂ ਨੂੰ ਸਪਸ਼ਟ ਅਤੇ ਕਾਰਜਸ਼ੀਲ ਮਾਰਗਦਰਸ਼ਨ ਵਿੱਚ ਬਦਲ ਕੇ ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਲੱਭਣ ਦੀ ਪ੍ਰਕਿਰਿਆ ਨੂੰ ਆਸਾਨ ਬਣਾਉਂਦੇ ਹਾਂ।",
    od: "ଆମେ ଜଟିଳ ଯୋଗ୍ୟତା ନିୟମଗୁଡ଼ିକୁ ସ୍ପଷ୍ଟ ଏବଂ କାର୍ଯ୍ୟକ୍ଷମ ମାର୍ଗଦର୍ଶନରେ ପରିଣତ କରି ସରକାରୀ ଯୋଜନା ଖୋଜିବା ପ୍ରକ୍ରିୟାକୁ ସହଜ କରୁ।"
  },
  about_mission_secondary: {
    en: "The goal is to make public support easier to understand, faster to compare, and more accessible to the citizens who need it most.",
    hi: "उद्देश्य यह है कि सार्वजनिक सहायता को समझना आसान हो, तुलना तेज़ हो, और सबसे अधिक ज़रूरतमंद नागरिकों के लिए अधिक सुलभ हो।",
    gu: "ધ્યેય એ છે કે સરકારી સહાય સમજવી સરળ બને, ઝડપથી સરખામણી થઈ શકે અને જરૂરિયાતમંદ નાગરિકો સુધી વધુ સુલભ બને.",
    mr: "ध्येय हे आहे की सरकारी सहाय्य समजणे सोपे व्हावे, तुलना जलद व्हावी आणि गरजू नागरिकांपर्यंत ते अधिक सुलभतेने पोहोचावे.",
    bn: "লক্ষ্য হলো সরকারি সহায়তা বোঝা সহজ করা, দ্রুত তুলনা করা এবং সর্বাধিক অভাবী নাগরিকদের কাছে তা আরও সহজলভ্য করে তোলা।",
    ta: "அரசு உதவிகளைப் புரிந்துகொள்வதை எளிதாக்குவதும், விரைவாக ஒப்பிடுவதும், மிகவும் தேவையான குடிமக்களுக்கு எளிதில் கிடைக்கச் செய்வதும் இதன் நோக்கமாகும்.",
    te: "ప్రభుత్వ సహాయాన్ని సులభంగా అర్థం చేసుకునేలా చేయడం, వేగంగా సరిపోల్చడం మరియు అవసరమైన పౌరులకు మరింత సులభంగా అందుబాటులోకి తీసుకురావడమే లక్ష్యం.",
    kn: "ಸಾರ್ವಜನಿಕ ಬೆಂಬಲವನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸುಲಭಗೊಳಿಸುವುದು, ವೇಗವಾಗಿ ಹೋಲಿಸುವುದು ಮತ್ತು ಹೆಚ್ಚು ಅಗತ್ಯವಿರುವ ನಾಗರಿಕರಿಗೆ ಅದನ್ನು ಸುಲಭವಾಗಿ ತಲುಪಿಸುವುದು ಗುರಿಯಾಗಿದೆ.",
    ml: "സർക്കാർ പിന്തുണ എളുപ്പത്തിൽ മനസ്സിലാക്കാനും വേഗത്തിൽ താരതമ്യം ചെയ്യാനും ഏറ്റവും ആവശ്യമുള്ള പൗരന്മാർക്ക് പ്രാപ്യമാക്കാനുമാണ് ലക്ഷ്യമിടുന്നത്.",
    pa: "ਟੀਚਾ ਇਹ ਹੈ ਕਿ ਜਨਤਕ ਸਹਾਇਤਾ ਨੂੰ ਸਮਝਣਾ ਆਸਾਨ ਹੋਵੇ, ਤੁਲਨਾ ਤੇਜ਼ ਹੋਵੇ, ਅਤੇ ਸਭ ਤੋਂ ਵੱਧ ਲੋੜਵੰਦ ਨਾਗਰਿਕਾਂ ਲਈ ਵਧੇਰੇ ਪਹੁੰਚਯੋਗ ਹੋਵੇ।",
    od: "ଲକ୍ଷ୍ୟ ହେଉଛି ସରକାରୀ ସହାୟତାକୁ ବୁଝିବା ସହଜ କରିବା, ଶୀଘ୍ର ତୁଳନା କରିବା ଏବଂ ସର୍ବାଧିକ ଆବଶ୍ୟକ କରୁଥିବା ନାଗରିକଙ୍କ ନିକଟରେ ପହଞ୍ଚାଇବା।"
  },
  about_info_title: {
    en: "Trusted Guidance",
    hi: "विश्वसनीय मार्गदर्शन",
    gu: "વિશ્વસનીય માર્ગદર્શન",
    mr: "विश्वसनीय मार्गदर्शन",
    bn: "নির্ভরযোগ্য দিকনির্দেশনা",
    ta: "நம்பகமான வழிகாட்டுதல்",
    te: "విశ్వసనీయ మార్గదర్శకత్వం",
    kn: "ವಿಶ್ವಾಸಾರ್ಹ ಮಾರ್ಗದರ್ಶನ",
    ml: "വിശ്വസനീയമായ മാർഗ്ഗനിർദ്ദേശം",
    pa: "ਭਰੋਸੇਯੋਗ ਮਾਰਗਦਰਸ਼ਨ",
    od: "ବିଶ୍ୱାସନୀୟ ମାର୍ଗଦର୍ଶନ"
  },
  about_info_1: {
    en: "SchemeSaathi helps you discover government schemes that match your profile, needs and goals through clear, personalized guidance.",
    hi: "SchemeSaathi आपकी प्रोफ़ाइल, ज़रूरतों और लक्ष्यों से मेल खाने वाली सरकारी योजनाओं को स्पष्ट, व्यक्तिगत मार्गदर्शन के माध्यम से खोजने में मदद करता है।",
    gu: "SchemeSaathi તમારી પ્રોફાઇલ, જરૂરિયાતો અને લક્ષ્યો સાથે મેળ ખાતી સરકારી યોજનાઓ શોધવામાં સ્પષ્ટ અને વ્યક્તિગત માર્ગદર્શન આપે છે.",
    mr: "SchemeSaathi तुमच्या प्रोफाईल, गरजा आणि ध्येयांशी जुळणाऱ्या सरकारी योजना शोधण्यात स्पष्ट, वैयक्तिक मार्गदर्शन प्रदान करते.",
    bn: "SchemeSaathi আপনার প্রোফাইল, চাহিদা এবং লক্ষ্যের সাথে সামঞ্জস্যপূর্ণ সরকারি প্রকল্পগুলি স্পষ্ট ও ব্যক্তিগত নির্দেশনার মাধ্যমে খুঁজতে সাহায্য করে।",
    ta: "SchemeSaathi உங்கள் சுயவிவரம், தேவைகள் மற்றும் இலக்குகளுக்குப் பொருந்தும் அரசுத் திட்டங்களைத் தெளிவான, தனிப்பயனாக்கப்பட்ட வழிகாட்டுதல் மூலம் கண்டறிய உதவுகிறது.",
    te: "SchemeSaathi మీ ప్రొఫైల్, అవసరాలు మరియు లక్ష్యాలకు సరిపోయే ప్రభుత్వ పథకాలను స్పష్టమైన, వ్యక్తిగతీకరించిన మార్గదర్శకత్వం ద్వారా కనుగొనడంలో సహాయపడుతుంది.",
    kn: "SchemeSaathi ನಿಮ್ಮ ಪ್ರೊಫೈಲ್, ಅಗತ್ಯಗಳು ಮತ್ತು ಗುರಿಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಸ್ಪಷ್ಟ, ವೈಯಕ್ತೀಕರಿಸಿದ ಮಾರ್ಗದರ್ಶನದ ಮೂಲಕ ಅನ್ವೇಷಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
    ml: "നിങ്ങളുടെ പ്രൊഫൈൽ, ആവശ്യങ്ങൾ, ലക്ഷ്യങ്ങൾ എന്നിവയ്ക്ക് അനുയോജ്യമായ സർക്കാർ പദ്ധതികൾ കണ്ടെത്താൻ വ്യക്തവും വ്യക്തിഗതവുമായ മാർഗ്ഗനിർദ്ദേശം സ്കീംസാഥി നൽകുന്നു.",
    pa: "SchemeSaathi ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ, ਲੋੜਾਂ ਅਤੇ ਟੀਚਿਆਂ ਨਾਲ ਮੇਲ ਖਾਂਦੀਆਂ ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਨੂੰ ਸਪਸ਼ਟ, ਵਿਅਕਤੀਗਤ ਮਾਰਗਦਰਸ਼ਨ ਰਾਹੀਂ ਲੱਭਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।",
    od: "SchemeSaathi ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍, ଆବଶ୍ୟକତା ଏବଂ ଲକ୍ଷ୍ୟ ସହିତ ମେଳ ଖାଉଥିବା ସରକାରୀ ଯୋଜନାଗୁଡ଼ିକୁ ସ୍ପଷ୍ଟ ଏବଂ ବ୍ୟକ୍ତିଗତ ମାର୍ଗଦର୍ଶନ ମାଧ୍ୟମରେ ଖୋଜିବାରେ ସାହାଯ୍ୟ କରେ।"
  },
  about_info_2: {
    en: "We simplify eligibility information, benefits and application steps so you can make informed decisions and move forward with confidence. Final processing and approval are handled by the respective scheme authority.",
    hi: "हम पात्रता जानकारी, लाभ और आवेदन चरणों को सरल बनाते हैं ताकि आप सूचित निर्णय ले सकें और आत्मविश्वास के साथ आगे बढ़ सकें। अंतिम निर्णय संबंधित विभाग या संस्था तय करती है।",
    gu: "અમે પાત્રતા માહિતી, લાભો અને અરજીના પગલાં સરળ બનાવીએ છીએ જેથી તમે માહિતગાર નિર્ણયો લઈ શકો અને આત્મવિશ્વાસ સાથે આગળ વધી શકો. અંતિમ મંજૂરી સંબંધિત સત્તાવાળાઓ દ્વારા થાય છે.",
    mr: "आम्ही पात्रता माहिती, फायदे आणि अर्जाच्या पायऱ्या सुलभ करतो जेणेकरून तुम्ही माहितीपूर्ण निर्णय घेऊ शकाल आणि आत्मविश्वासाने पुढे जाऊ शकाल. अंतिम मंजुरी संबंधित प्राधिकरणाकडून दिली जाते.",
    bn: "আমরা যোগ্যতার তথ্য, সুবিধা এবং আবেদনের পদক্ষেপগুলিকে সহজ করে তুলি যাতে আপনি সচেতন সিদ্ধান্ত নিতে পারেন। চূড়ান্ত অনুমোদন সংশ্লিষ্ট কর্তৃপক্ষ দ্বারা সম্পন্ন হয়।",
    ta: "தகுதித் தகவல், நன்மைகள் மற்றும் விண்ணப்பப் படிகளை நாங்கள் எளிதாக்குகிறோம், இதனால் நீங்கள் தகவலறிந்த முடிவுகளை எடுக்க முடியும். இறுதி ஒப்புதல் அதிகாரிகளால் கையாளப்படுகிறது.",
    te: "మేము అర్హత సమాచారం, ప్రయోజనాలు మరియు దరఖాస్తు దశలను సులభతరం చేస్తాము. తుది ప్రాసెసింగ్ మరియు ఆమోదం సంబంధిత అధికారులదే.",
    kn: "ನಾವು ಅರ್ಹತಾ ಮಾಹಿತಿ, ಪ್ರಯೋಜನಗಳು ಮತ್ತು ಅರ್ಜಿ ಹಂತಗಳನ್ನು ಸರಳಗೊಳಿಸುತ್ತೇವೆ. ಅಂತಿಮ ಅನುಮೋದನೆಯನ್ನು ಸಂಬಂಧಪಟ್ಟ ಅಧಿಕಾರಿಗಳು ನಿರ್ವಹಿಸುತ್ತಾರೆ.",
    ml: "യോഗ്യതാ വിവരങ്ങൾ, ആനുകൂല്യങ്ങൾ, അപേക്ഷാ ഘട്ടങ്ങൾ എന്നിവ ഞങ്ങൾ ലളിതമാക്കുന്നു. അന്തിമ അംഗീകാരം ബന്ധപ്പെട്ട അധികാരികൾ കൈകാര്യം ചെയ്യുന്നു.",
    pa: "ਅਸੀਂ ਯੋਗਤਾ ਦੀ ਜਾਣਕਾਰੀ, ਲਾਭ ਅਤੇ ਅਰਜ਼ੀ ਦੇ ਕਦਮਾਂ ਨੂੰ ਸਰਲ ਬਣਾਉਂਦੇ ਹਾਂ ਤਾਂ ਜੋ ਤੁਸੀਂ ਸੁਚੇਤ ਫੈਸਲੇ ਲੈ ਸਕੋ। ਅੰਤਿਮ ਪ੍ਰਵਾਨਗੀ ਸਬੰਧਤ ਵਿਭਾਗ ਵੱਲੋਂ ਕੀਤੀ ਜਾਂਦੀ ਹੈ।",
    od: "ଆମେ ଯୋଗ୍ୟତା ସୂଚନା, ଲାଭ ଏବଂ ଆବେଦନ ପଦକ୍ଷେପଗୁଡ଼ିକୁ ସରଳ କରିଥାଉ ଯାହାଦ୍ୱାରା ଆପଣ ସଠିକ୍ ନିଷ୍ପତ୍ତି ନେଇପାରିବେ। ଚୂଡ଼ାନ୍ତ ମଞ୍ଜୁରୀ ସମ୍ପୃକ୍ତ କର୍ତ୍ତୃପକ୍ଷଙ୍କ ଦ୍ୱାରା ହୋଇଥାଏ।"
  },

  resources_badge: { en: "SCHEMESAATHI KNOWLEDGE BASE & RESOURCE CENTRE", hi: "SchemeSaathi ज्ञान आधार एवं संसाधन केंद्र", mr: "SchemeSaathi नॉलेज बेस आणि रिसोर्स सेंटर", gu: "SchemeSaathi નોલેજ બેસ અને રિસોર્સ સેન્ટર", ta: "SchemeSaathi அறிவு அடிப்படை & வள மையம்", te: "SchemeSaathi జ్ఞాన స్థావరం & వనరుల కేంద్రం", bn: "SchemeSaathi জ্ঞানভান্ডার ও রিসোর্স সেন্টার", kn: "SchemeSaathi ಜ್ಞಾನ ಮೂಲ & ಸಂಪನ್ಮೂಲ ಕೇಂದ್ರ", ml: "SchemeSaathi വിജ്ഞാന കേന്ദ്രം", pa: "SchemeSaathi ਗਿਆਨ ਕੇਂਦਰ", od: "SchemeSaathi ଜ୍ଞାନ ଆଧାର ଓ ସମ୍ବଳ କେନ୍ଦ୍ର" },
  resource_category_all: { en: "All", hi: "सभी", gu: "બધા", mr: "सर्व", bn: "সব", ta: "அனைத்தும்", te: "అన్నీ", kn: "ಎಲ್ಲವೂ", ml: "എല്ലാം", pa: "ਸਾਰੇ", od: "ସମସ୍ତ" },
  resource_category_guides: { en: "Guides", hi: "गाइड", gu: "માર્ગદર્શિકા", mr: "मार्गदर्शक", bn: "গাইড", ta: "வழிகாட்டிகள்", te: "గైడ్‌లు", kn: "ಮಾರ್ಗದರ್ಶಿಗಳು", ml: "വഴികാട്ടികൾ", pa: "ਗਾਈਡ", od: "ମାର୍ଗଦର୍ଶିକା" },
  resource_category_application: { en: "Application", hi: "आवेदन", gu: "અરજી", mr: "अर्ज", bn: "আবেদন", ta: "விண்ணப்பம்", te: "దరఖాస్తు", kn: "ಅರ್ಜಿ", ml: "അപേക്ഷ", pa: "ਅਰਜ਼ੀ", od: "ଆବେଦନ" },
  resource_category_documents: { en: "Documents", hi: "दस्तावेज़", gu: "દસ્તાવેજો", mr: "कागदपत्रे", bn: "নথিপত্র", ta: "ஆவணங்கள்", te: "పత్రాలు", kn: "ದಾಖಲೆಗಳು", ml: "രേഖകൾ", pa: "ਦਸਤਾਵੇਜ਼", od: "ଦଲିଲପତ୍ର" },
  resource_find_title: { en: "Find government schemes", hi: "सरकारी योजनाएं खोजें", gu: "સરકારી યોજનાઓ શોધો", mr: "सरकारी योजना शोधा", bn: "সরকারি প্রকল্প খুঁজুন", ta: "அரசு திட்டங்களைக் கண்டறியவும்", te: "ప్రభుత్వ పథకాలను కనుగొనండి", kn: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ", ml: "സർക്കാർ പദ്ധതികൾ കണ്ടെത്തുക", pa: "ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਲੱਭੋ", od: "ସରକାରୀ ଯୋଜନାଗୁଡ଼ିକ ଖୋଜନ୍ତୁ" },
  resource_find_desc: {
    en: "Compare eligibility, benefits and application steps on the official portal.",
    hi: "अधिकृत पोर्टल पर पात्रता, लाभ और आवेदन चरणों की तुलना करें।",
    gu: "સત્તાવાર પોર્ટલ પર પાત્રતા, લાભો અને અરજીના પગલાઓની સરખામણી કરો.",
    mr: "अधिकृत संकेतस्थळावर पात्रता, फायदे आणि अर्जाच्या पायऱ्यांची तुलना करा.",
    bn: "অফিসিয়াল পোর্টালে যোগ্যতা, সুবিধা এবং আবেদনের ধাপগুলি তুলনা করুন।",
    ta: "அதிகாரப்பூர்வ போர்ட்டலில் தகுதி, நன்மைகள் மற்றும் விண்ணப்பப் படிகளை ஒப்பிட்டுப் பாருங்கள்.",
    te: "అధికారిక పోర్టల్‌లో అర్హత, ప్రయోజనాలు మరియు దరఖాస్తు దశలను సరిపోల్చండి.",
    kn: "ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಅರ್ಹತೆ, ಪ್ರಯೋಜನಗಳು ಮತ್ತು ಅರ್ಜಿ ಹಂತಗಳನ್ನು ಹೋಲಿಕೆ ಮಾಡಿ.",
    ml: "ഔദ്യോഗിക പോർട്ടലിൽ യോഗ്യത, ആനുകൂല്യങ്ങൾ, അപേക്ഷാ ഘട്ടങ്ങൾ എന്നിവ താരതമ്യം ചെയ്യുക.",
    pa: "ਅਧਿਕਾਰਤ ਪੋਰਟਲ 'ਤੇ ਯੋਗਤਾ, ਲਾਭ ਅਤੇ ਅਰਜ਼ੀ ਦੇ ਕਦਮਾਂ ਦੀ ਤੁਲਨਾ ਕਰੋ।",
    od: "ଅଫିସିଆଲ୍ ପୋର୍ଟାଲରେ ଯୋଗ୍ୟତା, ଲାଭ ଏବଂ ଆବେଦନ ପଦକ୍ଷେପଗୁଡ଼ିକୁ ତୁଳନା କରନ୍ତୁ।"
  },
  resource_apply_title: { en: "Application guide", hi: "आवेदन गाइड", gu: "અરજી માર્ગદર્શિકા", mr: "अर्ज मार्गदर्शक", bn: "আবেদন নির্দেশিকা", ta: "விண்ணப்ப வழிகாட்டி", te: "దరఖాస్తు గైడ్", kn: "ಅರ್ಜಿ ಮಾರ್ಗದರ್ಶಿ", ml: "അപേക്ഷാ വഴികാട്ടി", pa: "ਅਰਜ਼ੀ ਗਾਈਡ", od: "ଆବେଦନ ମାର୍ଗଦର୍ଶିକା" },
  resource_apply_desc: {
    en: "Read the official guidelines before submitting an application.",
    hi: "आवेदन करने से पहले आधिकारिक दिशानिर्देश पढ़ें।",
    gu: "અરજી સબમિટ કરતા પહેલા સત્તાવાર માર્ગદર્શિકા વાંચો.",
    mr: "अर्ज सादर करण्यापूर्वी अधिकृत मार्गदर्शक तत्त्वे वाचा.",
    bn: "আবেদন জমা দেওয়ার আগে অফিসিয়াল নির্দেশিকা পড়ুন।",
    ta: "விண்ணப்பத்தை சமர்ப்பிக்கும் முன் அதிகாரப்பூர்வ வழிகாட்டுதல்களைப் படியுங்கள்.",
    te: "దరఖాస్తును సమర్పించే ముందు అధికారిక మార్గదర్శకాలను చదవండి.",
    kn: "ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಅಧಿಕೃತ ಮಾರ್ಗಸೂಚಿಗಳನ್ನು ಓದಿ.",
    ml: "അപേക്ഷ സമർപ്പിക്കുന്നതിന് മുമ്പ് ഔദ്യോഗിക മാർഗ്ഗനിർദ്ദേശങ്ങൾ വായിക്കുക.",
    pa: "ਅਰਜ਼ੀ ਜਮ੍ਹਾਂ ਕਰਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਅਧਿਕਾਰਤ ਦਿਸ਼ਾ-ਨਿਰਦੇਸ਼ ਪੜ੍ਹੋ।",
    od: "ଆବେଦନ ଦାଖଲ କରିବା ପୂର୍ବରୁ ଅଫିସିଆଲ୍ ନିର୍ଦ୍ଦେଶାବଳୀ ପଢ଼ନ୍ତୁ।"
  },
  resource_documents_title: { en: "Document checklist", hi: "दस्तावेज़ सूची", gu: "દસ્તાવેજ ચેકલિસ્ટ", mr: "कागदपत्र तपासणी यादी", bn: "নথিপত্র চেকলিস্ট", ta: "ஆவண சரிபார்ப்பு பட்டியல்", te: "పత్రాల చెక్‌లిస్ట్", kn: "ದಾಖಲೆಗಳ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ", ml: "രേഖകളുടെ ചെക്ക്‌ಲಿస్ట్", pa: "ਦਸਤਾਵੇਜ਼ ਚੈੱਕਲਿਸਟ", od: "ଦଲିଲ ଯାଞ୍ଚ ତାଲିକା" },
  resource_documents_desc: {
    en: "Required documents vary by scheme. Prepare only the documents requested in the official guidelines.",
    hi: "आवश्यक दस्तावेज़ योजना के अनुसार बदलते हैं। केवल आधिकारिक दिशानिर्देशों में बताए गए दस्तावेज़ तैयार करें।",
    gu: "જરૂરી દસ્તાવેજો યોજના અનુસાર બદલાય છે. સત્તાવાર માર્ગદર્શિકામાં દર્શાવેલ દસ્તાવેજો જ તૈયાર કરો.",
    mr: "आवश्यक कागदपत्रे योजनेनुसार बदलतात. केवळ अधिकृत मार्गदर्शक तत्त्वांमध्ये नमूद केलेली कागदपत्रे तयार ठेवा.",
    bn: "প্রয়োজনীয় নথি স্কিম অনুযায়ী পরিবর্তিত হয়। শুধুমাত্র অফিশিয়াল নির্দেশিকায় চাওয়া নথিপত্র প্রস্তুত রাখুন।",
    ta: "தேவையான ஆவணங்கள் திட்டத்திற்கு ஏற்ப மாறுபடும். வழிகாட்டுதல்களில் கேட்கப்பட்ட ஆவணங்களை மட்டும் தயார் செய்யவும்.",
    te: "అవసరమైన పత్రాలు పథకాన్ని బట్టి మారుతుంటాయి. అధికారిక మార్గదర్శకాలలో కోరిన పత్రాలను మాత్రమే సిద్ధం చేసుకోండి.",
    kn: "ಅಗತ್ಯವಿರುವ ದಾಖಲೆಗಳು ಯೋಜನೆಗೆ ಅನುಗುಣವಾಗಿ ಬದಲಾಗುತ್ತವೆ. ಅಧಿಕೃತ ಮಾರ್ಗಸೂಚಿಗಳಲ್ಲಿ ತಿಳಿಸಲಾದ ದಾಖಲೆಗಳನ್ನು ಮಾತ್ರ ಸಿದ್ಧಪಡಿಸಿ.",
    ml: "ആവശ്യമായ രേഖകൾ പദ്ധതിക്കനുസരിച്ച് വ്യത്യാസപ്പെടുന്നു. ഔദ്യോഗിക മാർഗ്ഗനിർദ്ദേശങ്ങളിൽ ആവശ്യപ്പെട്ട രേഖകൾ മാത്രം തയ്യാറാക്കുക.",
    pa: "ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼ ਯੋਜਨਾ ਅਨੁਸਾਰ ਵੱਖ-ਵੱਖ ਹੋ ਸਕਦੇ ਹਨ। ਸਿਰਫ਼ ਅਧਿਕਾਰਤ ਦਿਸ਼ਾ-ਨਿਰਦੇਸ਼ਾਂ ਵਿੱਚ ਮੰਗੇ ਗਏ ਦਸਤਾਵੇਜ਼ ਤਿਆਰ ਕਰੋ।",
    od: "ଆବଶ୍ୟକ ଦଲିଲ ଯୋଜନା ଅନୁଯାୟୀ ଭିନ୍ନ ହୋଇଥାଏ। କେବଳ ଅଫିସିଆଲ୍ ନିର୍ଦ୍ଦେଶାବଳୀରେ ଥିବା ଦଲିଲ ପ୍ରସ୍ତୁତ କରନ୍ତୁ।"
  },
  common_read_resource: { en: "Read guide", hi: "गाइड पढ़ें", gu: "માર્ગદર્શિકા વાંચો", mr: "मार्गदर्शक वाचा", bn: "গাইড পড়ুন", ta: "வழிகாட்டியைப் படிக்கவும்", te: "గైడ్ చదవండి", kn: "ಮಾರ್ಗದರ್ಶಿ ಓದಿ", ml: "വഴികാട്ടി വായിക്കുക", pa: "ਗਾਈਡ ਪੜ੍ਹੋ", od: "ମାର୍ଗଦର୍ଶିକା ପଢ଼ନ୍ତୁ" },
  common_clear: { en: "Clear", hi: "साफ़ करें", gu: "સાફ કરો", mr: "साफ करा", bn: "পরিষ্কার করুন", ta: "அழிக்கவும்", te: "క్లియర్ చేయండి", kn: "ತೆರವುಗೊಳಿಸಿ", ml: "മായ್ക്കുക", pa: "ਸਾਫ਼ ਕਰੋ", od: "ସଫା କରନ୍ତୁ" },
  resource_udyam_title: { en: "Udyam registration", hi: "उद्याम पंजीकरण", gu: "ઉદ્યમ નોંધણી", mr: "उद्यम नोंदणी", bn: "উদ্যম নিবন্ধন", ta: "உத்யம் பதிவு", te: "ఉద్యమ్ నమోదు", kn: "ಉದ್ಯಮ್ ನೋಂದಣಿ", ml: "ഉദ്യം രജിസ്ട്രേഷൻ", pa: "ਉਦਯਮ ਰਜਿਸਟ੍ਰੇਸ਼ਨ", od: "ଉଦ୍ୟମ ପଞ୍ଜୀକରଣ" },
  resource_udyam_desc: { en: "Use the official Udyam portal for enterprise registration and current requirements.", hi: "उपयुक्त उद्यम पंजीकरण और वर्तमान आवश्यकताओं के लिए आधिकारिक Udyam पोर्टल का उपयोग करें।", gu: "ઉદ્યોગ નોંધણી અને વર્તમાન જરૂરિયાતો માટે સત્તાવાર ઉદ્યમ પોર્ટલનો ઉપયોગ કરો.", mr: "उद्योग नोंदणी आणि वर्तमान आवश्यकतांसाठी अधिकृत उद्यम पोर्टल वापरा.", bn: "এন্টারপ্রাইজ নিবন্ধন এবং বর্তমান প্রয়োজনীয়তার জন্য অফিসিয়াল উদ্যোগ পোর্টাল ব্যবহার করুন।", ta: "நிறுவனப் பதிவு மற்றும் தற்போதைய தேவைகளுக்கு அதிகாரப்பூர்வ உத்யம் போர்ட்டலைப் பயன்படுத்தவும்.", te: "ఎంటర్‌ప్రైజ్ రిజిస్ట్రేషన్ మరియు ప్రస్తుత అవసరాల కోసం అధికారిక ఉద్యమ్ పోర్టల్‌ని ఉపయోగించండి.", kn: "ಉದ್ಯಮ ನೋಂದಣಿ ಮತ್ತು ಪ್ರಸ್ತುತ ಅವಶ್ಯಕತೆಗಳಿಗಾಗಿ ಅಧಿಕೃತ ಉದ್ಯಮ್ ಪೋರ್ಟಲ್ ಬಳಸಿ.", ml: "സംരംഭ രജിസ്ട്രേഷനും നിലവിലെ ആവശ്യങ്ങൾക്കും ഔദ്യോഗിക ഉദ്യം പോർട്ടൽ ഉപയോഗിക്കുക.", pa: "ਐਂਟਰਪ੍ਰਾਈਜ਼ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਅਤੇ ਮੌਜੂਦਾ ਲੋੜਾਂ ਲਈ ਅਧਿਕਾਰਤ ਉਦਯਮ ਪੋਰਟਲ ਦੀ ਵਰਤੋਂ ਕਰੋ।", od: "ଉଦ୍ୟୋଗ ପଞ୍ଜୀକରଣ ଏବଂ ସାମ୍ପ୍ରତିକ ଆବଶ୍ୟକତା ପାଇଁ ଅଫିସିଆଲ୍ ଉଦ୍ୟମ ପୋର୍ଟାଲ୍ ବ୍ୟବହାର କରନ୍ତୁ।" },
  resource_startup_title: { en: "Startup support", hi: "स्टार्टअप सहायता", gu: "સ્ટાર્ટઅપ સહાય", mr: "स्टार्टअप समर्थन", bn: "স্টার্টআপ সহায়তা", ta: "ஸ்டார்ட்அப் ஆதரவு", te: "స్టార్టప్ మద్దతు", kn: "ಸ್ಟಾರ್ಟ್‌ಅಪ್ ಬೆಂಬಲ", ml: "സ്റ്റാർട്ടപ്പ് പിന്തുണ", pa: "ਸਟਾਰਟਅੱਪ ਸਹਾਇਤਾ", od: "ଷ୍ଟାର୍ଟଅପ୍ ସହାୟତା" },
  resource_startup_desc: { en: "Check recognition and programme requirements on the official Startup India portal.", hi: "अधिकृत Startup India पोर्टल पर मान्यता और कार्यक्रम आवश्यकताओं की जाँच करें।", gu: "સત્તાવાર સ્ટાર્ટઅપ ઇન્ડિયા પોર્ટલ પર માન્યતા અને કાર્યક્રમની આવશ્યકતાઓ તપાસો.", mr: "अधिकृत स्टार्टअप इंडिया पोर्टलवर मान्यता आणि कार्यक्रम आवश्यकता तपासा.", bn: "অফিসিয়াল স্টার্টআপ ইন্ডিয়া পোর্টালে স্বীকৃতি এবং প্রোগ্রামের প্রয়োজনীয়তা পরীক্ষা করুন।", ta: "அதிகாரப்பூர்வ ஸ்டார்ட்அப் இந்தியா போர்ட்டலில் அங்கீகாரம் மற்றும் திட்டத் தேவைகளைச் சரிபார்க்கவும்.", te: "అధికారిక స్టార్టప్ ఇండియా పోర్టల్‌లో గుర్తింపు మరియు ప్రోగ్రామ్ అవసరాలను తనిఖీ చేయండి.", kn: "ಅಧಿಕೃತ ಸ್ಟಾರ್ಟ್‌ಅಪ್ ಇಂಡಿಯಾ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಗುರುತಿಸುವಿಕೆ ಮತ್ತು ಕಾರ್ಯಕ್ರಮದ ಅವಶ್ಯಕತೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.", ml: "ഔദ്യോഗിക സ്റ്റാർട്ടപ്പ് ഇന്ത്യ പോർട്ടലിൽ അംഗീകാരവും പ്രോഗ്രാം ആവശ്യകതകളും പരിശോധിക്കുക.", pa: "ਅਧਿਕਾਰਤ ਸਟਾਰਟਅੱਪ ਇੰਡੀਆ ਪੋਰਟਲ 'ਤੇ ਮਾਨਤਾ ਅਤੇ ਪ੍ਰੋਗਰਾਮ ਦੀਆਂ ਲੋੜਾਂ ਦੀ ਜਾਂਚ ਕਰੋ।", od: "ଅଫିସିଆଲ୍ ଷ୍ଟାର୍ଟଅପ୍ ଇଣ୍ଡିଆ ପୋର୍ଟାଲରେ ମାନ୍ୟତା ଏବଂ ପ୍ରୋଗ୍ରାମ ଆବଶ୍ୟକତା ଯାଞ୍ଚ କରନ୍ତୁ।" },
  resource_loans_title: { en: "Loans and subsidies", hi: "ऋण और सब्सिडी", gu: "લોન અને સબસિડી", mr: "कर्ज आणि अनुदान", bn: "ঋণ এবং ভর্তুকি", ta: "கடன்கள் மற்றும் மானியங்கள்", te: "రుణాలు మరియు సబ్సిడీలు", kn: "ಸಾಲಗಳು ಮತ್ತು ಸಬ್ಸಿಡಿಗಳು", ml: "വായ്പകളും സബ്സിഡികളും", pa: "ਕਰਜ਼ੇ ਅਤੇ ਸਬਸਿਡੀਆਂ", od: "ଋଣ ଏବଂ ସବସିଡି" },
  resource_loans_desc: { en: "A loan must be repaid. A subsidy reduces eligible costs subject to scheme conditions.", hi: "ऋण चुकाना पड़ता है। सब्सिडी पात्र लागत को योजना की शर्तों के अनुसार घटा देती है।", gu: "લોન પરત ચૂકવવી પડે છે. સબસિડી યોજનાની શરતો અનુસાર પાત્ર ખર્ચ ઘટાડે છે.", mr: "कर्ज परत करावे लागते. अनुदान योजनेच्या अटींनुसार पात्र खर्च कमी करते.", bn: "একটি ঋণ পরিশোধ করতে হবে। একটি ভর্তুকি স্কিম শর্ত সাপেক্ষে যোগ্য খরচ কমায়।", ta: "ஒரு கடன் திருப்பிச் செலுத்தப்பட வேண்டும். மானியம் என்பது திட்ட நிபந்தனைகளுக்கு உட்பட்டு தகுதியான செலவைக் குறைக்கிறது.", te: "రుణం తిరిగి చెల్లించాలి. సబ్సిడీ పథకం షరతులకు లోబడి అర్హత ఖర్చులను తగ్గిస్తుంది.", kn: "ಸಾಲವನ್ನು ಮರುಪಾವತಿಸಬೇಕು. ಸಬ್ಸಿಡಿಯು ಯೋಜನೆಯ ಷರತ್ತುಗಳಿಗೆ ಒಳಪಟ್ಟು ಅರ್ಹತಾ ವೆಚ್ಚವನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ.", ml: "ഒരു വായ്പ തിരിച്ചടയ്ക്കണം. ഒരു സബ്‌സിഡി പദ്ധതി വ്യവസ്ഥകൾക്ക് വിധേയമായി യോഗ്യമായ ചെലവുകൾ കുറയ്ക്കുന്നു.", pa: "ਇੱਕ ਕਰਜ਼ਾ ਵਾਪਸ ਕਰਨਾ ਲਾਜ਼ਮੀ ਹੈ। ਇੱਕ ਸਬਸਿਡੀ ਸਕੀਮ ਦੀਆਂ ਸ਼ਰਤਾਂ ਦੇ ਅਧੀਨ ਯੋਗ ਲਾਗਤਾਂ ਨੂੰ ਘਟਾਉਂਦੀ ਹੈ।", od: "ଏକ ଋଣ ପରିଶୋଧ କରିବାକୁ ପଡିବ। ଏକ ସବସିଡି ଯୋଜନା ସର୍ତ୍ତ ଅନୁଯାୟୀ ଯୋଗ୍ୟ ଖର୍ଚ୍ଚ ହ୍ରାସ କରେ।" },
  resource_step_1: { en: "Compare eligibility, benefits and application steps on the official portal.", hi: "अधिकृत पोर्टल पर पात्रता, लाभ और आवेदन चरणों की तुलना करें।" },
  resource_step_2: { en: "Required documents vary by scheme. Prepare only the documents requested in the official guidelines.", hi: "आवश्यक दस्तावेज़ योजना के अनुसार बदलते हैं। केवल आधिकारिक दिशानिर्देशों में बताई गई चीज़ें तैयार करें।" },
  resource_step_3: { en: "Submit the application through the official channel and save its reference number.", hi: "अधिकृत चैनल के माध्यम से आवेदन जमा करें और संदर्भ नंबर सुरक्षित रखें।" },
  resource_step_4: { en: "Track progress on the official portal. SchemeSaathi does not submit applications.", hi: "अधिकृत पोर्टल पर प्रगति ट्रैक करें। SchemeSaathi आवेदन नहीं भेजता है।" },
  doc_identity: { en: "Identity proof", hi: "पहचान प्रमाण" },
  doc_address: { en: "Address proof", hi: "पता प्रमाण" },
  doc_social_category: { en: "Social category certificate", hi: "सामाजिक श्रेणी प्रमाणपत्र" },
  doc_income: { en: "Income proof", hi: "आय प्रमाण" },
  doc_business_registration: { en: "Business registration", hi: "व्यवसाय पंजीकरण" },
  doc_bank: { en: "Bank account details", hi: "बैंक खाता विवरण" },
  doc_business_plan: { en: "Business plan", hi: "व्यवसाय योजना" },
  resources_title: { en: "Learn Before You Apply", hi: "आवेदन करने से पहले सीखें", mr: "अर्ज करण्यापूर्वी शिकणे", gu: "અરજી કરતા પહેલા શીખો", ta: "விண்ணப்பிக்கும் முன் கற்றுக்கொள்ளுங்கள்", te: "దరఖాస్తు చేయడానికి ముందు తెలుసుకోండి", bn: "আবেদন করার আগে শিখুন", kn: "ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಕಲಿಯಿರಿ" },
  resources_desc: { en: "Explore helpful step-by-step guides, document checklists, FAQs, and application tips to maximize your scheme approval success.", hi: "सहायक चरण-दर-चरण गाइड, दस्तावेज़ सूची, FAQ, और आवेदन सुझावों का अध्ययन करें जिससे योजना स्वीकृति की संभावना बढ़े।", mr: "उपयोगी स्टेप-बाय-स्टेप मार्गदर्शक, दस्तऐवज चेकलिस्ट, FAQ आणि अर्ज टिप्स शोधा जेणेकरून योजना मंजुरीची शक्यता वाढू शकेल.", gu: "ઉપયોગી સ્ટેપ-બાય-સ્ટેપ ગાઈડ, દસ્તાવેજ ચેકલિસ્ટ, FAQ અને અરજી ટિપ્સ શોધો જે તમારી યોજનાની મંજૂરીની સફળતા વધારે છે.", ta: "உங்கள் திட்ட ஒப்புதலை அதிகரிக்க உதவும் படிப்படியான வழிகாட்டிகள், ஆவணச் சரிபார்ப்புகள், கேள்விகள் மற்றும் விண்ணப்ப குறிப்புகளை ஆராயுங்கள்.", te: "మీ పథక ఆమోద విజయాన్ని పెంచే సహాయకమైన స్టెప్-బై-స్టెప్ గైడ్లు, పత్రాల జాబితాలు, FAQలు మరియు దరఖాస్తు చిట్కాలను అన్వేషించండి.", bn: "সহায়ক ধাপে ধাপে গাইড, নথি চেকলিস্ট, FAQ এবং আবেদন টিপস অন্বেষণ করুন যাতে আপনার প্রকল্পের অনুমোদন বেশি হয়।", kn: "ನಿಮ್ಮ ಯೋಜನೆ ಅನುಮೋದನೆಯನ್ನು ಹೆಚ್ಚಿಸಲು ಸಹಾಯಕವಾದ ಹಂತ-ವಿಧಾನ ಮಾರ್ಗದರ್ಶಿಗಳು, ದಾಖಲೆ ಚೇಕ್ಲಿಸ್ಟ್‌ಗಳು, FAQಗಳು ಮತ್ತು ಅರ್ಜಿ ಸಲಹೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ." },
  resources_search_placeholder: { en: "Search resources (e.g. Udyam, Documents, Checklist, Loan, Tips)...", hi: "संसाधन खोजें (उदा. Udyam, Documents, Checklist, Loan, Tips)...", mr: "संसाधने शोधा (उदा. Udyam, Documents, Checklist, Loan, Tips)...", gu: "સંસાધનો શોધો (ઉદાહરણ: Udyam, Documents, Checklist, Loan, Tips)...", ta: "வளங்களைத் தேடு (எ.கா. Udyam, Documents, Checklist, Loan, Tips)...", te: "వనరులను శోధించండి (ఉదా. Udyam, Documents, Checklist, Loan, Tips)...", bn: "রিসোর্স খুঁজুন (যেমন Udyam, Documents, Checklist, Loan, Tips)...", kn: "ಸಂಪನ್ಮೂಲಗಳನ್ನು ಹುಡುಕಿ (ಉದಾ. Udyam, Documents, Checklist, Loan, Tips)..." },
  resources_count_label: { en: "Knowledge Resources", hi: "ज्ञान संसाधन", mr: "ज्ञान स्त्रोत", gu: "જ્ઞાનસંસાધનો", ta: "அறிவு வளங்கள்", te: "జ్ఞాన వనరులు", bn: "জ্ঞানীয় সম্পদ", kn: "ಜ್ಞಾನ ಸಂಪನ್ಮೂಲಗಳು" },
  resources_available: { en: "Verified Guides Available", hi: "सत्यापित गाइड उपलब्ध", mr: "सत्यापित मार्गदर्शक उपलब्ध", gu: "ચકાસેલ ગાઈડ उपलब्ध", ta: "சரிபார்க்கப்பட்ட வழிகாட்டிகள் கிடைக்கின்றன", te: "ధృవీకరించిన గైಡ్లు అందుబాటులో ఉన్నాయి", bn: "যাচাইকৃত গাইড উপলব্ধ", kn: "ಪರಿಶೀಲಿಸಿದ ಮಾರ್ಗದರ್ಶಿಗಳು ಲಭ್ಯವಿದೆ" },
  resources_need_help: { en: "Need Personalized Scheme Matching?", hi: "व्यक्तिगत योजना मिलान चाहिए?", mr: "वैयक्तिक योजना जुळणी हवी आहे का?", gu: "વ્યક્તિગત યોજનાનું મેચિંગ જોઈએ?", ta: "தனிப்பயன் திட்ட பொருத்தம் வேண்டுமா?", te: "వ్యక్తిగత పథక సరిపోలిక కావాలా?", bn: "ব্যক্তিগত প্রকল্প মিলন দরকার?", kn: "ವೈಯಕ್ತಿಕ ಯೋಜನೆ ಹೊಂದಾಣಿಕೆ ಬೇಕೇ?" },
  resources_help_text: { en: "Use SchemeSaathi to provide your basic profile details (category, state, business type) and instantly discover schemes you qualify for.", hi: "SchemeSaathi का उपयोग करके अपनी बुनियादी प्रोफ़ाइल जानकारी (श्रेणी, राज्य, व्यवसाय प्रकार) प्रदान करें और तुरंत उन योजनाओं को खोजें जिनके लिए आप पात्र हैं।", mr: "SchemeSaathi वापरून तुमची मूलभूत प्रोफाइल माहिती (श्रेणी, राज्य, व्यवसाय प्रकार) द्या आणि त्वरित तुम्हाला मिळणाऱ्या योजना शोधा.", gu: "SchemeSaathiનો ઉપયોગ કરીને તમારી મૂળભૂત પ્રોફાઇલ વિગતો (કેટેગરી, રાજ્ય, વ્યવસાયનો પ્રકાર) આપો અને તરત જ એવી યોજનાઓ શોધો જે માટે તમે પાત્ર છો.", ta: "SchemeSaathi ஐப் பயன்படுத்தி உங்கள் அடிப்படை சுயவிவர விவரங்களை (வகை, மாநிலம், வணிக வகை) வழங்கி, நீங்கள் தகுதியான திட்டங்களைக் உடனடியாகக் கண்டறியவும்.", te: "SchemeSaathiని ఉపయోగించి మీ ప్రాథమిక ప్రొఫైల్ వివరాలను (వర్గం, రాష్ట్రం, వ్యాపారం రకం) ఇవ్వండి మరియు మీరు అర్హులైన పథకాలను వెంటనే కనుగొనండి.", bn: "SchemeSaathi ব্যবহার করে আপনার মৌলিক প্রোফাইলের বিবরণ (ক্যাটাগরি, রাজ্য, ব্যবসার ধরন) দিন এবং আপনি যেসব প্রকল্পের জন্য যোগ্য তা তাৎক্ষণিকভাবে খুঁজুন।", kn: "SchemeSaathi ಬಳಸಿ ನಿಮ್ಮ ಮೂಲ ಪ್ರೊಫೈಲ್ ವಿವರಗಳನ್ನು (ವರ್ಗ, ರಾಜ್ಯ, ವ್ಯಾಪಾರ ಪ್ರಕಾರ) ನೀಡಿ ಮತ್ತು ನೀವು ಅರ್ಹರಾಗಿರುವ ಯೋಜನೆಗಳನ್ನು ತಕ್ಷಣ ಹುಡುಕಿ." },
  resources_find_button: { en: "Find Matching Schemes", hi: "मेल खाती योजनाएं खोजें", mr: "जुळणाऱ्या योजना शोधा", gu: "મેળ ખાતી યોજનાઓ શોધો", ta: "பொருந்தும் திட்டங்களைக் கண்டறியவும்", te: "సరిపోలే పథకాలను కనుగొనండి", bn: "মিলিত প্রকল্প খুঁজুন", kn: "ಹೊಂದಾಣಿಕೆಯ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ" },
  resources_close: { en: "Close Guide", hi: "गाइड बंद करें", mr: "गाइड बंद करा", gu: "ગાઈડ બંધ કરો", ta: "வழிகாட்டியை மூடு", te: "గైడ్‌ను మూసివేయండి", bn: "গাইড বন্ধ করুন", kn: "ಮಾರ್ಗದರ್ಶನ ಮುಚ್ಚಿರಿ" },
  resources_open_official: { en: "Open Official Government Portal", hi: "अधिकृत सरकारी पोर्टल खोलें", mr: "अधिकृत सरकारी पोर्टल उघडा", gu: "સત્તાવાર સરકારનો પોર્ટલ ખોલો", ta: "அதிகாரப்பூர்வ அரசாங்க போர்டலைத் திறக்கவும்", te: "అధికారిక ప్రభుత్వ పోర్టల్‌ను తెరవండి", bn: "অফিসিয়াল সরকারি পোর্টাল খুলুন", kn: "ಅಧಿಕೃತ ಸರ್ಕಾರದ ಪೋರ್ಟಲ್‌ ತೆರೆಯಿರಿ" },
  resources_no_results: { en: "No resources found", hi: "कोई संसाधन नहीं मिला", mr: "कोणताही संसाधन सापडले नाही", gu: "કોઈ સંસાધન મળ્યું નથી", ta: "வளங்கள் எதுவும் கிடைக்கவில்லை", te: "ఎలాంటి వనరులు లేవు", bn: "কোনো সম্পদ পাওয়া যায়নি", kn: "ಯಾವುದೇ ಸಂಪನ್ಮೂಲಗಳು ಸಿಕ್ಕಿಲ್ಲ" },
  resources_no_results_hint: { en: "We couldn't find any resource matching your search or selected category filter.", hi: "हमारी खोज या चयनित श्रेणी फ़िल्टर से कोई संसाधन नहीं मिला।", mr: "तुमचा शोध किंवा निवडलेली श्रेणी फिल्टरशी जुळणारे कोणतेही संसाधन सापडले नाही.", gu: "તમારા શોધ અથવા પસંદ કરેલ કેટેગરી ફિલ્ટર સાથે કોઈ સંસાધન મળ્યું નથી.", ta: "உங்கள் தேடல் அல்லது தேர்ந்தெடுக்கப்பட்ட வகை வடிகட்டியுடன் பொருந்தும் வளங்கள் எதுவும் கிடைக்கவில்லை.", te: "మీ శోధన లేదా ఎంచుకున్న వర్గం ఫిల్టర్‌కు సరిపోయే వనరులు దొరకలేదు.", bn: "আপনার অনুসন্ধান বা নির্বাচিত ক্যাটাগরি ফিল্টারের সাথে কোনো রিসোর্স খুঁজে পাওয়া যায়নি।", kn: "ನಿಮ್ಮ ಹುಡುಕಾಟ ಅಥವಾ ಆಯ್ಕೆಮಾಡಿದ ವಿಭಾಗ ಫಿಲ್ಟರ್‌ಗೆ ಹೊಂದುವ ಯಾವುದೇ ಸಂಪನ್ಮೂಲಗಳು ಸಿಕ್ಕಿಲ್ಲ." },
  resources_clear_filters: { en: "Clear Filters & Search", hi: "फ़िल्टर और खोज साफ़ करें", mr: "फिल्टर आणि शोध साफ करा", gu: "ફિલ્ટર અને શોધ સાફ કરો", ta: "வடிகட்டிகள் & தேடலை அழிக்கவும்", te: "ఫిల్టర్‌లు మరియు శోధనను క్లియర్ చేయండి", bn: "ফিল্টার ও অনুসন্ধান পরিষ্কার করুন", kn: "ಫಿಲ್ಟರ್‌ಗಳು ಮತ್ತು ಹುಡುಕಾಟವನ್ನು ತೆರವುಗೊಳಿಸಿ" },
  resources_summary: { en: "Overview", hi: "अवलोकन", mr: "सारांश", gu: "ઓવરવ્યુ", ta: "கண்ணோட்டம்", te: "అవలోకనం", bn: "সংক্ষিপ্ত বিবরণ", kn: "ಅವಲೋಕನ" },
  resources_steps: { en: "Step-by-Step Walkthrough", hi: "चरण-दर-चरण मार्गदर्शिका", mr: "स्टेप-बाय-स्टेप वाक्य", gu: "સ્ટેપ-બાય-સ્ટેપ ગાઇડ", ta: "படிப்படியாக வழிகாட்டி", te: "స tep-by-step గైడ్", bn: "ধাপে ধাপে গাইড", kn: "ಹಂತ-ಹಂತ ಮಾರ್ಗದರ್ಶನ" },
  resources_document_checklist: { en: "Interactive Document Checklist", hi: "इंटरएक्टिव दस्तावेज़ चेकलिस्ट", mr: "इंटरएक्टिव डॉक्युमेंट चेकलिस्ट", gu: "ઇન્ટરેક્ટિવ દસ્તાવેજ ચેકલિસ્ટ", ta: "இயங்குதிறன் கொண்ட ஆவணச் சரிபார்ப்பு", te: "ఇంటరాక్టివ్ డాక్యుమెంట్ చెక్లిస్ట్", bn: "ইন্টারঅ্যাকটিভ নথি চেকলিস্ট", kn: "ಇಂಟರಾಕ್ಟಿವ್ ದಾಖಲೆ ಚೇಕ್ಲಿಸ್ಟ್" },
  resources_faqs: { en: "Frequently Asked Questions", hi: "अक्सर पूछे जाने वाले प्रश्न", mr: "वारंवार विचारले जाणारे प्रश्न", gu: "વારંવાર પૂછાતા પ્રશ્નો", ta: "அடிக்கடி கேட்கப்படும் கேள்விகள்", te: "తరచుగా అడిగే ప్రశ్నలు", bn: "প্রায়শই জিজ্ঞাসিত প্রশ্ন", kn: "ಅಪೇಕ್ಷಿತ ಪ್ರಶ್ನೆಗಳು" },
  resources_breakdown: { en: "Detailed Breakdown", hi: "विस्तृत विवरण", mr: "तपशीलवार विघटन", gu: "વિસ્તૃત બ્રેકડાઉન", ta: "விரிவான விவரம்", te: "వివరణాత్మక విచ్ఛেদనం", bn: "বিস্তারিত বর্ণনা", kn: "ವಿವರಾತ್ಮಕ ವಿವರಣೆ" },
  resources_tips: { en: "Pro Tips & Guidance", hi: "उन्नत सुझाव और मार्गदर्शन", mr: "प्रो टिप्स आणि मार्गदर्शन", gu: "પ્રો ટિપ્સ અને માર્ગદર્શન", ta: "நிபுணர் குறிப்புகள் & வழிகாட்டுதல்", te: "ప్రో టిప్స్ & మార్గదర్శకత్వం", bn: "প্রো টিপস ও গাইডেন্স", kn: "ಪ್ರೋ ಟಿಪ್ಸ್ ಮತ್ತು ಮಾರ್ಗದರ್ಶನ" },
  support_ticket_created: { en: "Ticket created successfully.", hi: "टिकट सफलतापूर्वक बनाया गया।" },
  support_reply_saved: { en: "Response saved.", hi: "प्रतिक्रिया सहेजी गई।" },
  support_followup_saved: { en: "Your follow-up was saved. The helpdesk can now review it.", hi: "आपका फॉलो-अप सहेजा गया। हेल्पडेस्क अब इसे देख सकता है।" },
  support_campaign_empty: { en: "No eligible recipients remain in this campaign.", hi: "इस अभियान में योग्य प्राप्तकर्ता नहीं बचे हैं।" },
  support_status_open: { en: "Open", hi: "खुला" },
  support_status_in_progress: { en: "In progress", hi: "प्रगति में" },
  support_status_resolved: { en: "Resolved", hi: "हल किया गया" },
  support_email_queued: { en: "Email update is queued. Your ticket is saved.", hi: "ईमेल अपडेट कतार में है। आपका टिकट सेव है।" },
  support_email_accepted: { en: "Email update accepted by the mail service.", hi: "ईमेल अपडेट को मेल सेवा द्वारा स्वीकार किया गया।" },
  support_email_failed: { en: "Email update could not be sent. You can read every reply here.", hi: "ईमेल अपडेट भेजा नहीं जा सका। आप यहाँ हर जवाब पढ़ सकते हैं।" },
  support_email_unavailable: { en: "Email updates are currently unavailable. You can read every reply here.", hi: "ईमेल अपडेट अभी उपलब्ध नहीं हैं। आप यहाँ हर जवाब पढ़ सकते हैं।" },
  support_email_body: { en: "Dear SchemeSaathi Support Team,\n\nI need assistance with:\nScheme name or page URL:\nIssue and steps tried:\nExpected result:\n\nPlease advise on the next steps.\n\nRegards,\nName:", hi: "प्रिय SchemeSaathi सपोर्ट टीम,\n\nमुझे सहायता चाहिए:\nयोजना का नाम या पेज URL:\nसमस्या और प्रयास किए गए चरण:\nअपेक्षित परिणाम:\n\nकृपया अगले चरणों पर सलाह दें।\n\nसादर,\nनाम:" },
  support_title: { en: "Support & assistance", hi: "सहायता और सहायता" },
  support_intro: { en: "Get help with scheme discovery, documents, account access or a website issue.", hi: "????? ???, ?????????, ???? ??? ?????? ?? ??????? ?? ?????? ??? ?????? ????" },
  support_contact_title: { en: "Contact the SchemeSaathi team", hi: "SchemeSaathi टीम से संपर्क करें" },
  support_email_subject: { en: "SchemeSaathi Support Request", hi: "SchemeSaathi सहायता अनुरोध" },
  support_contact_note: { en: "Include the scheme name or page URL and the steps you tried. Sign in to create a ticket and track replies. Response times depend on team availability.", hi: "योजना का नाम या पेज URL और आपके द्वारा किए गए कदम शामिल करें। टिकट बनाने और जवाब ट्रैक करने के लिए साइन इन करें। जवाब समय टीम की उपलब्धता पर निर्भर करता है।" },
  support_assistant_cta: { en: "Ask the scheme assistant", hi: "योजना सहायक से पूछें" },
  support_faq_1_q: { en: "Does a match guarantee a loan or benefit?", hi: "क्या मैच से ऋण या लाभ का भरोसा मिलता है?" },
  support_faq_1_a: { en: "No. Results screen the recorded criteria. The department or lender checks all current requirements and makes the final decision.", hi: "नहीं। परिणाम दर्ज मानदंडों को स्क्रीन करते हैं। विभाग या लेंडर सभी वर्तमान आवश्यकताओं को जांचता है और अंतिम निर्णय लेता है।" },
  support_faq_2_q: { en: "Where do I apply?", hi: "मैं आवेदन कहाँ करता हूँ?" },
  support_faq_2_a: { en: "Open the official link on your scheme card and follow the application instructions. Never share an OTP, password or bank PIN here.", hi: "अपने योजना कार्ड पर आधिकारिक लिंक खोलें और आवेदन निर्देशों का पालन करें। यहाँ कभी भी OTP, पासवर्ड या बैंक PIN साझा न करें।" },
  support_loading: { en: "Loading your support account...", hi: "आपका सपोर्ट अकाउंट लोड हो रहा है..." },
  support_signin_prompt: { en: "Sign in to contact support", hi: "सपोर्ट से संपर्क करने के लिए साइन इन करें" },
  support_retry: { en: "Retry connection", hi: "कनेक्शन पुनः प्रयास करें" },
  support_submit_title: { en: "Submit a support request", hi: "सपोर्ट रिक्वेस्ट जमा करें" },
  support_submit_note: { en: "Include the affected page, scheme name and steps that caused the issue. Do not include passwords, OTPs, Aadhaar numbers or bank details.", hi: "प्रभावित पेज, योजना का नाम और समस्या उत्पन्न करने वाले चरण शामिल करें। पासवर्ड, OTP, आधार नंबर या बैंक विवरण शामिल न करें।" },
  support_subject_label: { en: "Subject", hi: "विषय" },
  support_message_label: { en: "Describe the issue", hi: "समस्या बताएं" },
  support_submit_button: { en: "Submit ticket", hi: "टिकट जमा करें" },
  support_saving: { en: "Saving...", hi: "सहेजा जा रहा है..." },
  support_queue_title: { en: "Helpdesk queue", hi: "हेल्पडेस्क कतार" },
  support_tickets_title: { en: "Your tickets", hi: "आपके टिकट" },
  support_loading_tickets: { en: "Loading...", hi: "लोड हो रहा है..." },
  support_refresh_tickets: { en: "Refresh tickets", hi: "टिकट रिफ्रेश करें" },
  support_no_tickets: { en: "No tickets yet.", hi: "अभी तक कोई टिकट नहीं है।" },
  support_team_response: { en: "Team response:", hi: "टीम की प्रतिक्रिया:" },
  support_your_followup: { en: "Your follow-up", hi: "आपका फॉलो-अप" },
  support_response_label: { en: "Response", hi: "प्रतिक्रिया" },
  support_followup_label: { en: "Add a follow-up", hi: "फॉलो-अप जोड़ें" },
  support_status_label: { en: "Status", hi: "स्थिति" },
  support_reopen_note: { en: "Sending a follow-up will reopen this ticket.", hi: "फॉलो-अप भेजने से यह टिकट फिर से खुल जाएगा।" },
  support_save_response: { en: "Save response", hi: "प्रतिक्रिया सेव करें" },
  support_send_followup: { en: "Send follow-up", hi: "फॉलो-अप भेजें" },
  support_wait: { en: "Please wait...", hi: "कृपया प्रतीक्षा करें..." },
  support_sending: { en: "Sending...", hi: "भेजा जा रहा है..." },
  support_email_sent: { en: "Email sent", hi: "ईमेल भेजा गया" },
  common_read_resource: { en: "Read Resource Guide", hi: "संसाधन गाइड पढ़ें", mr: "रिसोर्स गाइड वाचा", gu: "રिसોર્સ ગાઈડ વાંચો", ta: "வள வழிகாட்டியைப் படியுங்கள்", te: "రిసోర్స్ గైడ్‌ను చదవండి", bn: "রিসোর্স গাইড পড়ুন", kn: "ಸಂಪನ್ಮೂಲ ಮಾರ್ಗದರ್ಶನ ಓದಿ" },
  common_clear: { en: "Clear", hi: "साफ़ करें", mr: "साफ करा", gu: "સાફ કરો", ta: "அழிக்கவும்", te: "క్లియర్ చేయండి", bn: "পরিষ্কার করুন", kn: "ತೆರವುಗೊಳಿಸಿ" },
  common_close: { en: "Close", hi: "बंद करें", mr: "बंद करा", gu: "બંધ કરો", ta: "மூடு", te: "మూసివేయండి", bn: "বন্ধ করুন", kn: "ಮುಚ್ಚಿರಿ" },
};

import { translateText, translateBatch } from "./api";

// Include bundled translations and support English source text as a stable key.
for (const row of additionalText.replace(/^\uFEFF/, "").trim().split(/\r?\n/)) {
  const values = row.split("|");
  if (values.length >= 8) {
    STRINGS[values[0]] = Object.fromEntries(
      LANGUAGES.slice(0, values.length).map((language, i) => [language.code, values[i]])
    );
  }
}
Object.assign(STRINGS, categoryStrings, voiceStrings, SUPPORT_STRINGS, homeStrings);

const sourceStrings = new Map(Object.entries(STRINGS).flatMap(([key, values]) => [[key.toLowerCase(), values], [values.en.toLowerCase(), values]]));

const DYN_STORAGE_KEY = "schemeSaathiDynTranslations_v1";
function loadDynCache() {
  try {
    return JSON.parse(localStorage.getItem(DYN_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((item) => item.code === saved) ? saved : "en";
  });

  const [dynCache, setDynCache] = useState(loadDynCache);
  const pendingRequests = useRef(new Set());
  const timerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (code) => {
    if (LANGUAGES.some((l) => l.code === code)) setLanguageState(code);
  };

  // Asynchronously translates arbitrary text into target language using Sarvam AI
  const translateTextAsync = async (text, targetLang = language, sourceLang = "en") => {
    if (!text || targetLang === "en") return text;
    const clean = String(text).trim();
    if (!clean) return text;
    if (dynCache[targetLang]?.[clean]) {
      return dynCache[targetLang][clean];
    }
    try {
      const res = await translateText(clean, targetLang, sourceLang);
      const translated = res?.translated_text || clean;
      setDynCache((prev) => {
        const next = {
          ...prev,
          [targetLang]: { ...(prev[targetLang] || {}), [clean]: translated },
        };
        try {
          localStorage.setItem(DYN_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      return translated;
    } catch {
      return text;
    }
  };

  // Process pending queue of untranslated UI and DOM strings via Sarvam AI in concurrent batches
  useEffect(() => {
    if (language === "en") return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const queue = Array.from(pendingRequests.current).filter(
        (txt) => !dynCache[language]?.[txt] && txt.trim().length > 0 && txt.length < 1500
      );
      if (queue.length === 0) return;

      const BATCH_SIZE = 30;
      const batches = [];
      // Take up to 120 strings per flush in parallel chunks of 30
      const toProcess = queue.slice(0, 120);
      for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
        batches.push(toProcess.slice(i, i + BATCH_SIZE));
      }

      // Remove from pending set while in flight
      toProcess.forEach((item) => pendingRequests.current.delete(item));

      try {
        const results = await Promise.allSettled(
          batches.map((batch) => translateBatch(batch, language, "en"))
        );

        const newTranslations = {};
        results.forEach((r, idx) => {
          if (r.status === "fulfilled" && r.value?.translations) {
            Object.assign(newTranslations, r.value.translations);
          } else {
            // Restore failed items back to pending queue for retry
            batches[idx].forEach((item) => pendingRequests.current.add(item));
          }
        });

        if (Object.keys(newTranslations).length > 0) {
          setDynCache((prev) => {
            const updated = {
              ...prev,
              [language]: { ...(prev[language] || {}), ...newTranslations },
            };
            try {
              localStorage.setItem(DYN_STORAGE_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      } catch (err) {
        console.warn("Sarvam batch translation failed:", err);
      }
    }, 100);

    return () => clearTimeout(timerRef.current);
  }, [language, dynCache]);

  // Global DOM Text Scanner: converts all visible text on the website to the selected language using Sarvam AI
  useEffect(() => {
    if (typeof document === "undefined") return;

    const IGNORED_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "SVG", "NOSCRIPT"]);
    const IS_INDIC_OR_URDU = /[\u0600-\u06FF\u0900-\u0D7F]/;
    const HAS_LETTERS = /[a-zA-Z]{2,}/;

    const processDom = () => {
      if (language === "en") {
        // Restore all text nodes and placeholders to original English text
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let textNode;
        while ((textNode = walker.nextNode())) {
          if (textNode._ssOrigText !== undefined && textNode.nodeValue !== textNode._ssOrigText) {
            textNode.nodeValue = textNode._ssOrigText;
          }
        }
        document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((el) => {
          if (el._ssOrigPlaceholder !== undefined && el.placeholder !== el._ssOrigPlaceholder) {
            el.placeholder = el._ssOrigPlaceholder;
          }
        });
        return;
      }

      // Language is an Indian language (Sarvam AI translation)
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent || IGNORED_TAGS.has(parent.tagName) || parent.closest("[data-no-translate]")) {
              return NodeFilter.FILTER_REJECT;
            }
            const val = node.nodeValue;
            if (!val || val.trim().length < 2) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      let textNode;
      let hasMissing = false;

      while ((textNode = walker.nextNode())) {
        const val = textNode.nodeValue;
        const clean = val.trim();

        // If this text node hasn't recorded its original English text yet
        if (textNode._ssOrigText === undefined) {
          if (HAS_LETTERS.test(clean) && !IS_INDIC_OR_URDU.test(clean)) {
            textNode._ssOrigText = val;
          } else {
            continue;
          }
        }

        const origFull = textNode._ssOrigText;
        if (!origFull) continue;
        const origClean = origFull.trim();

        const cached = dynCache[language]?.[origClean] || STRINGS[origClean]?.[language];
        if (cached) {
          const leadingSpace = origFull.match(/^\s*/)?.[0] || "";
          const trailingSpace = origFull.match(/\s*$/)?.[0] || "";
          const target = leadingSpace + cached + trailingSpace;
          if (textNode.nodeValue !== target) {
            textNode.nodeValue = target;
          }
        } else {
          if (!pendingRequests.current.has(origClean)) {
            pendingRequests.current.add(origClean);
            hasMissing = true;
          }
        }
      }

      // Also translate input and textarea placeholders
      document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((el) => {
        if (el.closest("[data-no-translate]")) return;
        if (el._ssOrigPlaceholder === undefined) {
          if (HAS_LETTERS.test(el.placeholder) && !IS_INDIC_OR_URDU.test(el.placeholder)) {
            el._ssOrigPlaceholder = el.placeholder;
          } else {
            return;
          }
        }
        const orig = el._ssOrigPlaceholder?.trim();
        if (!orig) return;

        const cached = dynCache[language]?.[orig] || STRINGS[orig]?.[language];
        if (cached) {
          if (el.placeholder !== cached) {
            el.placeholder = cached;
          }
        } else {
          if (!pendingRequests.current.has(orig)) {
            pendingRequests.current.add(orig);
            hasMissing = true;
          }
        }
      });

      if (hasMissing) {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
          const queue = Array.from(pendingRequests.current).filter(
            (txt) => !dynCache[language]?.[txt] && txt.trim().length > 0 && txt.length < 1500
          );
          if (queue.length === 0) return;
          const BATCH_SIZE = 30;
          const batches = [];
          const toProcess = queue.slice(0, 120);
          for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
            batches.push(toProcess.slice(i, i + BATCH_SIZE));
          }
          toProcess.forEach((item) => pendingRequests.current.delete(item));
          try {
            const results = await Promise.allSettled(
              batches.map((batch) => translateBatch(batch, language, "en"))
            );
            const newTranslations = {};
            results.forEach((r, idx) => {
              if (r.status === "fulfilled" && r.value?.translations) {
                Object.assign(newTranslations, r.value.translations);
              } else {
                batches[idx].forEach((item) => pendingRequests.current.add(item));
              }
            });
            if (Object.keys(newTranslations).length > 0) {
              setDynCache((prev) => {
                const updated = {
                  ...prev,
                  [language]: { ...(prev[language] || {}), ...newTranslations },
                };
                try {
                  localStorage.setItem(DYN_STORAGE_KEY, JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }
          } catch (err) {
            console.warn("Sarvam batch translation failed:", err);
          }
        }, 50);
      }
    };

    processDom();
    const domInterval = setInterval(processDom, 500);

    let observerTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(processDom, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      clearInterval(domInterval);
      clearTimeout(observerTimer);
      observer.disconnect();
    };
  }, [language, dynCache]);

  const t = (key, params = {}) => {
    const entry = STRINGS[key] || sourceStrings.get(String(key).toLowerCase());
    const fallback = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(String(key))
      ? String(key).replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase())
      : key;

    let text = entry?.[language];

    // Queue every untranslated UI string for Sarvam; this covers raw labels,
    // placeholders, options, and text that is not registered in STRINGS.
    if (!text && language !== "en") {
      const englishSrc = entry?.en || fallback;
      if (dynCache[language]?.[englishSrc]) {
        text = dynCache[language][englishSrc];
      } else if (englishSrc) {
        // Enqueue for background translation via Sarvam AI
        pendingRequests.current.add(englishSrc);
        text = englishSrc;
      }
    }

    if (!text) {
      text = entry?.en || fallback;
    }

    return String(text).replace(/\{(\w+)\}/g, (_, name) => {
      const value = params[name];
      return value === undefined || value === null ? `{${name}}` : String(value);
    });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateTextAsync, dynCache }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return context;
}

/**
 * Helper component that renders any text and translates it dynamically into the current language
 */
export function AutoTranslate({ text, as: Component = "span", className = "", ...props }) {
  const { language, t, translateTextAsync, dynCache } = useLanguage();
  const [translated, setTranslated] = useState(() => {
    if (language === "en" || !text) return text;
    return dynCache[language]?.[text] || t(text);
  });

  useEffect(() => {
    if (language === "en" || !text) {
      setTranslated(text);
      return;
    }
    const cached = dynCache[language]?.[text];
    if (cached) {
      setTranslated(cached);
      return;
    }
    let isMounted = true;
    translateTextAsync(text, language).then((res) => {
      if (isMounted) setTranslated(res);
    });
    return () => {
      isMounted = false;
    };
  }, [text, language, dynCache, t, translateTextAsync]);

  return <Component className={className} {...props}>{translated}</Component>;
}


