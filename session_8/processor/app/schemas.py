# processor/app/schemas.py
from pydantic import BaseModel, Field


class RecommendationRequest(BaseModel):
    text: str = Field(..., description="User's text for book recommendation")


class BookRecommendation(BaseModel):
    title: str
    author: str
    genre: str
    description: str
    similarity_score: float


class RecommendationResponse(BaseModel):
    recommendations: list[BookRecommendation]
