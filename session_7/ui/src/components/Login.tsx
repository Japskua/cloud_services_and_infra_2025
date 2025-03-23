// ui/src/components/Login.tsx

import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getServiceUrl } from "../helpers/urlHelper";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!email || !password) {
            setError("Email and password are required");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const authAddress = getServiceUrl("auth");

            // Send login request to the auth server
            const response = await axios.post(`${authAddress}/login`, {
                email,
                password
            });

            // Extract the access token from the response
            const { access_token } = response.data;

            // Update authentication state using the context
            login(access_token);

            // Redirect to the home page or dashboard
            navigate("/");
        } catch (err) {
            console.error("Login error:", err);
            setError(
                axios.isAxiosError(err) && err.response?.data?.message
                    ? err.response.data.message
                    : "Failed to log in. Please check your credentials and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2 className="auth-title">Log In to Your Account</h2>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                        autoFocus
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="auth-button"
                    disabled={loading}
                >
                    {loading ? "Signing In..." : "Sign In"}
                </button>
            </form>

            <div className="auth-link">
                Don't have an account?
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        navigate("/signup");
                    }}
                >
                    Sign Up
                </a>
            </div>
        </div>
    );
};

export default Login;
