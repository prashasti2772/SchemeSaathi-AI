import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("CHATBOT_API_KEY")

if not API_KEY:
    raise ValueError("CHATBOT_API_KEY not found in .env")