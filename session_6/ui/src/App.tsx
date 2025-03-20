// ui/src/App.tsx

import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate
} from "react-router-dom";
import { useEffect } from "react";
import axios from "axios";
import "./App.css";
import "./components/Auth.css";

// Import components
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import Books from "./components/Books";

function App() {
    // Set up axios interceptor to handle token expiration
    useEffect(() => {
        // Add request interceptor to add token to all requests
        axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem("access_token");
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Add response interceptor to handle unauthorized errors
        axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    // If unauthorized, clear token and redirect to login
                    localStorage.removeItem("access_token");
                    window.location.href = "/login";
                }
                return Promise.reject(error);
            }
        );
    }, []);

    return (
        <Router>
            <AuthProvider>
                <Navbar />
                <Routes>
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Books />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
