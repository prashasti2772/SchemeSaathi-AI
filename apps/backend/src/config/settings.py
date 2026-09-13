from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENABLE_STAFF_API: bool = False
    PUBLIC_SITE_URL: str = "http://localhost:5173"
    SMS_LIVE_ENABLED: bool = False
    ENV: str = "development"
    APP_NAME: str = "SIH26092 Scheme Matching API"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "sqlite+aiosqlite:///./schemesathi.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_SELF_SERVICE: str = "10/minute"

    AI_PROVIDER_API_KEY: str = ""
    AI_PROVIDER_BASE_URL: str = "https://api.openai.com/v1"
    AI_CHAT_MODEL: str = "gpt-4o-mini"

    # Chatbot & Gemini Configuration
    CHATBOT_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    CHATBOT_MODEL: str = "gemini-3.6-flash"
    TRANSLATION_MODEL: str = "gemini-3.5-flash-lite"

    TELEPHONY_PROVIDER: str = "exotel"
    TELEPHONY_API_KEY: str = ""
    TELEPHONY_API_SECRET: str = ""
    TELEPHONY_CALLBACK_NUMBER: str = ""

    EXOTEL_SID: str = ""
    EXOTEL_API_KEY: str = ""
    EXOTEL_API_TOKEN: str = ""
    EXOTEL_SUBDOMAIN: str = "api.exotel.com"
    EXOTEL_CALLER_ID: str = ""
    EXOTEL_APP_ID: str = ""

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    TWILIO_VOICE_WEBHOOK_URL: str = ""

    WEBHOOK_SHARED_SECRET: str = ""

    SMS_PROVIDER: str = "firebase"
    MSG91_AUTH_KEY: str = ""
    MSG91_SENDER_ID: str = ""
    MSG91_TEMPLATE_ID: str = ""
    MSG91_OTP_TEMPLATE_ID: str = ""
    SMS_API_KEY: str = ""
    FIREBASE_API_KEY: str = ""
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_AUTH_DOMAIN: str = ""
    FIREBASE_APP_ID: str = ""

    OCR_PROVIDER: str = "google_vision"
    OCR_API_KEY: str = ""
    GOOGLE_VISION_API_KEY: str = ""

    # Bhashini (Digital India Bhashini / ULCA-Dhruva) — real government NLP pipeline
    # for ASR, translation and TTS across Indian languages.
    VOICE_AI_PROVIDER: str = "bhashini"
    BHASHINI_USER_ID: str = ""
    BHASHINI_API_KEY: str = ""
    BHASHINI_PIPELINE_ID: str = "64392f96daac500b55c543cd"
    BHASHINI_CONFIG_ENDPOINT: str = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    BHASHINI_DEFAULT_LANGUAGE: str = "hi"

    AWS_S3_BUCKET: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"

    # Recovery emails are enabled only when a real sender is configured.
    SUPPORT_EMAIL: str = "customercareprashasti@gmail.com"
    EMAIL_PROVIDER: str = "smtp"
    EMAIL_FROM_ADDRESS: str = ""
    RESEND_API_KEY: str = ""
    APPS_SCRIPT_URL: str = ""
    APPS_SCRIPT_SECRET: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_SSL: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
