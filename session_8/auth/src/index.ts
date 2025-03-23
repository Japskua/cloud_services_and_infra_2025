// auth/src/index.ts

import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { register } from "./metrics";
import { signupRouter } from "./routes/signupRouter";
import { loginRouter } from "./routes/loginRouter";
import { protectedRouter } from "./routes/protectedRouter";

const PORT = process.env.PORT || 3001;

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
    .get("/", () => "Hello from auth!")
    .use(signupRouter)
    .use(loginRouter)
    .use(protectedRouter)
    .listen(PORT);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
