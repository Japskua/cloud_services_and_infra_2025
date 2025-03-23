// backend/src/routes/protectedRouter.ts

import Elysia from "elysia";
import { jwtConfig } from "../config/jwtConfig";
import { authorizationMiddleware } from "../middleware/authorization";
import { getBooks } from "../database";
import { httpRequestDuration } from "../metrics";

export const protectedRouter = new Elysia()
    .use(jwtConfig)
    .derive(authorizationMiddleware)
    .guard(
        {
            beforeHandle: ({ user, error }) => {
                // 1. Check if the user is authenticated
                //    If not, return a 401 error
                console.log("user", user);
                if (!user) return error(401, "Not Authorized");
            }
        },
        (app) =>
            app
                .get("/me", ({ user, error }) => {
                    // 1. Check if the user object is present, indicating an authenticated user
                    //    If the user is not authenticated (user is null or undefined), return a 401 error
                    if (!user) return error(401, "Not Authorized");

                    // 2. If the user is authenticated, return the user
                    return { user };
                })
                .get("/books", async () => {
                    const startTime = Date.now();
                    console.log("trying to get books! Checking for the user!");
                    const books = await getBooks();
                    const duration = Date.now() - startTime;
                    // Log the duration of the request
                    httpRequestDuration
                        .labels({
                            method: "GET",
                            route: "/books",
                            code: "200"
                        })
                        .observe(duration);
                    return JSON.stringify(books);
                })
    );
