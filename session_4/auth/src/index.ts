// auth/src/index.ts

import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { jwtConfig } from "./jwt";
import { UserDTO } from "./user.dto";

const app = new Elysia()
    .use(jwtConfig)
    // ℹ️ Designed to append new value to context directly before validation
    .derive(async ({ headers, jwt_auth }) => {
        // 1. Extract the 'Authorization' header from the incoming request
        const auth = headers["authorization"];

        // 2. Check if the 'Authorization' header contains a Bearer token
        //    If it starts with 'Bearer ', extract the token string after 'Bearer '
        //    Otherwise, set token to null indicating no valid token is present
        const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;

        // 3. If no token is found, return an object with user set to null
        if (!token) return { user: null };

        // 4. Verify the JWT token using the jwt_auth module
        //    This step authenticates the token and retrieves the user information
        const user = await jwt_auth.verify(token);

        // 5. Return an object containing the authenticated user information
        //    This will be available inside de request object
        return { user };
    })
    .use(swagger())
    .use(cors())
    .get("/", () => "Hello from auth!")
    .post(
        "/signup",
        async ({ body, error, jwt_auth }) => {
            // 1. Ensure the user does not exist yet.
            const foundUser = UserDTO.findUserByEmail(body.email);

            // 2. If the user already exists, return an error.
            if (foundUser) return error(400, "User already exists");

            // 3. Otherwise, create a new user.
            const newUser = await UserDTO.createUser({
                email: body.email,
                password: body.password
            });

            // 4. If there's an error creating the user, handle it.
            if (!newUser) return error(400, "Problems creating user");

            // 5. Tokenize the results with JWT.
            const token = await jwt_auth.sign({ id: newUser.id });
            console.log("Token created!");
            console.log(token);

            if (!token) return error(400, "Problems creating token");

            // 6. Return the token.
            return { access_token: token };
        },
        {
            body: t.Object({
                email: t.String(),
                password: t.String()
            })
        }
    )
    .post(
        "/login",
        async ({ body, error, jwt_auth }) => {
            // 1. Ensure the user already exists.
            const foundUser = UserDTO.findUserByEmail(body.email);

            // 2. If not, return an error; otherwise, authenticate.
            if (!foundUser) return error(400, "User does not exist");

            // 3. Verify the password.
            const isPasswordCorrect = await UserDTO.verifyPassword(
                body.password,
                foundUser.password
            );

            // 4. If the password doesn't match, return an error.
            if (!isPasswordCorrect) error(400, "Password is incorrect");

            // 5. Tokenize the results with JWT and return the token.
            const token = await jwt_auth.sign({ id: foundUser.id });

            console.log("Token created!");
            console.log(token);

            if (!token) return error(400, "Problems creating token");

            // 6. Return the token.
            return { access_token: token };
        },
        {
            body: t.Object({
                email: t.String(),
                password: t.String()
            })
        }
    )
    .guard(
        {
            beforeHandle: ({ user, error }) => {
                // 1. Check if the user is authenticated
                //    If not, return a 401 error
                if (!user) return error(401, "Not Authorized");

                // 2. If the user is authenticated, return the user
                return { user };
            }
        },
        (app) =>
            app.get("/me", ({ user, error }) => {
                // 1. Check if the user object is present, indicating an authenticated user
                //    If the user is not authenticated (user is null or undefined), return a 401 error
                if (!user) return error(401, "Not Authorized");

                // 2. If the user is authenticated, return the user
                return { user };
            })
    )
    .listen(3001);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
