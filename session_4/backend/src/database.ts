// backend/src/database.ts
import { sql } from "bun";

// Define a Book interface to match our database schema
interface Book {
    id: number;
    title: string;
    author: string;
    published_year: number;
    genre: string;
    isbn: string;
    description: string;
    page_count: number;
    created_at: Date;
    updated_at: Date;
}

export const getBooks = async () => {
    // console.log(sql.options);
    try {
        // Get the raw query results
        const result = await sql`SELECT * FROM books`.values();

        // The result is an array where each book is represented as an array of values
        // We need to exclude the last two elements (command and count)
        const booksData = result.slice(0, -2);

        // Map each array to a proper Book object with named properties
        const books = booksData.map((book: any) => ({
            id: book[0],
            title: book[1],
            author: book[2],
            published_year: book[3],
            genre: book[4],
            isbn: book[5],
            description: book[6],
            page_count: book[7],
            created_at: book[8],
            updated_at: book[9]
        }));
        // console.log(books);
        return books;
    } catch (error) {
        console.error("Error fetching books:", error);
        return [];
    }
};
