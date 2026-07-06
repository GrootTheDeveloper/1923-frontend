import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../api/authService";

export default function AuthMenu() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) { setUser(null); return; }
    let cancelled = false;
    getMe()
      .then((res) => { if (!cancelled) setUser(res.data); })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem("token");
        setUser(null);
      });
    return () => { cancelled = true; };
  }, [token]);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  if (token && user) {
    return (
      <>
        <Link className="topbar-link" to="/profile" title="Tài khoản">{user.username}</Link>
        <button className="topbar-register" type="button" onClick={logout}>Đăng xuất</button>
      </>
    );
  }

  return (
    <>
      <Link className="topbar-link" to="/login">Đăng nhập</Link>
      <Link className="topbar-register" to="/register">Đăng ký</Link>
    </>
  );
}
