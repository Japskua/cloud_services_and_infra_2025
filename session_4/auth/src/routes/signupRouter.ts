// auth/src/routes/signUpRoute.ts

import Elysia, { t } from "elysia";
import { UserDTO, userModel } from "../models/userModel";
import { jwtConfig } from "../config/jwt.config";

export const signupRouter = new Elysia().use(jwtConfig).post(
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
        body: userModel
    }
);
