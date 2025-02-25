# Cloud Services & Infrastructure - Session 2 - Backend and Database

Goal: Build the backend API and connect it to a database.
Topics & Hands-on:

1. Setting up Bun (Node.js alternative) backend with Elysia (Express alternative)
2. Dockerizing the backend
3. Adding Postgres database and connecting to the project

**Project Task:** Continue working on the project plan. Make sure you can build and run both backend and database.

## 0. Project Setup, Prerequisites

**NOTE!** Remember to run run the certificates creation for the project! This time we need backend.localhost, traefik.localhost and postgres.localhost. If you don't remember how to do that, check the previous session or `certificates.md` from the project root.

## 1. Setting up Bunjs backend with Elysia

For the project, you can use whatever backend you want. In this session, we will use Bun with Elysia (similar to Express.js), as Bun is getting quite nicely attraction and it is an almost drop-in replacent for Node.js. Other good alternatives could be for example [Node.js](https://nodejs.org) or [Deno](https://deno.land/).

First, go an install Bun: https://bun.sh/

Let's start by creating a new backend project folder in the root of your project. We will be using TypeScript, but thankfully Bun supports TypeScript out of the box. So no need to install anything extra there!

The Bun service will be named as **backend** and this will be the folder where we will be working on the backend during the entire course. So, run the following commands in the project root (in this example this is considered to be the session_2/):

```bash
bun create elysia backend
cd backend
bun run src/index.ts
```

This will create all the required configurations to run bun in the project. You should now be able to access the project at http://localhost:3000/

![Screenshot of Elysia hello world](elysia_hello.png)

Now, if you look at the `backend/package.json` file, you will notice that it contains the start commands with watch! So running `bun run dev` will start the backend in watch mode. This means that any changes you make to the code will be automatically reloaded. SUCH WOW!

## 2. Dockerizing the backend

All right. In reality, we do not want to run our services in the developers environment, but rather in the project's docker environment. So let's create a Dockerfile for our backend.

First, create the file `backend/Dockerfile` with the following content:

##### **backend/Dockerfile**

```dockerfile
FROM oven/bun:1.2.3
WORKDIR /usr/src/app
COPY package*.json .
RUN bun install
COPY . .
CMD ["bun", "run", "dev"]
```

This will create a docker image with the latest version of Bun and will run the backend in watch mode.

### Developing with Docker on your machine

With our setup, we can run all the code in a Docker environment, instead of running in on your own computer. So if you have a Mac, the code still running on Linux. That is handy for development purposes.

Only downside to remember here, is that you need to install npm packages BOTH on your machine and in the docker image. So when you want VSCode tools to work properly, you will need to run `bun install` in the backend folder. And the same must be done inside the Docker image. This happens during the build, but whenever you add new packages, you will need to build the image again.

Now, we want to build the image before running it. Lets just build a shell script to make this easier.
Create a file `build_docker_images.sh` with the following content:

```bash
#!/bin/bash
# Builds the docker images for the project
echo "Starting to build the docker images..."

echo "building project-backend:dev..."
docker build -f backend/Dockerfile -t project-backend:dev backend/
echo "project-backend:dev DONE"
```

Remember to make the script executable with chmod and then run it!

```sh
chmod +x build_docker_images.sh
./build_docker_images.sh
```

### Docker Compose updates

Now, let's create a docker-compose file for our backend. Create the file `docker-compose.yml` in the root of your project with the following content:

```yaml
services:
    traefik:
        image: traefik:v3.3.3
        command:
            - "--configFile=/app/configs/traefik.toml" # This is the traefik configuration file
        volumes:
            - ./traefik/traefik.toml:/app/configs/traefik.toml:ro # We want to mount our local traefik.toml file
            - ./traefik/dynamic_conf.toml:/app/configs/dynamic_conf.toml:ro # We want to mount our local dynamic_conf.toml file
            - ./traefik/certs:/certs:ro # Remember to have the proper certificates here!
            - /var/run/docker.sock:/var/run/docker.sock:rw
        labels:
            - "traefik.enable=true" # We enable traefik for this service
            - "traefik.http.routers.traefik.rule=Host(`traefik.localhost`)" # This is the traefik service URL
            - "traefik.http.routers.traefik.entrypoints=websecure" # We want to use websecure as entrypoint (HTTPS)
            - "traefik.http.routers.traefik.tls=true" # Enable the HTTPS router
            - "traefik.http.routers.traefik.service=api@internal" # This is just internal configuration
        environment:
            - TZ=Europe/Helsinki # Lets set the environment variable TZ to Europe/Helsinki
        ports:
            - "80:80" # Open port 80 to the outside world
            - "443:443" # Open port 443 to the outside world
        networks:
            - cloud_project # And we use this network to connect to the other services
    backend:
        image: project-backend:dev # This is the image we have built. If missing, check build_docker_images.sh
        volumes:
            - ./backend:/usr/src/app # We want to mount our local backend folder to the container
        networks:
            - cloud_project # Note the network is the same as for traefik! Otherwise this won't work!
        command: bun run dev # This is the command we want to run. We are now overriding the default command.
        labels:
            - "traefik.enable=true"
            - "traefik.http.routers.backend.rule=Host(`backend.localhost`)" # This is the backend service URL
            - "traefik.http.routers.backend.entrypoints=websecure"
            - "traefik.http.routers.backend.tls=true"
            - "traefik.http.services.backend.loadbalancer.server.port=3000"

networks:
    cloud_project:
        name: cloud_project # We are creating a network with the name cloud_project
        driver: bridge # We are using the bridge driver
```

**NOTE:** We have now changed also the labels under backend. They are now for example "traefik.http.routers.**backend**.rule=Host(`backend.localhost`)". This is because we want to use the same traefik configuration for all the services.

Now we are also running the backend in watch mode, in docker container. HOWEVER, notice we are mounting the local backend folder to the container. This means that any changes we make to the code will be reflected in the container. This way we can straight just start docker-compose up and develop everything on the local computer - No builds needed! (unless you add packages to the backend).

Let's run docker-compose up and see if everything works.

### Adding some routes

Let's add some routes to the backend in order to see that things work. NOTE! Just start the docker-compose up and then you can edit the code locally in VSCode. All the changes will be reflected in the container immediately.

In order to learn more about Elysia, you can read the tutorial and docs from here: https://elysiajs.com/tutorial.html

Let's add a route to the backend that returns a simple message.

##### backend/src/index.ts

```ts
import { Elysia } from "elysia";

const app = new Elysia()
    .get("/", () => "Hello Elysia")
    .get("/hello", "Do you miss me?")
    .listen(3000);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
```

You should be able to just save the file, and navigate to https://backend.localhost/hello and see the message "Do you miss me?"

### 3. Adding Postgres database and connecting to the project

1. Create new folder in the root called `database`
2. Create a new file called `init.sql` in the `database` folder.

Fill the following content to the file:

```sql
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
```

3. Add the database to the docker-compose.yml file.

```yaml
postgres:
    image: postgres:17.2
    environment:
        - TZ=Europe/Helsinki
        - POSTGRES_USER=user
        - POSTGRES_PASSWORD=password
        - POSTGRES_DB=projectdb
    volumes:
        - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
        - ./db_data:/var/lib/postgresql/data
    healthcheck: # Hey! We are checking that the postgres is up and running!
        test: ["CMD-SHELL", "pg_isready -U user -d projectdb"]
        interval: 10s
        timeout: 5s
        retries: 5
    labels:
        - "traefik.enable=true"
        - "traefik.http.routers.postgres.rule=Host(`postgres.localhost`)"
        - "traefik.http.routers.postgres.entrypoints=websecure"
        - "traefik.http.routers.postgres.tls=true"
        - "traefik.http.services.postgres.loadbalancer.server.port=5432"
    networks:
        - cloud_project
```

4. Let's fire up the docker-compose up and see if everything works.

If the docker-compose starts up and logs appear without errors (=== you followed this guide), you should be good to continue.

5. Connecting backend to the database

Bun.js comes with a package called Bun.sqlite that allows you to connect to sqlite databases. See more at https://bun.sh/docs/api/sql

Let's create a new file called `database.ts` in the `backend/src` folder.

###### backend/src/database.ts

```ts
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
    console.log(sql.options);
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
        console.log(books);
        return books;
    } catch (error) {
        console.error("Error fetching books:", error);
        return [];
    }
};
```

Also, edit the `backend/src/index.ts` file to use the new database.ts file.

###### backend/src/index.ts

```ts
import { Elysia } from "elysia";
import { getBooks } from "./database";

const app = new Elysia()
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

One more thing to do. We need to add the postgres database access URL to the docker-compose.yml file.

Just add the environment variable to the backend service.
NOTE! THIS REQUIRES YOU TO STOP AND START THE DOCKER COMPOSE AGAIN TO TAKE EFFECT!

```yaml
backend:
    image: project-backend:dev # This is the image we have built. If missing, check build_images.sh
    volumes:
        - ./backend:/usr/src/app # We want to mount our local backend folder to the container
    networks:
        - cloud_project # Note the network is the same as for traefik! Otherwise this won't work!
    command: bun run dev # This is the command we want to run. We are now overriding the default command.
    environment:
        - POSTGRES_URL=postgres://user:password@postgres:5432/projectdb # This is the database URL
    labels:
        - "traefik.enable=true"
        - "traefik.http.routers.backend.rule=Host(`backend.localhost`)" # This is the backend service URL
        - "traefik.http.routers.backend.entrypoints=websecure"
        - "traefik.http.routers.backend.tls=true"
        - "traefik.http.services.backend.loadbalancer.server.port=3000"
```

Now, if you start the docker-compose up and navigate to https://backend.localhost/books, you should see the books in the database.

![Successful listing of books](books_listing.png)
