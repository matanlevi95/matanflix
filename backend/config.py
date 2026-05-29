"""Central configuration for the MyTV backend.

All secrets are read from environment variables (see .env.example). The app
runs without API keys — sources that require a key simply return empty results
and log a warning, so the rest of the system keeps working.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- TMDB ---
    tmdb_api_key: str = ""
    tmdb_base_url: str = "https://api.themoviedb.org/3"
    tmdb_image_base: str = "https://image.tmdb.org/t/p"
    tmdb_language: str = "he-IL"
    tmdb_region: str = "IL"

    # --- Sources ---
    youtube_api_key: str = ""
    opensubtitles_api_key: str = ""
    opensubtitles_user_agent: str = "Matanflix v1.0"

    # --- Cache ---
    metadata_cache_ttl_hours: int = 24

    # --- Storage ---
    database_path: str = "mytv.db"

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000

    @property
    def cache_ttl_seconds(self) -> int:
        return self.metadata_cache_ttl_hours * 3600


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
