import React, { createContext, useContext, useEffect, useState } from "react";

/* Dependency-free i18n layer. Every string below is keyed once, with a
   translation per language in one place -- add a key here, then wrap the
   matching text in t("key") wherever it's used. Persists to localStorage
   and is also sent to the backend as preferred_language (used for
   Bhashini voice/SMS). */

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी (Hindi)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
];

const STORAGE_KEY = "schemeSaathiLanguage";

/* key -> { en, hi, mr, gu, ta, te, bn, kn } */
const STRINGS = {
  // Navigation
  nav_home: { en: "Home", hi: "होम", mr: "मुख्यपृष्ठ", gu: "હોમ", ta: "முகப்பு", te: "హోమ్", bn: "হোম", kn: "ಮುಖಪುಟ" },
  nav_find_schemes: { en: "Find Schemes", hi: "योजनाएं खोजें", mr: "योजना शोधा", gu: "યોજનાઓ શોધો", ta: "திட்டங்களைக் கண்டறியவும்", te: "పథకాలను కనుగొనండి", bn: "প্রকল্প খুঁজুন", kn: "ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ" },
  nav_categories: { en: "Categories", hi: "श्रेणियां", mr: "श्रेणी", gu: "શ્રેણીઓ", ta: "வகைகள்", te: "వర్గాలు", bn: "বিভাগ", kn: "ವರ್ಗಗಳು" },
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
  assistant_title: { en: "AI Scheme Assistant", hi: "एआई योजना सहायक", mr: "एआय योजना सहाय्यक", gu: "AI યોજના સહાયક", ta: "AI திட்ட உதவியாளர்", te: "AI పథక సహాయకుడు", bn: "এআই স্কিম সহায়ক", kn: "AI ಯೋಜನಾ ಸಹಾಯಕ" },
  assistant_placeholder: { en: "Type your message...", hi: "अपना संदेश लिखें...", mr: "तुमचा संदेश टाइप करा...", gu: "તમારો સંદેશ ટાઇપ કરો...", ta: "உங்கள் செய்தியை தட்டச்சு செய்யவும்...", te: "మీ సందేశాన్ని టైప్ చేయండి...", bn: "আপনার বার্তা টাইপ করুন...", kn: "ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ..." },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || "en");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = (code) => {
    if (LANGUAGES.some((l) => l.code === code)) setLanguageState(code);
  };

  const t = (key) => STRINGS[key]?.[language] || STRINGS[key]?.en || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return context;
}
