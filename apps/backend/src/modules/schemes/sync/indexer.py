"""Rebuilds search indices (FAISS, embeddings, BM25) and synchronizes runtime services in-memory."""
import os
import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from src.config.logging import get_logger

logger = get_logger("scheme_sync.indexer")

BASE_DIR = Path(__file__).resolve().parents[3]
CHATBOT_ML_DIR = BASE_DIR / "ml" / "chatbot"
INDEX_PATH = CHATBOT_ML_DIR / "scheme.index"
DOCS_PKL_PATH = CHATBOT_ML_DIR / "documents.pkl"


def format_doc_to_text(doc: Dict[str, Any]) -> str:
    """Formats a scheme document into dense embedding text."""
    return f"""Scheme Name: {doc.get('scheme_name', '')}
Level: {doc.get('level', 'Central')}
Description: {doc.get('description', '')}
Benefits: {doc.get('benefits', '')}
Eligibility: {doc.get('eligibility', '')}
Required Documents: {doc.get('documents', '')}
Application Process: {doc.get('application_process', '')}
Tags: {doc.get('tags', '')}
Official Website: {doc.get('official_url', '')}"""


class SearchIndexSynchronizer:
    """Rebuilds FAISS index and syncs in-memory Chatbot and Eligibility engines."""

    def rebuild_faiss_and_documents(
        self,
        schemes: List[Dict[str, Any]],
        index_file: Optional[Path] = None,
        docs_file: Optional[Path] = None,
        use_sentence_transformers: bool = True
    ) -> bool:
        """
        Rebuilds documents.pkl and scheme.index from the updated schemes.
        """
        idx_path = Path(index_file) if index_file else INDEX_PATH
        pkl_path = Path(docs_file) if docs_file else DOCS_PKL_PATH

        idx_path.parent.mkdir(parents=True, exist_ok=True)
        pkl_path.parent.mkdir(parents=True, exist_ok=True)

        # Standardize document format for chatbot retrieval
        documents = []
        texts = []
        for s in schemes:
            doc = {
                "scheme_name": str(s.get("scheme_name") or s.get("name") or ""),
                "slug": str(s.get("slug") or s.get("scheme_id") or ""),
                "level": str(s.get("level") or "Central"),
                "description": str(s.get("description") or ""),
                "benefits": str(s.get("benefits") or ""),
                "eligibility": str(s.get("eligibility") or ""),
                "application_process": str(s.get("application_process") or ""),
                "documents": str(s.get("documents") or ""),
                "tags": str(s.get("tags") or ""),
                "official_url": str(s.get("official_url") or ""),
                "status": str(s.get("status") or "active"),
            }
            documents.append(doc)
            texts.append(format_doc_to_text(doc))

        # Always write documents.pkl atomically
        temp_pkl = pkl_path.with_suffix(".tmp.pkl")
        with open(temp_pkl, "wb") as f:
            pickle.dump(documents, f)
        os.replace(temp_pkl, pkl_path)
        logger.info("documents_pkl_rebuilt", total=len(documents), path=str(pkl_path))

        if not use_sentence_transformers:
            logger.info("skipping_faiss_model_embedding_requested")
            return True

        try:
            import faiss
            from sentence_transformers import SentenceTransformer

            logger.info("loading_sentence_transformer_for_rebuild")
            model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
            embeddings = embeddings.astype(np.float32)

            dimension = embeddings.shape[1]
            index = faiss.IndexFlatL2(dimension)
            index.add(embeddings)

            temp_idx = idx_path.with_suffix(".tmp.index")
            faiss.write_index(index, str(temp_idx))
            os.replace(temp_idx, idx_path)
            logger.info("faiss_index_rebuilt_successfully", total_vectors=len(documents), path=str(idx_path))
            return True

        except Exception as e:
            logger.warning("faiss_rebuild_fallback", error=str(e))
            return False

    def sync_in_memory_services(self) -> None:
        """
        Refreshes all in-memory singleton caches (Chatbot, EligibilityService, EligibilityEngine)
        so running API workers reflect updated schemes immediately.
        """
        # 1. ChatbotService
        try:
            from src.modules.chatbot.service import chatbot_service
            with chatbot_service._init_lock:
                chatbot_service._is_initialized = False
                chatbot_service._initialize()
            logger.info("chatbot_service_memory_synchronized", count=len(chatbot_service.documents))
        except Exception as e:
            logger.warning("chatbot_memory_sync_failed", error=str(e))

        # 2. EligibilityService
        try:
            from src.modules.eligibility.service import eligibility_service
            from src.modules.eligibility.catalogue import load_catalogue
            from src.modules.eligibility.service import _normalize_key

            eligibility_service.scheme_catalog = {
                _normalize_key(row["scheme_name"]): row for row in load_catalogue()
            }
            logger.info("eligibility_service_memory_synchronized", count=len(eligibility_service.scheme_catalog))
        except Exception as e:
            logger.warning("eligibility_service_memory_sync_failed", error=str(e))

        # 3. SchemeChatbotService (TF-IDF fallback in src/ml/chatbot)
        try:
            from src.ml.chatbot.chatbot_service import SchemeChatbotService
            # If an instance is active or imported
            service = SchemeChatbotService()
            logger.info("ml_chatbot_tfidf_synchronized", count=len(service.documents))
        except Exception as e:
            logger.debug("ml_chatbot_sync_note", note=str(e))
