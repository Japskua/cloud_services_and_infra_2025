// ui/src/contexts/AuthContext.tsx

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode
} from "react";
import axios from "axios";

interface AuthContextType {
    isAuthenticated: boolean;
    loading: boolean;
    login: (token: string) => void;
    signup: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if there's a token in localStorage on initial load
        const token = localStorage.getItem("access_token");

        if (token) {
            // Set the token as the default Authorization header
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            setIsAuthenticated(true);
        }

        setLoading(false);
    }, []);

    const login = (token: string) => {
        // Store the token in localStorage
        localStorage.setItem("access_token", token);

        // Set the token as the default Authorization header
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        setIsAuthenticated(true);
    };

    const signup = (token: string) => {
        // Use the same implementation as login
        login(token);
    };

    const logout = () => {
        // Remove the token from localStorage
        localStorage.removeItem("access_token");

        // Remove the Authorization header
        delete axios.defaults.headers.common["Authorization"];

        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider
            value={{ isAuthenticated, loading, login, signup, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
};
