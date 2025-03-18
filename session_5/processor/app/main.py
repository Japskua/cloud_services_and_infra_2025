# processor/app/main.py
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.schemas import RecommendationRequest, RecommendationResponse
from app.model import get_recommender, BookRecommender
from app.config import settings, logger

# JWT Bearer token security scheme
security = HTTPBearer()

app = FastAPI(title=settings.APP_NAME)


# Custom middleware to log requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    path = request.url.path
    method = request.method

    logger.info(f"Request: {method} {path}")

    # Continue processing the request
    response = await call_next(request)

    logger.info(f"Response status: {response.status_code}")
    return response


# JWT verification dependency
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    # Log token info (careful not to log the entire token in production)
    token_preview = token[:10] + "..." if len(token) > 10 else token
    logger.info(f"Verifying token: {token_preview}")

    if not settings.JWT_SECRET:
        logger.error("JWT_SECRET not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server is not configured for authentication",
        )

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        logger.info(f"Token verified successfully. Payload: {payload}")
        # Check if the payload.permissions includes recommend:read
        if "recommend:read" not in payload.get("permissions", []):
            logger.error("User does not have permission to read recommendations")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return payload
    except JWTError as e:
        logger.error(f"JWT verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.post("/recommend", response_model=RecommendationResponse)
async def recommend_books(
    request: RecommendationRequest,
    token_data: dict = Depends(verify_token),
    recommender: BookRecommender = Depends(get_recommender),
):
    user_id = token_data.get("sub", "unknown")
    logger.info(f"Processing recommendation request for user: {user_id}")
    logger.info(f"Request text: {request.text[:50]}...")

    recommendations = recommender.get_recommendations(request.text)

    logger.info(f"Generated {len(recommendations)} recommendations")
    return RecommendationResponse(recommendations=recommendations)


@app.get("/hello")
async def hello():
    logger.info("Hello endpoint accessed")
    return {"message": "Hello! The Book Recommendation API is up and running."}


@app.get("/auth-hello")
async def auth_hello(token_data: dict = Depends(verify_token)):
    user_id = token_data.get("sub", "unknown")
    logger.info(f"Authenticated hello endpoint accessed by user: {user_id}")
    return {
        "message": f"Hello, authenticated user! Your user ID is: {user_id}",
        "token_data": token_data,
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
