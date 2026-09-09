import pickle
import faiss
import numpy as np
import time
import os
from dotenv import load_dotenv

from sentence_transformers import SentenceTransformer
from google import genai

# ===========================
# Gemini API
# ===========================

load_dotenv()

API_KEY = os.getenv("CHATBOT_API_KEY")

if not API_KEY:
    raise ValueError("CHATBOT_API_KEY not found in .env")

client = genai.Client(api_key=API_KEY)

MODEL_NAME = "gemini-3.5-flash-lite"

# ===========================
# Load Model
# ===========================

print("Loading embedding model...")
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

print("Loading database...")

index = faiss.read_index("scheme.index")

with open("documents.pkl", "rb") as f:
    documents = pickle.load(f)

print("Database loaded successfully!")

# ===========================
# Search
# ===========================

def search(query, top_k=5):

    embedding = embedder.encode([query]).astype("float32")

    D, I = index.search(embedding, top_k)

    results = []

    for idx in I[0]:
        if idx != -1:
            results.append(documents[idx])

    return results


# ===========================
# Convert dict → string
# ===========================

def scheme_to_text(doc):

    return f"""
Scheme Name:
{doc.get('scheme_name','')}

Level:
{doc.get('level','')}

Description:
{doc.get('description','')}

Benefits:
{doc.get('benefits','')}

Eligibility:
{doc.get('eligibility','')}

Required Documents:
{doc.get('documents','')}

Application Process:
{doc.get('application_process','')}

Tags:
{doc.get('tags','')}

Official Website:
{doc.get('official_url','')}
"""


# ===========================
# Chatbot
# ===========================

print("\n===============================")
print(" AI Government Scheme Assistant")
print("===============================")

while True:

    query = input("\nYou : ")

    if query.lower() == "exit":
        break

    results = search(query)

    if len(results) == 0:
        print("No matching scheme found.")
        continue

    print("\nRetrieved Schemes\n")

    context = ""

    for doc in results:

        text = scheme_to_text(doc)

        print(text)

        print("-"*60)

        context += text + "\n"

    prompt = f"""
You are an expert Indian Government Scheme Assistant.

Use ONLY the following information.

{context}

Answer the user's question:

{query}

If multiple schemes match, compare them.
"""

    try:

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        print("\nAI Answer\n")
        print(response.text)

    except Exception as e:

        print("\nGemini unavailable.")
        print(e)