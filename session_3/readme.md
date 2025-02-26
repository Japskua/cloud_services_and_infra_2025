# Cloud Services & Infrastructure - Session 3 - Frontend

Goal: Deploy the React UI served through Vite.
Topics & Hands-on:

1. Create a basic React UI (starting from a template)
2. Dockerize the frontend
3. Connect frontend to backend

**Project Task:** Teams set up their initial repo and infrastructure. Teams start to implement their backend, frontend and database.

## 0. Project Setup, Prerequisites

**NOTE!** Remember to run run the certificates creation for the project! This time we need app.localhost, backend.localhost, traefik.localhost and postgres.localhost. If you don't remember how to do that, check the previous session or `certificates.md` from the project root.

In addition, you should have a working traefik, backend and database. We are building on top of that. If you do not have them, check the previous Session 2.

## 1. Create a basic React UI (starting from a template)

Well, we already have Bun.js installed, so lets use it to create a new React project.

1. In the project root folder, run `bun create vite ui --template react-ts` to create a new React project with TypeScript in the folder ui/.
2. Run `cd ui`
3. Install the dependencies with `bun install`
4. Run `bun dev` to check that the development server works. Now you should be able to access the UI at http://localhost:5173/.

## 2. Dockerize the frontend

Because we can! Let's dockerize the frontend to run in a container also in the development environment. This is the same as the backend, but with a different Dockerfile.

1. Create a new file called `Dockerfile` in the ui/ folder.
2. Copy the following content into the file:

##### ui/Dockerfile

```dockerfile
# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.3
WORKDIR /usr/src/app
COPY package*.json .
RUN bun install
COPY . .
CMD ["bun", "dev"]
```

3. Add the build command for our ui in the build_docker_images.sh script.

##### build_docker_images.sh

```bash
#!/bin/bash
# build_docker_images.sh
# Builds the docker images for the project
echo "Starting to build the docker images..."

echo "building project-backend:dev..."
docker build -f backend/Dockerfile -t project-backend:dev backend/
echo "project-backend:dev DONE"

echo "building project-ui:dev..."
docker build -f ui/Dockerfile -t project-ui:dev ui/
echo "project-ui:dev DONE"
```

4. Create the .dockerignore file in the ui/ folder.

##### ui/.dockerignore

```
node_modules
Dockerfile*
docker-compose*
.dockerignore
.git
.gitignore
README.md
LICENSE
.vscode
Makefile
.env
.editorconfig
.idea
coverage*
```

5. Run the build script with `./build_docker_images.sh`
6. Let's add all requirements to the docker-compose.yml file.

NOTE: We are not showing the full docker-compose.yml file here, but you can find it in the project root folder.
Here are just the settings for the ui service:

##### docker-compose.yml

```yaml
services:
    ui:
        image: project-ui:dev # This is the image we have built. If missing, check build_docker_images.sh
        volumes:
            - ./ui:/usr/src/app # We want to mount our local ui folder to the container
            - /usr/src/app/node_modules # A neat trick: We want to make sure the container node_modules does not get written by our local node_modules
        networks:
            - cloud_project # Note the network is the same as for traefik! Otherwise this won't work!
        command: bun dev -- --host # We want to add the --host so that we can access the frontend from outside the container
        labels:
            - "traefik.enable=true"
            - "traefik.http.routers.ui.rule=Host(`app.localhost`)" # This is the ui service URL
            - "traefik.http.routers.ui.entrypoints=websecure"
            - "traefik.http.routers.ui.tls=true"
            - "traefik.http.services.ui.loadbalancer.server.port=5173"
```

7. Now, if you run `docker compose up`, you should be able to access the UI at https://app.localhost

### 3. Connect frontend to backend

Yes! Now we want to connect our frontend to our backend. We will use the existing backend /books API to fetch data.
Lets first start by installing required packages in the frontend.

```sh
cd ui
bun add axios
```

Now we can start to modify the frontend to use the backend. Let's start by editing the App.tsx file.

##### ui/src/App.tsx

```tsx
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
```

And to make our code look nice, let's add some styling.

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
```

Let's run the frontend and backend and see if everything works!
BUT NOT! We get an error in the browser console (or at least something similar):

```sh
Access to fetch at 'https://backend/books' from origin 'https://app.localhost' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.
```

This is because our frontend and backend are running on different URLs. We need to set up CORS (Cross-Origin Resource Sharing) to allow the frontend to access the backend. Let's fix it!

#### CORS errors

Our frontend and backend are e running on different URLs. This means that our frontend will not be able to access the backend directly. We need to set up CORS (Cross-Origin Resource Sharing) to allow the frontend to access the backend.

Add the cors plugin for elysia to your backend

```sh
cd backend
bun add @elysiajs/cors
```

And modify the backend/index.ts to use it

##### backend/index.ts

```ts
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { getBooks } from "./database";

const app = new Elysia()
    .use(cors())
    .get("/", () => "Hello Elysia")
    .get("/hello", "Do you miss me?")
    .get("/books", async () => {
        const books = await getBooks();
        return JSON.stringify(books);
    })
    .listen(3000);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
```

Now, build the backend again and restart the docker compose. This time, the frontend should be able to access the backend.

![A working book collection app UI](book_collection_ui.png)
