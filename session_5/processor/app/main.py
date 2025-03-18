# processor/app/main.py
from fastapi import FastAPI, Depends
from app.schemas import RecommendationRequest, RecommendationResponse
from app.model import get_recommender, BookRecommender
from app.config import settings

app = FastAPI(title=settings.APP_NAME)


@app.post("/recommend", response_model=RecommendationResponse)
async def recommend_books(
    request: RecommendationRequest,
    recommender: BookRecommender = Depends(get_recommender),
):
    recommendations = recommender.get_recommendations(request.text)
    return RecommendationResponse(recommendations=recommendations)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
