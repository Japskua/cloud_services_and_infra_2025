# processor/app/config.py
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Book Recommender API"
    MODEL_NAME: str = os.getenv("MODEL_NAME", "all-MiniLM-L6-v2")
    BOOKS_DATA_PATH: str = os.getenv("BOOKS_DATA_PATH", "data/books.json")

    class Config:
        env_file = ".env"


settings = Settings()
