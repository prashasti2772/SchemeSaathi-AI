import os
import csv
import asyncio
from pathlib import Path
from typing import Any, Optional
import numpy as np

from src.config.logging import get_logger
from src.config.settings import settings

logger = get_logger("chatbot_service")

BASE_DIR = Path(__file__).resolve().parents[2]
INDEX_PATH = BASE_DIR / "ml" / "chatbot" / "scheme.index"
DOCS_PATH = BASE_DIR / "ml" / "chatbot" / "myscheme.csv"


class ChatbotService:
    _instance: Optional["ChatbotService"] = None

    def __init__(self):
        self.embedder = None
        self.index = None
        self.documents: list[dict] = []
        self._genai_client = None
        self._is_initialized = False

    @classmethod
    def get_instance(cls) -> "ChatbotService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _ensure_initialized(self):
        if self._is_initialized:
            return

        logger.info("initializing_chatbot_resources")
        # Load scheme documents pickle
        if DOCS_PATH.exists():
            try:
                with open(DOCS_PATH, encoding="utf-8-sig", newline="") as f:
                    self.documents = list(csv.DictReader(f))
                logger.info("chatbot_documents_loaded", count=len(self.documents))
            except Exception as e:
                logger.warning("chatbot_documents_load_failed", error=str(e))

        # Attempt to load optional FAISS & SentenceTransformer
        try:
            import faiss
            from sentence_transformers import SentenceTransformer

            if INDEX_PATH.exists() and len(self.documents) > 0:
                self.index = faiss.read_index(str(INDEX_PATH))
                self.embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
                logger.info("faiss_vector_index_ready", total_schemes=len(self.documents))
        except Exception as e:
            logger.info("faiss_unavailable_using_keyword_search_fallback", info=str(e))
            self.index = None
            self.embedder = None

        from sklearn.feature_extraction.text import TfidfVectorizer
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", sublinear_tf=True)
        self.matrix = self.vectorizer.fit_transform([
            (d.get("scheme_name", "") + " ") * 3 + d.get("tags", "") + " " + d.get("description", "")
            for d in self.documents
        ])
        self._init_genai_client()
        self._is_initialized = True

    def _init_genai_client(self):
        api_key = (
            settings.CHATBOT_API_KEY
            or settings.GEMINI_API_KEY
            or os.getenv("CHATBOT_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or settings.AI_PROVIDER_API_KEY
        )

        # Gemini API keys must start with 'AIzaSy' to be valid Google API keys
        if api_key and isinstance(api_key, str) and api_key.strip().startswith("AIzaSy"):
            try:
                from google import genai
                self._genai_client = genai.Client(api_key=api_key.strip())
                logger.info("gemini_client_ready")
            except Exception as e:
                logger.warning("gemini_init_failed", error=str(e))
                self._genai_client = None
        else:
            if api_key:
                logger.info("gemini_key_invalid_format_using_local_rag", configured=True)
            self._genai_client = None

    def _build_enriched_query(self, message: str, history: list[dict[str, Any]], profile: Optional[dict[str, Any]] = None) -> str:
        """Enriches short or ambiguous user messages with profile data and conversation context."""
        parts = [message]

        if profile and isinstance(profile, dict):
            bus = profile.get("business_type") or profile.get("businessActivity") or profile.get("occupation")
            state = profile.get("state") or profile.get("location")
            cat = profile.get("social_category") or profile.get("category")
            if bus and str(bus).lower() not in message.lower():
                parts.append(str(bus))
            if state and str(state).lower() not in message.lower():
                parts.append(str(state))
            if cat and str(cat).lower() not in message.lower():
                parts.append(str(cat))

        if len(message.split()) < 6 and history:
            for turn in reversed(history[-4:]):
                if turn.get("role") == "user":
                    c = turn.get("content", "")
                    if len(c) > 3 and c.lower() != message.lower():
                        parts.append(c)
                        break

        return " ".join(parts)

    def _keyword_search(self, query: str, top_k: int = 4) -> list[dict]:
        """Fast, robust keyword search with acronym expansion and multi-field scoring."""
        if not self.documents:
            return []

        import re
        stopwords = {
            "for", "in", "is", "a", "an", "the", "to", "and", "or", "of", "schemes",
            "scheme", "government", "yojana", "want", "need", "get", "how", "what",
            "which", "can", "i", "my", "me", "batao", "chahiye", "kaise", "kya", "about",
            "tell", "give", "list", "apply", "details", "info", "information", "please"
        }

        alias_map = {
            "pmegp": "prime minister employment generation programme micro small enterprise loan subsidy",
            "mudra": "pradhan mantri mudra yojana shishu kishor tarun business loan",
            "standup": "stand up india women sc st entrepreneur bank loan",
            "kisan": "pm kisan samman nidhi agriculture farmer income support",
            "vishwakarma": "pm vishwakarma artisan craftsman handicraft toolkit loan",
            "svanidhi": "pm svanidhi street vendor working capital loan",
            "sukanya": "sukanya samriddhi yojana girl child deposit savings",
            "ayushman": "ayushman bharat pm jay health insurance medical hospital",
            "handicraft": "handicraft artisan coir silk handloom weaving craft",
            "women": "women female entrepreneur ladies mahila nari",
            "subsidy": "subsidy margin money financial assistance grant incentive",
            "loan": "credit loan self employment business collateral free",
            "tailor": "tailoring garment textile stitching micro enterprise",
            "parlour": "beauty parlour salon service micro enterprise",
            "solar": "solar pump rooftop solar agriculture renewable energy",
            "scholarship": "scholarship student education hostel fee concession"
        }

        raw_words = re.findall(r"\w+", query.lower())
        tokens = set()
        for w in raw_words:
            if len(w) > 1 and w not in stopwords:
                tokens.add(w)
                if w in alias_map:
                    for alias_token in alias_map[w].split():
                        if alias_token not in stopwords and len(alias_token) > 2:
                            tokens.add(alias_token)

        if not tokens:
            tokens = {w for w in raw_words if len(w) > 1}

        if not tokens:
            return self.documents[:top_k]

        scored = []
        for doc in self.documents:
            name = (doc.get("scheme_name") or "").lower()
            desc = (doc.get("description") or "").lower()
            benefits = (doc.get("benefits") or "").lower()
            elig = (doc.get("eligibility") or "").lower()
            tags = (doc.get("tags") or "").lower()

            score = 0.0
            for t in tokens:
                if t in name:
                    score += 8.0
                if t in tags:
                    score += 5.0
                if t in benefits:
                    score += 3.0
                if t in elig:
                    score += 2.5
                if t in desc:
                    score += 1.5

            if score > 0:
                scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = [doc for score, doc in scored[:top_k]]
        return results

    def search(self, query: str, top_k: int = 4) -> list[dict]:
        """Performs search across government scheme documents."""
        self._ensure_initialized()
        if not query or not query.strip():
            return []

        if self.index is not None and self.embedder is not None:
            try:
                embedding = self.embedder.encode([query]).astype("float32")
                distances, indices = self.index.search(embedding, top_k)

                results = []
                for idx in indices[0]:
                    if 0 <= idx < len(self.documents):
                        results.append(self.documents[idx])

                if results:
                    return results
            except Exception as e:
                logger.warning("faiss_search_failed_fallback_to_keyword", error=str(e))

        keyword_docs = self._keyword_search(query, top_k=top_k)
        vector = self.vectorizer.transform([query])
        scores = (self.matrix @ vector.T).toarray().ravel()
        ranked = scores.argsort()[::-1][:top_k]
        vector_docs = [self.documents[int(i)] for i in ranked if scores[i] > 0.03]
        combined = []
        seen = set()
        for doc in keyword_docs + vector_docs:
            key = doc.get("scheme_name")
            if key not in seen:
                seen.add(key)
                combined.append(doc)
        return combined[:top_k]

    async def search_async(self, query: str, top_k: int = 4) -> list[dict]:
        """Non-blocking async wrapper for FAISS search."""
        return await asyncio.to_thread(self.search, query, top_k)

    def _clean_text(self, text: Any) -> str:
        if not text:
            return ""
        s = str(text)
        s = s.replace("â₹¹", "₹").replace("â\x82\xac", "₹").replace("â\x82", "₹").replace("\x82", "₹").replace("\x80", "").replace("\x9d", "").replace("\x9c", "").replace("\u20b9", "₹")
        import re
        s = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", s)
        return s.strip()

    def _format_scheme_context(self, doc: dict) -> str:
        return f"""
Scheme Name: {self._clean_text(doc.get('scheme_name', 'N/A'))}
Level: {self._clean_text(doc.get('level', 'Central/State'))}
Description: {self._clean_text(doc.get('description', ''))}
Benefits: {self._clean_text(doc.get('benefits', ''))}
Eligibility: {self._clean_text(doc.get('eligibility', ''))}
Required Documents: {self._clean_text(doc.get('documents', ''))}
Application Process: {self._clean_text(doc.get('application_process', ''))}
Official Website: {self._clean_text(doc.get('official_url', ''))}
--------------------------------------------------
"""

    def _fallback_summary(self, query: str, docs: list[dict], profile: Optional[dict[str, Any]] = None) -> str:
        """Generates a structured, highly accurate scheme response when an LLM key is not configured."""
        if not docs:
            return (
                "I couldn't find specific government schemes matching your search. "
                "You can try searching for terms like 'tailoring', 'agriculture loan', "
                "'women entrepreneurship', or 'MSME subsidy'."
            )

        output_lines = [f"Here are the top matching government schemes for **\"{self._clean_text(query)}\"**:\n"]

        for i, doc in enumerate(docs[:3]):
            s_name = self._clean_text(doc.get('scheme_name', 'Government Scheme'))
            benefits = self._clean_text(doc.get('benefits', 'Financial assistance and subsidy'))
            eligibility = self._clean_text(doc.get('eligibility', 'Check official guidelines'))
            documents = self._clean_text(doc.get('documents', 'Aadhaar card, Bank passbook, Photo'))
            app_proc = self._clean_text(doc.get('application_process', 'Apply online at official portal'))
            url = self._clean_text(doc.get('official_url', 'https://www.myscheme.gov.in'))

            output_lines.append(
                f"### {i+1}. {s_name}\n"
                f"- **Key Benefits:** {benefits[:300]}{'...' if len(benefits) > 300 else ''}\n"
                f"- **Eligibility:** {eligibility[:250]}{'...' if len(eligibility) > 250 else ''}\n"
                f"- **Required Documents:** {documents[:200]}{'...' if len(documents) > 200 else ''}\n"
                f"- **How to Apply:** {app_proc[:250]}{'...' if len(app_proc) > 250 else ''}\n"
                f"- **Official Portal:** [{s_name}]({url})\n"
            )

        output_lines.append("These are catalogue search results, not confirmed eligibility. Check current conditions on the official portal. Use Find Schemes for profile screening or Support for help.")
        return "\n".join(output_lines)

    async def chat(
        self,
        message: str,
        history: list[dict[str, Any]] = [],
        phone_number: Optional[str] = None,
        profile: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Main RAG pipeline: profile-aware vector/keyword search + Gemini generation."""
        await asyncio.to_thread(self._ensure_initialized)

        if message.strip().lower() in {"hi", "hello", "hey", "namaste"}:
            return {"reply": "Hello! Tell me your business activity and state, or ask about a scheme. For personal screening, use Find Schemes. For human help, visit Support.", "retrieved_schemes": [], "mode": "local_retrieval"}
        enriched_query = self._build_enriched_query(message, history, profile)
        retrieved_docs = await self.search_async(enriched_query, top_k=4)
        schemes_context = "\n".join(self._format_scheme_context(d) for d in retrieved_docs)

        # Build Profile Context string if profile is passed
        profile_context = ""
        if profile and isinstance(profile, dict):
            profile_context = "CITIZEN PROFILE DETAILS:\n" + "\n".join(f"- {k}: {v}" for k, v in profile.items() if v) + "\n"

        # Try generating response with Gemini if client is ready
        if self._genai_client:
            history_context = ""
            for turn in history[-4:]:
                r = turn.get("role", "user")
                c = turn.get("content", "")
                history_context += f"{r.capitalize()}: {c}\n"

            system_instruction = (
                "You are SchemeSathi AI, an expert Indian Government Welfare Schemes Assistant. "
                "Your mission is to help Indian citizens discover, understand, and apply for government schemes. "
                "Use the provided official scheme information as your primary ground truth.\n"
                "Formatting Guidelines:\n"
                "- Keep explanations clear, empathetic, and structured with bullet points.\n"
                "- Directly answer the citizen's question accurately based on their profile and explicit prompt.\n"
                "- Highlight key benefits, who is eligible, and documents required.\n"
                "- Provide official application instructions and portal URLs.\n"
                "- If comparing multiple schemes, clearly contrast their targets and benefits."
            )

            prompt = f"""{system_instruction}

{profile_context}
OFFICIAL GOVERNMENT SCHEMES DATA:
{schemes_context}

RECENT CONVERSATION HISTORY:
{history_context}

CITIZEN QUESTION:
{message}

Please provide a helpful, accurate, and easy-to-understand response tailored specifically for the citizen:"""

            raw_models = [settings.CHATBOT_MODEL]
            models_to_try = []
            for m in raw_models:
                if m and m not in models_to_try and "3.5" not in m:
                    models_to_try.append(m)

            for model_name in models_to_try:
                try:
                    def _call_gemini():
                        return self._genai_client.models.generate_content(
                            model=model_name,
                            contents=prompt
                        )
                    response = await asyncio.wait_for(asyncio.to_thread(_call_gemini), timeout=10)
                    if response and response.text:
                        return {
                            "reply": response.text.strip(),
                            "retrieved_schemes": retrieved_docs
                        }
                except Exception as ex:
                    logger.warning("gemini_generation_attempt_failed", model=model_name, error=str(ex))
                    continue

        # Fallback if Gemini not available or calls failed
        reply = self._fallback_summary(message, retrieved_docs, profile)
        return {
            "reply": reply,
            "retrieved_schemes": retrieved_docs,
            "mode": "local_retrieval"
        }


chatbot_service = ChatbotService.get_instance()

