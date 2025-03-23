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
