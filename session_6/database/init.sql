-- Create books table
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    published_year INTEGER,
    genre VARCHAR(100),
    isbn VARCHAR(20) UNIQUE,
    description TEXT,
    page_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on commonly searched fields
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_genre ON books(genre);

-- Insert sample data
INSERT INTO books (title, author, published_year, genre, isbn, description, page_count)
VALUES 
    ('The Great Gatsby', 'F. Scott Fitzgerald', 1925, 'Classic', '9780743273565', 'A story of wealth, love, and the American Dream in the Jazz Age', 180),
    ('To Kill a Mockingbird', 'Harper Lee', 1960, 'Fiction', '9780061120084', 'A story about racial inequality and moral growth in the American South', 281),
    ('1984', 'George Orwell', 1949, 'Dystopian', '9780451524935', 'A dystopian social science fiction novel set in a totalitarian future', 328),
    ('The Hobbit', 'J.R.R. Tolkien', 1937, 'Fantasy', '9780618260300', 'A fantasy novel about the adventures of a hobbit named Bilbo Baggins', 310),
    ('Pride and Prejudice', 'Jane Austen', 1813, 'Romance', '9780141439518', 'A romantic novel of manners focusing on the Bennet family', 432),
    ('The Catcher in the Rye', 'J.D. Salinger', 1951, 'Coming-of-age', '9780316769488', 'A story about teenage angst and alienation', 277),
    ('Brave New World', 'Aldous Huxley', 1932, 'Dystopian', '9780060850524', 'A dystopian novel set in a futuristic World State', 311),
    ('The Lord of the Rings', 'J.R.R. Tolkien', 1954, 'Fantasy', '9780618640157', 'An epic high-fantasy novel', 1178),
    ('Harry Potter and the Philosophers Stone', 'J.K. Rowling', 1997, 'Fantasy', '9780747532743', 'The first novel in the Harry Potter series', 223),
    ('The Hunger Games', 'Suzanne Collins', 2008, 'Dystopian', '9780439023481', 'A dystopian novel set in a post-apocalyptic nation', 374);

-- Example query: Get all books by genre
-- SELECT * FROM books WHERE genre = 'Fantasy';

-- Example query: Get books published after 1950
-- SELECT title, author, published_year FROM books WHERE published_year > 1950 ORDER BY published_year;

-- Example query: Get book count by genre
-- SELECT genre, COUNT(*) as book_count FROM books GROUP BY genre ORDER BY book_count DESC;