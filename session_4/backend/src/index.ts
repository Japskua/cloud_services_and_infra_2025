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
