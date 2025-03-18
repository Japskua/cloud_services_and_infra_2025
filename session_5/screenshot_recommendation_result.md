# Cloud Services & Infrastructure - Session 4 - Authentication system

Goal: Introduce long-running microservice & productionize frontend
Topics & Hands-on:

1. Creating a Python microservice (simple processing task)
2. Connecting Python microservice to the frontend with Authorization
3. Set up Nginx to serve the frontend (production-mode)

**Project Task:** Teams create a microservice for additional processing + dockerize frontend for serving

## 0. Creating certificates

We are adding one more microservice to our application. This one will be called `processor`. So, create the localhost certificate for `processor.localhost`.

## 1. Create a Python microservice

We will create a simple recommendation system for our application. It will be a simple Python microservice. This will take user's written text and recommend a book based on the text.

We will be using `uv` to specify the Python environment securely. Go and read more about [uv here](https://docs.astral.sh/uv/).

```sh
mkdir processor
cd processor
uv init --app
```

Now, this creates us the configuration files for the project. You now should have a `pyproject.toml` file as well as a `.python-version` file. I suggest you change the python version to 3.12 in both of these. After this, you notice that running all the commands from the command line seem to happen with the designated python version.

##### `pyproject.toml`

```toml
[project]
name = "processor"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]>=0.115.11",
    "numpy>=2.2.4",
    "pydantic-settings>=2.8.1",
    "python-dotenv>=1.0.1",
    "python-jose[cryptography]>=3.4.0",
    "sentence-transformers>=3.4.1",
    "uvicorn>=0.34.0",
]
```

```
# Project structure
# processor/
# ├── app/
# │   ├── __init__.py
# │   ├── main.py
# │   ├── model.py
# │   ├── schemas.py
# │   └── config.py
# ├── data/
# │   └── books.json
# ├── Dockerfile
# ├── pyproject.toml
# ├── uv.lock
# ├── .env
# ├── .gitignore
# └── README.md
```

All right, now we need to create a simple recommendation system. This will be a simple recommendation system that will recommend a book based on the text. Let's start by creating the main files that we require. See the actual implementations from the GitHub repository.

#### Python files for the project

The configuration file will be used to store the settings for the application. We will be reading some values from the .env file.
Create the `.env` file and add the following values:

##### `.env`

```
APP_NAME="Book Recommender API"
MODEL_NAME="all-MiniLM-L6-v2"
BOOKS_DATA_PATH="data/books.json"
JWT_SECRET="your-secret-key-here-make-this-very-secure-in-production"
JWT_ALGORITHM="HS256"

# CORS Settings
# Comma-separated list of origins, use * for allowing all
CORS_ORIGINS=["*"]
# For restricting to specific origins, use:
# CORS_ORIGINS=["http://localhost:3000", "https://yourdomain.com"]
CORS_HEADERS=["*"]
CORS_METHODS=["*"]
```

##### `app/config.py`

```python
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
```

Next, we need to handle the schemas. We can use pydantic to define what we expect from the user and what we expect from the response.

##### `app/schemas.py`

```python
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

```

The model file will define how we will be processing the data. It uses the SentenceTransformer model to compute the embeddings for the text and the books. You could also use some more advanced LLM model, but we will be using a small model that runs locally. For demonstration purposes.

In addition, our system uses data/books.json as a source of data. In reality, you would want to get the data from the actual database (which we have implemented!!!)

##### `app/model.py`

```python
# processor/app/model.py
import json
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer
from app.config import settings
from app.schemas import BookRecommendation


class BookRecommender:
    def __init__(self):
        # Load the SentenceTransformer model (small and runs locally)
        self.model = SentenceTransformer(settings.MODEL_NAME)

        # Load book data
        with open(settings.BOOKS_DATA_PATH, "r") as file:
            self.books = json.load(file)

        # Pre-compute embeddings for all books
        book_descriptions = [book["description"] for book in self.books]
        self.book_embeddings = self.model.encode(book_descriptions)

    def get_recommendations(
        self, user_text: str, num_recommendations: int = 3
    ) -> List[BookRecommendation]:
        # Encode the user text
        user_embedding = self.model.encode(user_text)

        # Calculate similarity scores
        similarities = []
        for i, book_embedding in enumerate(self.book_embeddings):
            similarity = self._cosine_similarity(user_embedding, book_embedding)
            similarities.append((i, similarity))

        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)

        # Get top recommendations
        recommendations = []
        for i, similarity in similarities[:num_recommendations]:
            book = self.books[i]
            recommendations.append(
                BookRecommendation(
                    title=book["title"],
                    author=book["author"],
                    genre=book["genre"],
                    description=book["description"],
                    similarity_score=float(similarity),
                )
            )

        return recommendations

    def _cosine_similarity(self, vec1, vec2):
        dot_product = np.dot(vec1, vec2)
        norm_vec1 = np.linalg.norm(vec1)
        norm_vec2 = np.linalg.norm(vec2)
        return dot_product / (norm_vec1 * norm_vec2)


# Create singleton instance
recommender = None


def get_recommender():
    global recommender
    if recommender is None:
        recommender = BookRecommender()
    return recommender

```

Finally, we have the main.py. This handles the API endpoints and the JWT authentication. It also uses CORS settings to allow requests from the frontend. In production, you should configure the settings much better than what we have here.

##### `app/main.py`

```python
# processor/app/main.py
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError
from app.schemas import RecommendationRequest, RecommendationResponse
from app.model import get_recommender, BookRecommender
from app.config import settings, logger

# JWT Bearer token security scheme
security = HTTPBearer()

app = FastAPI(title=settings.APP_NAME)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)


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


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

#### Dockerfile

Now, we still need to create a Dockerfile to build our image. Here is an example that you could use:

##### `Dockerfile`

```dockerfile
# Dockerfile
FROM python:3.12-slim-bookworm

# Copy uv from the official image
COPY --from=ghcr.io/astral-sh/uv:0.6.7 /uv /uvx /bin/

# Set work directory
WORKDIR /usr/src/app

# Set the UV_LINK_MODE to copy in order to make system to accept mounting from local filesystem
ENV UV_LINK_MODE=copy

# Copy pyproject.toml and lockfile (if exists) for dependency installation
COPY pyproject.toml .
COPY uv.lock* ./

# Install dependencies without installing the project
# This creates an intermediate layer for better caching
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project

# Copy project files
COPY . .

# Sync the project with bytecode compilation
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --compile-bytecode

# Add the virtual environment to the path
ENV PATH="/usr/src/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Now, remember to update your `build_docker_images.sh` script to include the new Dockerfile.
Add the following lines there:

```sh
echo "building project-processor:dev..."
docker build -f processor/Dockerfile -t project-processor:dev processor/
echo "project-processor:dev DONE"
```

Also, we must now add the new service to our `docker-compose.yml` file.

##### `docker-compose.yml` (only containing updates)

```yaml
processor:
    image: project-processor:dev # This is the image we have built. If missing, check build_images.sh
    volumes:
        - ./processor:/usr/src/app # We want to mount our local backend folder to the container
    networks:
        - cloud_project # Note the network is the same as for traefik! Otherwise this won't work!
    command: uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload # This is the command we want to run. We are now overriding the default command.
    ports:
        - "8000:8000" # Open port 8000 to the outside world
    environment:
        - JWT_SECRET=secret # We want to set the JWT_SECRET in the environment variables. This must match the one in auth and backend!
    labels:
        - "traefik.enable=true"
        - "traefik.http.routers.processor.rule=Host(`processor.localhost`)" # This is the backend service URL
        - "traefik.http.routers.processor.entrypoints=websecure"
        - "traefik.http.routers.processor.tls=true"
        - "traefik.http.services.processor.loadbalancer.server.port=8000"
```

Now, we should be able to run this and see our new microservice in action.

## 2. Connecting Python microservice to the frontend with Authorization

Now, we want to connect our new microservice to our frontend. We will do this by adding a new endpoint to our frontend. We are not using backend to pass data to our `processor` microservice, but we are using the JWT token to authorize the user.

Lets start by updating our `auth` microservice to include new permissions for our new microservice.

##### `auth/src/models/userModel.ts` (only containing updates)

```ts
const defaultPermissions = [
    "read:users",
    "create:users",
    "read:data",
    "create:data",
    "write:data",
    "delete:data",
    "recommend:read" // <<----- NEW PERMISSION
];
```

Update the Books.tsx to contain the new recommendation system.

##### `frontend/src/pages/Books.tsx` (only containing updates)

```tsx
// ui/src/components/Books.tsx

import axios from "axios";
import { useState, useEffect } from "react";

// Define the Book interface to type our data
interface Book {
    id: number;
    title: string;
    author: string;
    published_year: number;
    genre: string;
    isbn: string;
    description: string;
    page_count: number;
    created_at: string;
    updated_at: string;
}

interface Recommendation {
    title: string;
    author: string;
    genre: string;
    description: string;
    similarity_score: number;
}

// Create a Books component to display the book list
const Books = () => {
    const [books, setBooks] = useState<Book[]>([]);
    const [recommendedBooks, setRecommendedBooks] = useState<Recommendation[]>(
        []
    );
    const [loading, setLoading] = useState(true);
    const [recommending, setRecommending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recommendError, setRecommendError] = useState<string | null>(null);
    const [userPreference, setUserPreference] = useState("");
    const [showRecommendations, setShowRecommendations] = useState(false);

    useEffect(() => {
        // Function to fetch books from the API
        const fetchBooks = async () => {
            try {
                setLoading(true);
                const response = await axios.get<Book[]>(
                    "https://backend.localhost/books"
                );
                setBooks(response.data);
                setError(null);
            } catch (err) {
                console.error("Error fetching books:", err);
                setError("Failed to fetch books. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        // Call the fetch function when component mounts
        fetchBooks();
    }, []); // Empty dependency array means this effect runs once on mount

    const handleRecommendation = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userPreference.trim()) {
            setRecommendError("Please describe what kind of books you like.");
            return;
        }

        try {
            setRecommending(true);
            setRecommendError(null);

            // Call the recommendation service
            const response = await axios.post(
                "https://processor.localhost/recommend",
                { text: userPreference },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "access_token"
                        )}`
                    }
                }
            );

            // Handle the specific response format
            if (response.data && Array.isArray(response.data.recommendations)) {
                setRecommendedBooks(response.data.recommendations);
                setShowRecommendations(true);
            } else {
                setRecommendError(
                    "Invalid response from recommendation service."
                );
            }
        } catch (err) {
            console.error("Recommendation error:", err);
            setRecommendError(
                axios.isAxiosError(err) && err.response?.data?.message
                    ? err.response.data.message
                    : "Failed to get recommendations. Please try again later."
            );
        } finally {
            setRecommending(false);
        }
    };

    const resetRecommendations = () => {
        setShowRecommendations(false);
        setRecommendedBooks([]);
        setUserPreference("");
    };

    return (
        <div className="container">
            <h1 className="title">Book Collection</h1>

            <div className="recommendation-container">
                <h2 className="recommendation-title">Suggest Me a Book</h2>

                {recommendError && <p className="error">{recommendError}</p>}

                {!showRecommendations ? (
                    <form
                        onSubmit={handleRecommendation}
                        className="recommendation-form"
                    >
                        <div className="recommendation-input-container">
                            <label htmlFor="userPreference">
                                Tell us what kind of books you enjoy:
                            </label>
                            <textarea
                                id="userPreference"
                                value={userPreference}
                                onChange={(e) =>
                                    setUserPreference(e.target.value)
                                }
                                placeholder="E.g., I love mystery novels with strong female leads, or books about space exploration..."
                                disabled={recommending}
                                rows={3}
                                className="recommendation-input"
                            />
                        </div>
                        <button
                            type="submit"
                            className="recommendation-button"
                            disabled={recommending}
                        >
                            {recommending
                                ? "Finding Books..."
                                : "Get Recommendations"}
                        </button>
                    </form>
                ) : (
                    <div className="recommendations-result">
                        <div className="recommendations-header">
                            <h3>Recommended Books Based on Your Preferences</h3>
                            <p className="recommendation-query">
                                "{userPreference}"
                            </p>
                            <button
                                onClick={resetRecommendations}
                                className="reset-button"
                            >
                                New Recommendation
                            </button>
                        </div>

                        {recommendedBooks.length > 0 ? (
                            <div className="books-container">
                                {recommendedBooks.map((book) => (
                                    <div
                                        key={`${book.title}-${book.author}`}
                                        className="book-card recommended-book"
                                    >
                                        <div className="book-header">
                                            <span className="book-genre">
                                                {book.genre.toUpperCase()}
                                            </span>
                                            <span className="recommended-badge">
                                                Recommended
                                            </span>
                                            <h2 className="book-title">
                                                {book.title}
                                            </h2>
                                            <p className="book-author">
                                                {book.author}
                                            </p>
                                        </div>
                                        <div className="book-details">
                                            <div className="book-meta">
                                                <span className="similarity-score">
                                                    Match:{" "}
                                                    {Math.round(
                                                        book.similarity_score *
                                                            100
                                                    )}
                                                    %
                                                </span>
                                            </div>
                                            <p className="book-description">
                                                {book.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-recommendations">
                                No books matching your preferences were found.
                                Try a different description.
                            </p>
                        )}
                    </div>
                )}
            </div>

            <h2 className="section-title">
                {showRecommendations ? "All Books" : "Browse All Books"}
            </h2>

            {loading ? (
                <p className="loading">Loading books...</p>
            ) : error ? (
                <p className="error">{error}</p>
            ) : (
                <div className="books-container">
                    {books.map((book) => (
                        <div key={book.id} className="book-card">
                            <div className="book-header">
                                <span className="book-genre">
                                    {book.genre.toUpperCase()}
                                </span>
                                <h2 className="book-title">{book.title}</h2>
                                <p className="book-author">{book.author}</p>
                            </div>
                            <div className="book-details">
                                <div className="book-meta">
                                    <span>
                                        Published: {book.published_year}
                                    </span>
                                    <span>{book.page_count} pages</span>
                                </div>
                                <p className="book-description">
                                    {book.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Books;
```

Andd add some nice updates to the `App.css` file:

##### ui/src/App.css

```css
/* ui/src/App.css */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
        Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    background-color: #f5f7fa;
    color: #333;
    line-height: 1.5;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

.title {
    color: #4a90e2;
    font-size: 2.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #4a90e2;
    padding-bottom: 0.5rem;
    display: inline-block;
}

.loading,
.error {
    text-align: center;
    padding: 2rem;
    font-size: 1.2rem;
}

.error {
    color: #e53935;
    background-color: #ffebee;
    border-radius: 8px;
}

/* Flexbox layout */
.books-container {
    display: flex;
    flex-wrap: wrap;
    margin: -10px; /* Negative margin to counteract the padding on cards */
}

.book-card {
    flex: 0 0 calc(33.333% - 20px); /* Three columns minus the margins */
    margin: 10px;
    background-color: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
}

.book-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

/* For tablets */
@media (max-width: 1024px) {
    .book-card {
        flex: 0 0 calc(50% - 20px); /* Two columns on tablets */
    }
}

/* For mobile */
@media (max-width: 600px) {
    .book-card {
        flex: 0 0 calc(100% - 20px); /* One column on mobile */
    }
}

.book-header {
    padding: 1.5rem;
    border-bottom: 1px solid #eee;
}

.book-genre {
    display: inline-block;
    background-color: #4a90e2;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 50px;
    font-size: 0.75rem;
    margin-bottom: 0.75rem;
    font-weight: 500;
}

.book-title {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #333;
    font-weight: 600;
}

.book-author {
    color: #666;
    font-size: 1rem;
}

.book-details {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.book-meta {
    display: flex;
    justify-content: space-between;
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 1rem;
}

.book-description {
    font-size: 0.95rem;
    color: #333;
}

.recommendation-container {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.recommendation-title {
    color: #4a90e2;
    font-size: 1.8rem;
    margin-bottom: 1.2rem;
    font-weight: 600;
}

.recommendation-form {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.recommendation-input-container {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
}

.recommendation-input-container label {
    font-weight: 500;
    color: #555;
    font-size: 1rem;
}

.recommendation-input {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
    min-height: 100px;
    background-color: #fafafa;
    transition: all 0.3s ease;
}

.recommendation-input:focus {
    outline: none;
    border-color: #4a90e2;
    background-color: white;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.recommendation-button {
    background-color: #4a90e2;
    color: white;
    padding: 0.9rem;
    border: none;
    border-radius: 6px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    align-self: flex-start;
    min-width: 200px;
    box-shadow: 0 2px 6px rgba(74, 144, 226, 0.2);
}

.recommendation-button:hover {
    background-color: #3a80d2;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(74, 144, 226, 0.3);
}

.recommendation-button:disabled {
    background-color: #9fc6f0;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.recommendations-result {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.recommendations-header {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    margin-bottom: 0.5rem;
}

.recommendations-header h3 {
    font-size: 1.4rem;
    color: #333;
    margin: 0;
}

.recommendation-query {
    color: #666;
    font-style: italic;
    margin: 0;
    padding: 0.5rem 0.8rem;
    background-color: #f5f7fa;
    border-left: 3px solid #4a90e2;
    border-radius: 0 4px 4px 0;
}

.reset-button {
    background-color: #f5f7fa;
    color: #4a90e2;
    border: 1px solid #4a90e2;
    padding: 0.6rem 1rem;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    align-self: flex-start;
}

.reset-button:hover {
    background-color: #4a90e2;
    color: white;
}

.section-title {
    color: #333;
    font-size: 1.8rem;
    margin: 2rem 0 1.5rem;
    font-weight: 600;
}

.recommended-book {
    border: 2px solid #4a90e2;
    position: relative;
}

.recommended-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background-color: #4a90e2;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 500;
}

.no-recommendations {
    padding: 2rem;
    text-align: center;
    background-color: #f5f7fa;
    border-radius: 6px;
    color: #666;
    font-size: 1.1rem;
}

.similarity-score {
    background-color: #e3f2fd;
    color: #1e88e5;
    padding: 0.3rem 0.7rem;
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 600;
}
```

Now, we should be able to run the application and get the book recommendations based on the user's input.

![Screenshot of the new suggest me a book box](screenshot_suggest_box.png.png)

And the book recommendations results should show like this:

![Screenshot of the recommendation results](screenshot_recommendation_result.md.png)
