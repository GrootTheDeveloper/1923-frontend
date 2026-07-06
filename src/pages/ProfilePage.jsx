import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../api/authService";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login", { replace: true });
      return;
    }
    getMe()
      .then((res) => setUser(res.data))
      .catch((err) => setError(err?.response?.data?.detail || err?.message || "Không tải được hồ sơ."))
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <main className="auth-page" data-ai-id="profile-page">
      <Link to="/" className="auth-brand">TalentScan</Link>
      <section className="auth-card">
        <p className="landing-kicker">Tài khoản</p>
        <h1>Hồ sơ của bạn</h1>

        {loading && <p>Đang tải...</p>}
        {error && <div className="auth-alert error">{error}</div>}
        {user && (
          <>
            <dl style={{ display: "grid", gap: "0.5rem", margin: "1rem 0" }}>
              <div><strong>Tên tài khoản:</strong> {user.username}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>ID:</strong> <code style={{ fontSize: "0.85em" }}>{user.id}</code></div>
            </dl>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link to="/app" className="landing-cta">Quay lại quét CV</Link>
              <Link to="/workspace" className="landing-cta secondary">Vào workspace</Link>
              <button type="button" className="landing-cta secondary" onClick={logout}>Đăng xuất</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
