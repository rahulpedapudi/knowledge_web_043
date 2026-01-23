from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import Any


class Settings(BaseSettings):
    # MongoDB
    mongo_uri: str
    mongo_user: str = ""
    mongo_password: str = ""
    database_name: str = "genzpulse"
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8080  # Cloud Run default port
    
    # JWT Authentication
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    
    # LLM
    groq_api_key: str
    
    # Google OAuth
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str
    
    # CORS - can be comma-separated string or list
    cors_origins: str | list[str] = "http://localhost:5173"
    
    # Frontend URL for OAuth redirects
    frontend_url: str = "http://localhost:5173"

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v

    @field_validator('api_port', mode='before')
    @classmethod
    def parse_port(cls, v: Any) -> int:
        """Parse PORT from environment (Cloud Run uses PORT env var)."""
        if isinstance(v, str):
            return int(v)
        return v

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra env vars
        # Map PORT to api_port for Cloud Run compatibility
        fields = {
            'api_port': {'validation_alias': 'PORT'}
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
