// auth/src/middleware/authorization.ts

export const authorizationMiddleware = async ({
    headers,
    jwt_auth
}: {
    headers: any;
    jwt_auth: any;
}) => {
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
};
