import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/authService";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await register({ username, email, password });
      setSuccess("Đăng ký thành công. Đang chuyển sang đăng nhập...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page" data-ai-id="register-page">
      <Link to="/" className="auth-brand">TalentScan</Link>
      <section className="auth-card">
        <p className="landing-kicker">Tạo tài khoản TalentScan</p>
        <h1>Đăng ký miễn phí</h1>
        <p>Lưu phiên phân tích, quản lý nhiều JD và xuất báo cáo tuyển dụng khi cần.</p>

        {error && <div className="auth-alert error">{error}</div>}
        {success && <div className="auth-alert success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <label>Tên tài khoản<input type="text" placeholder="an_khang" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
          <label>Email<input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Mật khẩu<input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button type="submit" className="landing-cta full" disabled={loading}>{loading ? "Đang xử lý..." : "Tạo tài khoản"}</button>
        </form>

        <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
      </section>
    </main>
  );
}