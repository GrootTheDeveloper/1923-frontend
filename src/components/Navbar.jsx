import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getMe } from "../api/authService";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        });
    } else {
      setUser(null);
    }
  }, [token, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          <span>⚡</span> Project1923
        </Link>
        <div className="navbar-links">
          {token && user ? (
            <>
              <Link
                to="/"
                className={`navbar-link ${
                  location.pathname === "/" ? "active" : ""
                }`}
              >
                Dashboard
              </Link>
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Hi, <strong style={{ color: "var(--text-bright)" }}>{user.username}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {location.pathname !== "/login" && (
                <Link to="/login" className="btn btn-secondary">
                  Sign In
                </Link>
              )}
              {location.pathname !== "/register" && (
                <Link to="/register" className="btn btn-primary">
                  Sign Up
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
