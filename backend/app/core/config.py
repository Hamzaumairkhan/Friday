"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from pathlib import Path
from typing import Optional, List
from pydantic_settings import BaseSettings

# Anchored paths ensuring data and .env are always inside backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_DB_FILE = (DATA_DIR / "friday.db").as_posix()
DEFAULT_CHROMA_DIR = (DATA_DIR / "chroma").as_posix()
ENV_FILE_PATH = (BACKEND_DIR / ".env").as_posix()


class Settings(BaseSettings):
    """Minimal, essential application settings for Friday."""

    # APP
    APP_NAME: str = "Friday"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # DATABASE (Anchored strictly to backend/data/friday.db or remote MySQL)
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_FILE}"
    DATABASE_SYNC_URL: str = f"sqlite:///{DEFAULT_DB_FILE}"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: float = 30.0
    DB_POOL_RECYCLE: int = 1800
    DB_POOL_PRE_PING: bool = True

    # REDIS / CACHE
    REDIS_URL: Optional[str] = None
    DISABLE_RATE_LIMIT: bool = False

    # LLM - PRIMARY (Groq Cloud)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "qwen/qwen3.8-27b"

    # LLM - REASONING & PLANNING / FALLBACK (Google Gemini)
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # VECTOR STORE (Persistent ChromaDB under backend/data/chroma)
    CHROMA_PATH: str = DEFAULT_CHROMA_DIR
    EMBEDDING_PROVIDER: str = "gemini"
    EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIMENSIONS: int = 384

    # WEB RESEARCH (Tavily)
    TAVILY_API_KEY: Optional[str] = None

    # WEATHER (OpenWeather)
    OPENWEATHER_API_KEY: Optional[str] = None

    # MAPS & PLACES (Google Maps / OpenStreetMap fallback)
    GOOGLE_MAPS_API_KEY: Optional[str] = None

    # EMAIL (Direct Gmail SMTP + Resend Fallback)
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "todaysfriday555@gmail.com"
    ADMIN_EMAIL: Optional[str] = "hamzaumairkhan30@gmail.com"
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = "todaysfriday555@gmail.com"
    SMTP_PASSWORD: Optional[str] = "ajif ktyg semf bbqi"

    # WHATSAPP (Isolated local Baileys microservice)
    WHATSAPP_SERVICE_URL: str = "http://127.0.0.1:3001"

    # CLOUDINARY (Optional Image Storage for Production)
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # OBSERVABILITY (LangSmith - Optional)
    LANGSMITH_API_KEY: Optional[str] = None
    LANGSMITH_TRACING: bool = False
    LANGSMITH_PROJECT: str = "friday"

    # CORS & FRONTEND
    FRONTEND_URL: Optional[str] = None
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    model_config = {
        "env_file": [ENV_FILE_PATH, ".env"],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
