from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres
    database_url: str = "postgresql+asyncpg://agenticmesh:change-me@postgres:5432/agenticmesh"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Qdrant
    qdrant_url: str = "http://qdrant:6333"
    qdrant_collection: str = "documents"

    # Azure AI Foundry (OpenAI-compatible endpoint, e.g. https://<resource>.services.ai.azure.com/openai/v1)
    azure_ai_foundry_endpoint: str = ""
    azure_ai_foundry_api_key: str = ""
    azure_ai_foundry_chat_deployment: str = "gpt-4o-mini"
    azure_ai_foundry_embedding_deployment: str = "text-embedding-3-small"
    azure_ai_foundry_embedding_dimensions: int = 1536

    # Auth
    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # Misc
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = "/data/uploads"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
