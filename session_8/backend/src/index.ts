// backend/src/index.ts

import { Elysia } from "elysia";
import swagger from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { protectedRouter } from "./routes/protectedRouter";
import { register } from "./metrics";

const PORT = process.env.PORT || 3000;

const app = new Elysia()
    .use(swagger())
    .use(cors())
    .get("/metrics", async () => {
        return new Response(await register.metrics(), {
            headers: {
                "Content-Type": register.contentType
            }
        });
    })
    .get("/", () => "Hello Elysia")
    .get("/hello", "Do you miss me?")
    .use(protectedRouter)
    .listen(PORT);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
