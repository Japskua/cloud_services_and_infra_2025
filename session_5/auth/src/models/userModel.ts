// auth/src/models/userModel.ts

import { t } from "elysia";

const users: User[] = []; // Mock User DB

const defaultPermissions = [
    "read:users",
    "create:users",
    "read:data",
    "create:data",
    "write:data",
    "delete:data"
];

/**
 * User Data Transfer Object
 */
export const UserDTO = {
    findUserByEmail: (email: string) => {
        return users.find((user) => user.email === email);
    },
    createUser: async (user: UserModelForSignup) => {
        const newUser: User = {
            ...user,
            id: users.length + 1,
            password: await Bun.password.hash(user.password),
            permissions: defaultPermissions
        };

        users.push(newUser);

        return newUser;
    },
    verifyPassword: async (password: string, hash: string) => {
        return await Bun.password.verify(password, hash);
    }
};

export const userModelForSignup = t.Object({
    email: t.String(),
    password: t.String()
});

export type UserModelForSignup = typeof userModelForSignup.static;

export type User = typeof userModel.static;

export const userModel = t.Object({
    id: t.Number(),
    email: t.String(),
    password: t.String(),
    permissions: t.Array(t.String())
});
