// ui/src/App.tsx

import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

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

function App() {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div className="container">
            <h1 className="title">Book Collection</h1>

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
}

export default App;
