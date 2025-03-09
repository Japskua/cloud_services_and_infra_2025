// ui/src/components/Login.tsx

import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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

            // Send login request to the auth server
            const response = await axios.post("https://auth.localhost/login", {
                email,
                password
            });

            // Extract the access token from the response
            const { access_token } = response.data;

            // Store the token in localStorage
            localStorage.setItem("access_token", access_token);

            // Set the default Authorization header for all future axios requests
            axios.defaults.headers.common[
                "Authorization"
            ] = `Bearer ${access_token}`;

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
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
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
                    {loading ? "Logging In..." : "Log In"}
                </button>
            </form>

            <div className="auth-link">
                Don't have an account?{" "}
                <a href="#" onClick={() => navigate("/signup")}>
                    Sign Up
                </a>
            </div>
        </div>
    );
};

export default Login;
