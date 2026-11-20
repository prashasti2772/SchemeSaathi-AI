"""
chatbot_service.py

High-performance RAG Scheme Chatbot Service for SchemeSathi.
Leverages documents.pkl (653 government welfare schemes) with semantic & TF-IDF
retrieval, contextual answer synthesis via Gemini / OpenAI, and reliable offline fallback.
"""

import os
import pickle
import re
from typing import Any, List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import logging
logger = logging.getLogger("chatbot_service")

try:
    from src.config.settings import settings
except ImportError:
    class DummySettings:
        AI_PROVIDER_API_KEY = ""
    settings = DummySettings()

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_PATH = os.path.join(CURRENT_DIR, "documents.pkl")
INDEX_PATH = os.path.join(CURRENT_DIR, "scheme.index")
CSV_PATH = os.path.join(CURRENT_DIR, "myscheme.csv")


class SchemeChatbotService:
    def __init__(self):
        self.documents: List[dict] = []
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None
        self._load_database()

    def _load_database(self):
        try:
            if os.path.exists(DOCS_PATH):
                with open(DOCS_PATH, "rb") as f:
                    self.documents = pickle.load(f)
                logger.info("chatbot_database_loaded", count=len(self.documents))
            elif os.path.exists(CSV_PATH):
                import pandas as pd
                df = pd.read_csv(CSV_PATH, encoding="latin1").fillna("").astype(str)
                for _, row in df.iterrows():
                    self.documents.append({
                        "scheme_name": str(row.get("scheme_name", "")),
                        "level": str(row.get("level", "")),
                        "description": str(row.get("description", "")),
                        "benefits": str(row.get("benefits", "")),
                        "eligibility": str(row.get("eligibility", "")),
                        "application_process": str(row.get("application_process", "")),
                        "documents": str(row.get("documents", "")),
                        "tags": str(row.get("tags", "")),
                        "official_url": str(row.get("official_url", "")),
                    })
                logger.info("chatbot_csv_loaded", count=len(self.documents))

            if self.documents:
                corpus = []
                for doc in self.documents:
                    text = f"{doc.get('scheme_name', '')} {doc.get('tags', '')} {doc.get('description', '')} {doc.get('benefits', '')} {doc.get('eligibility', '')}"
                    corpus.append(text)
                
                self.vectorizer = TfidfVectorizer(
                    stop_words="english",
                    ngram_range=(1, 2),
                    max_features=12000
                )
                self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
                logger.info("chatbot_vectorizer_ready")
        except Exception as e:
            logger.error("chatbot_init_failed", error=str(e))

    def search_schemes(self, query: str, top_k: int = 3) -> List[dict]:
        if not self.documents or self.vectorizer is None or self.tfidf_matrix is None:
            return []

        clean_query = query.strip()
        if not clean_query:
            return []

        try:
            q_vec = self.vectorizer.transform([clean_query])
            similarities = cosine_similarity(q_vec, self.tfidf_matrix)[0]

            # Boost exact keyword matches in scheme names
            query_lower = clean_query.lower()
            query_tokens = [t for t in re.split(r"\W+", query_lower) if len(t) > 2]

            for i, doc in enumerate(self.documents):
                name_lower = str(doc.get("scheme_name", "")).lower()
                tags_lower = str(doc.get("tags", "")).lower()
                
                # Check for explicit token matches
                match_count = sum(1 for tok in query_tokens if tok in name_lower or tok in tags_lower)
                if match_count > 0:
                    similarities[i] += match_count * 0.25

            top_indices = np.argsort(similarities)[::-1][:top_k]
            results = []
            for idx in top_indices:
                if similarities[idx] > 0.04 or len(results) == 0:
                    item = dict(self.documents[idx])
                    item["relevance_score"] = float(similarities[idx])
                    results.append(item)
            return results
        except Exception as e:
            logger.error("chatbot_search_failed", error=str(e))
            return []

    def format_scheme_context(self, docs: List[dict]) -> str:
        blocks = []
        for i, doc in enumerate(docs, 1):
            block = (
                f"### Scheme {i}: {doc.get('scheme_name', 'Unnamed Scheme')}\n"
                f"- **Level**: {doc.get('level', 'Central / State')}\n"
                f"- **Description**: {doc.get('description', '')}\n"
                f"- **Benefits**: {doc.get('benefits', '')}\n"
                f"- **Eligibility**: {doc.get('eligibility', '')}\n"
                f"- **Required Documents**: {doc.get('documents', '')}\n"
                f"- **Application Process**: {doc.get('application_process', '')}\n"
                f"- **Official Link**: {doc.get('official_url', '')}\n"
            )
            blocks.append(block)
        return "\n\n".join(blocks)

    def _local_synthesis(self, query: str, docs: List[dict], user_profile: Optional[dict] = None) -> str:
        """Fallback natural language generator when external LLMs are unreachable."""
        if not docs:
            return (
                "I couldn't find a specific government scheme matching your query. "
                "You can try asking about specific sectors like **PMEGP loans**, **MUDRA**, "
                "**artisan support**, **farmer subsidies**, or explore the Scheme Finder!"
            )

        top = docs[0]
        name = top.get("scheme_name", "the requested scheme")
        benefits = top.get("benefits", "Financial assistance and government support.")
        eligibility = top.get("eligibility", "Please refer to official guidelines.")
        app_process = top.get("application_process", "Apply online through the official portal.")
        documents = top.get("documents", "Aadhaar Card, Bank Details, and Identity Proof.")
        official_url = top.get("official_url", "")

        reply = f"Here is the information for **{name}**:\n\n"
        reply += f"### Benefits\n{benefits}\n\n"
        reply += f"### Eligibility Criteria\n{eligibility}\n\n"
        reply += f"### Required Documents\n{documents}\n\n"
        reply += f"### How to Apply\n{app_process}\n\n"

        if official_url and official_url.startswith("http"):
            reply += f"**Official Website**: [{official_url}]({official_url})\n\n"

        if len(docs) > 1:
            reply += "---\n\n**Other Related Schemes:**\n"
            for other in docs[1:]:
                reply += f"- **{other.get('scheme_name')}**: {other.get('benefits')[:120]}...\n"

        return reply

    async def answer_question(
        self,
        query: str,
        history: Optional[List[dict]] = None,
        user_profile: Optional[dict] = None
    ) -> dict:
        matched_docs = self.search_schemes(query, top_k=3)
        context = self.format_scheme_context(matched_docs)

        # 1. Try Gemini if CHATBOT_API_KEY or GEMINI_API_KEY is configured
        gemini_key = os.getenv("CHATBOT_API_KEY") or os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=gemini_key)
                prompt = (
                    "You are SchemeSathi AI Assistant, an expert advisor on Indian Government welfare schemes. "
                    "Provide a warm, polite, and well-structured response using ONLY the schemes provided below. "
                    "Use markdown bullet points, bold highlights, and include official links where available.\n\n"
                    f"Retrieved Schemes Information:\n{context}\n\n"
                    f"Citizen's Question: {query}"
                )
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                if response and response.text:
                    return {"reply": response.text.strip(), "schemes": matched_docs}
            except Exception as e:
                logger.warning("gemini_generation_failed", error=str(e))

        # 2. Try OpenAI / ai_client if configured
        if settings.AI_PROVIDER_API_KEY:
            try:
                from src.integrations import ai_client
                messages = [
                    {
                        "role": "system",
                        "content": (
                            "You are SchemeSathi AI Assistant, an expert advisor on Indian Government welfare schemes. "
                            "Answer citizens clearly and accurately using the provided scheme context. Format with markdown."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Context:\n{context}\n\nQuestion: {query}",
                    }
                ]
                reply = await ai_client.chat_completion(messages, max_tokens=600)
                if reply:
                    return {"reply": reply.strip(), "schemes": matched_docs}
            except Exception as e:
                logger.warning("ai_client_generation_failed", error=str(e))

        # 3. Intelligent Local Synthesis
        reply = self._local_synthesis(query, matched_docs, user_profile)
        return {"reply": reply, "schemes": matched_docs}


# Singleton instance
scheme_chatbot = SchemeChatbotService()
