from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_user: str = ""
    mongo_password: str = ""
    database_name: str = "genzpulse"
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # LLM (for future use)
    groq_api_key: str = ""
    
    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra env vars


@lru_cache
def get_settings() -> Settings:
    return Settings()
