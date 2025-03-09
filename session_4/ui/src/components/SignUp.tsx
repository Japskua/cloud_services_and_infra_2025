// ui/src/components/SignUp.tsx

import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SignUp = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
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

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Send signup request to the auth server
            const response = await axios.post("https://auth.localhost/signup", {
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
            console.error("Signup error:", err);
            setError(
                axios.isAxiosError(err) && err.response?.data?.message
                    ? err.response.data.message
                    : "Failed to sign up. Please try again later."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2 className="auth-title">Create Your Account</h2>

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
                        placeholder="Create a password (min. 8 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        minLength={8}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="auth-button"
                    disabled={loading}
                >
                    {loading ? "Creating Account..." : "Create Account"}
                </button>
            </form>

            <div className="auth-link">
                Already have an account?
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        navigate("/login");
                    }}
                >
                    Sign In
                </a>
            </div>
        </div>
    );
};

export default SignUp;
