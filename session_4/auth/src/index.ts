import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { jwtConfig } from "./jwt";
import { UserDTO } from "./user.dto";

const app = new Elysia()
    .use(jwtConfig)
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
    .listen(3001);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
