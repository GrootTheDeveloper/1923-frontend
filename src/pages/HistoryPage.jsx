import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listMatchJobs } from "../api/cvmatchService";
import AuthMenu from "../components/AuthMenu.jsx";
import BrandLogo from "../components/BrandLogo.jsx";

const STATUS_LABEL = {
  completed: "Hoàn tất",
  failed: "Thất bại",
  running: "Đang chạy",
  queued: "Trong hàng đợi",
};

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMatchJobs()
      .then(setItems)
      .catch((err) => setError(err?.response?.data?.detail || err?.message || "Không tải được lịch sử."))
      .finally(() => setLoading(false));
  }, []);

  const openMatchJob = (item) => {
    if (item.status !== "completed" || !item.job_id) return;
    navigate(`/workspace?jobId=${item.job_id}`);
  };

  return (
    <div className="checker-flow setup-mode">
      <header className="checker-topbar">
        <Link className="brand-mark" to="/" title="Về trang chủ">
          <BrandLogo subtitle="Lịch sử phiên quét" />
        </Link>
        <nav className="checker-actions">
          <Link className="topbar-link" to="/app">Quét CV mới</Link>
          <Link className="topbar-link" to="/workspace">Workspace</Link>
          <AuthMenu />
        </nav>
      </header>

      <main className="scan-stage">
        <section className="scan-composer" style={{ display: "block" }}>
          <div className="scan-copy">
            <p className="eyebrow">Lịch sử</p>
            <h1>Các phiên phân tích gần đây</h1>
            <p>Bấm vào một phiên đã hoàn tất để mở lại báo cáo trong workspace.</p>

            {loading && <p>Đang tải...</p>}
            {error && <div className="notice error" role="alert">{error}</div>}
            {!loading && !error && items.length === 0 && (
              <div className="notice info" role="status">
                Bạn chưa có phiên phân tích nào. <Link to="/app">Bắt đầu quét CV</Link>.
              </div>
            )}

            {items.length > 0 && (
              <div className="history-list">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`history-row ${item.status === "completed" ? "clickable" : ""}`}
                    onClick={() => openMatchJob(item)}
                    disabled={item.status !== "completed"}
                    title={item.status === "completed" ? "Mở báo cáo" : "Chưa mở được"}
                  >
                    <div className="history-row-main">
                      <strong>{item.job_title || "JD không rõ"}</strong>
                      <small>{item.job_company || ""}</small>
                    </div>
                    <div className="history-row-meta">
                      <span className={`history-status status-${item.status}`}>
                        {STATUS_LABEL[item.status] || item.status}
                      </span>
                      <small>{item.result_count} ứng viên</small>
                      <small>{formatDate(item.created_at)}</small>
                    </div>
                    {item.error && <div className="history-row-error">{item.error}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
