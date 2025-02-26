import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { jwtConfig } from "./jwt";

const body = t.Object({
    email: t.String(),
    password: t.String()
});

const app = new Elysia()
    .use(jwtConfig)
    .use(swagger())
    .use(cors())
    .get("/", () => "Hello from auth!")
    .post("/signup", (request) => {
        request.jwt_auth.sign({
            username: "test"
        });
    })
    .post("/login", (request) => {
        request.jwt_auth.sign({
            username: "test"
        });
    })
    .listen(3001);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
