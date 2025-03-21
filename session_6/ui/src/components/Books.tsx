// ui/src/components/Books.tsx

import axios from "axios";
import { useState, useEffect } from "react";
import { getServiceUrl } from "../helpers/urlHelper";

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
                const backendAddress = getServiceUrl("backend");

                setLoading(true);
                const response = await axios.get<Book[]>(
                    `${backendAddress}/books`
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

            const processorAddress = getServiceUrl("processor");

            // Call the recommendation service
            const response = await axios.post(
                `${processorAddress}/recommend`,
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
