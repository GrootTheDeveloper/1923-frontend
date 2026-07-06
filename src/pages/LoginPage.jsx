import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { claimGuestSession, login } from "../api/authService";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({ email, password });
      localStorage.setItem("token", res.data.access_token);
      try { await claimGuestSession(); } catch { /* migration is best-effort */ }
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.detail || "Đăng nhập thất bại. Vui lòng kiểm tra lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page" data-ai-id="login-page">
      <Link to="/" className="auth-brand">TalentScan</Link>
      <section className="auth-card">
        <p className="landing-kicker">Tiếp tục phân tích CV</p>
        <h1>Đăng nhập</h1>
        <p>Lưu lịch sử scan, quản lý JD và theo dõi các báo cáo tuyển dụng cũ.</p>

        {error && <div className="auth-alert error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email<input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Mật khẩu<input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button type="submit" className="landing-cta full" disabled={loading}>{loading ? "Đang xử lý..." : "Đăng nhập"}</button>
        </form>

        <p className="auth-switch">Chưa có tài khoản? <Link to="/register">Đăng ký miễn phí</Link></p>
      </section>
    </main>
  );
}