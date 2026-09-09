import pandas as pd
import pickle
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

# ==========================
# Load CSV
# ==========================
df = pd.read_csv("myscheme.csv", encoding="latin1")

# Replace NaN with empty string
df = df.fillna("")

# Convert everything to string
df = df.astype(str)

documents = []
texts = []

for _, row in df.iterrows():

    doc = {
        "scheme_name": str(row["scheme_name"]),
        "level": str(row["level"]),
        "description": str(row["description"]),
        "benefits": str(row["benefits"]),
        "eligibility": str(row["eligibility"]),
        "application_process": str(row["application_process"]),
        "documents": str(row["documents"]),
        "tags": str(row["tags"]),
        "official_url": str(row["official_url"])
    }

    documents.append(doc)

    text = f"""
Scheme Name:
{doc['scheme_name']}

Level:
{doc['level']}

Description:
{doc['description']}

Benefits:
{doc['benefits']}

Eligibility:
{doc['eligibility']}

Required Documents:
{doc['documents']}

Application Process:
{doc['application_process']}

Tags:
{doc['tags']}

Official Website:
{doc['official_url']}
"""

    texts.append(text)

print("Generating embeddings...")

embeddings = model.encode(
    texts,
    convert_to_numpy=True,
    show_progress_bar=True
)

embeddings = embeddings.astype(np.float32)

print("Creating FAISS index...")

dimension = embeddings.shape[1]

index = faiss.IndexFlatL2(dimension)

index.add(embeddings)

print("Saving files...")

faiss.write_index(index, "scheme.index")

with open("documents.pkl", "wb") as f:
    pickle.dump(documents, f)

print("--------------------------------")
print("Database created successfully!")
print("Total schemes:", len(documents))
print("--------------------------------")