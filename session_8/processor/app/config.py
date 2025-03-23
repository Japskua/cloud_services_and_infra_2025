# processor/app/config.py
import os
from pydantic_settings import BaseSettings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("processor")


class Settings(BaseSettings):
    APP_NAME: str = "Book Recommender API"
    MODEL_NAME: str = os.getenv("MODEL_NAME", "all-MiniLM-L6-v2")
    BOOKS_DATA_PATH: str = os.getenv("BOOKS_DATA_PATH", "data/books.json")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    # CORS settings
    CORS_ORIGINS: list[str] = ["*"]
    CORS_HEADERS: list[str] = ["*"]
    CORS_METHODS: list[str] = ["*"]

    class Config:
        env_file = ".env"


settings = Settings()
