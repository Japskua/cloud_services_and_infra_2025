// auth/src/user.ts
const users: User[] = []; // Mock User DB

/**
 * User Data Transfer Object
 */
export const UserDTO = {
    findUserByEmail: (email: string) => {
        return users.find((user) => user.email === email);
    },
    createUser: async (user: UserWithoutId) => {
        const newUser: User = {
            ...user,
            id: users.length + 1,
            password: await Bun.password.hash(user.password)
        };

        users.push(newUser);

        return newUser;
    },
    verifyPassword: async (password: string, hash: string) => {
        return await Bun.password.verify(password, hash);
    }
};

type User = {
    id: number;
    email: string;
    password: string;
};

type UserWithoutId = Omit<User, "id"> & {
    password: string;
};
