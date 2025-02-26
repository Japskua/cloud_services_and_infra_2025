// auth/src/jwt.ts

import { jwt } from "@elysiajs/jwt";

export const jwtConfig = jwt({
    name: "jwt_auth", // this name will be used to access jwt within the request object
    secret: "Super Safe Secret That Should Be In .ENV" // Should be in a .env!!
});
