import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects, createProject, deleteProject } from "../api/projectService";

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data);
    } catch (err) {
      console.error("Lỗi lấy danh sách project:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError("");
    setCreateLoading(true);
    try {
      const res = await createProject({ name, description });
      setProjects((prev) => [res.data, ...prev]);
      setShowModal(false);
      setName("");
      setDescription("");
    } catch (err) {
      setError(err.response?.data?.detail || "Không thể tạo dự án. Vui lòng thử lại.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteProject = async (id, e) => {
    e.preventDefault(); // Ngăn redirect khi bấm xóa
    if (!window.confirm("Bạn có chắc chắn muốn xóa dự án này? Toàn bộ công việc liên quan sẽ bị ảnh hưởng.")) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("Xóa dự án thất bại: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="container" style={{ animation: "fadeIn 0.5s ease" }}>
      <div className="flex-between" style={{ marginBottom: "2.5rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #fff 0%, #a5b4fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Dự Án Của Tôi
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0 0", fontSize: "0.95rem" }}>
            Theo dõi, quản lý và tổ chức các dự án cá nhân
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <span>+</span> Tạo Dự Án Mới
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <div style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>Đang tải danh sách dự án...</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: "4rem 2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📁</div>
          <h3>Chưa có dự án nào</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "400px", margin: "0.5rem auto 1.5rem auto" }}>
            Dự án giúp bạn phân loại và quản lý các công việc một cách khoa học hơn. Hãy bắt đầu bằng cách tạo một dự án.
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            Tạo dự án ngay
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {projects.map((project) => (
            <Link to={`/projects/${project.id}`} key={project.id} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", minHeight: "180px" }}>
                <div>
                  <h3 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem 0", fontWeight: 700, color: "var(--text-bright)" }}>
                    {project.name}
                  </h3>
                  <p style={{
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    margin: 0,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    lineHeight: "1.4"
                  }}>
                    {project.description || "Không có mô tả dự án."}
                  </p>
                </div>
                <div className="flex-between" style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Tạo ngày: {new Date(project.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="btn btn-secondary"
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.8rem",
                      color: "var(--danger)",
                      borderColor: "rgba(239, 68, 68, 0.2)",
                      background: "rgba(239, 68, 68, 0.05)"
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal tạo dự án */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: "1.4rem", margin: "0 0 1.5rem 0" }}>Tạo Dự Án Mới</h3>
            
            {error && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "var(--danger)",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                marginBottom: "1rem"
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label">Tên dự án</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Lập trình Web"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "2rem" }}>
                <label className="form-label">Mô tả dự án</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: "100px", resize: "vertical" }}
                  placeholder="Nhập mô tả chi tiết..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" onClick={() => { setShowModal(false); setError(""); }} className="btn btn-secondary">
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? "Đang tạo..." : "Tạo dự án"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
