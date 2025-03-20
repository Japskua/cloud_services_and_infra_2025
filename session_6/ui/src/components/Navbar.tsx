// ui/src/components/Navbar.tsx

import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
    const { isAuthenticated, logout } = useAuth();
    const location = useLocation();

    // Check if the current route is active
    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <Link to="/">Book Collection</Link>
            </div>

            <div className="navbar-links">
                {isAuthenticated ? (
                    <>
                        <Link
                            to="/"
                            className={`nav-link ${
                                isActive("/") ? "active-link" : ""
                            }`}
                        >
                            Home
                        </Link>
                        <button
                            onClick={logout}
                            className="nav-link logout-button"
                        >
                            Sign Out
                        </button>
                    </>
                ) : (
                    <>
                        <Link
                            to="/login"
                            className={`nav-link ${
                                isActive("/login") ? "active-link" : ""
                            }`}
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/signup"
                            className={`nav-link ${
                                isActive("/signup") ? "active-link" : ""
                            }`}
                        >
                            Sign Up
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
