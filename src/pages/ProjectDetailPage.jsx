import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getProject } from "../api/projectService";
import { getTasks, createTask, updateTask, deleteTask } from "../api/taskService";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Form Task states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [taskError, setTaskError] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        getProject(id),
        getTasks(id)
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu dự án:", err);
      alert("Không tìm thấy dự án hoặc bạn không có quyền truy cập.");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setTaskError("");
    setTaskLoading(true);
    try {
      const res = await createTask({
        title,
        description,
        project_id: id,
        status
      });
      setTasks((prev) => [...prev, res.data]);
      setShowTaskModal(false);
      setTitle("");
      setDescription("");
      setStatus("todo");
    } catch (err) {
      setTaskError(err.response?.data?.detail || "Không thể tạo công việc. Vui lòng thử lại.");
    } finally {
      setTaskLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const res = await updateTask(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
    } catch (err) {
      alert("Không thể cập nhật trạng thái: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa công việc này?")) return;
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert("Xóa công việc thất bại: " + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "5rem 0" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>Đang tải thông tin dự án...</div>
      </div>
    );
  }

  // Group tasks by status
  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="container" style={{ animation: "fadeIn 0.5s ease" }}>
      {/* Back button */}
      <Link to="/" style={{ color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        <span>←</span> Quay lại danh sách dự án
      </Link>

      {/* Project Details Header */}
      {project && (
        <div className="glass-card" style={{ marginBottom: "2.5rem", background: "linear-gradient(135deg, rgba(22, 29, 49, 0.8) 0%, rgba(15, 20, 36, 0.8) 100%)" }}>
          <div className="flex-between">
            <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, color: "var(--text-bright)" }}>
              {project.name}
            </h1>
            <button onClick={() => setShowTaskModal(true)} className="btn btn-primary">
              <span>+</span> Thêm Công Việc
            </button>
          </div>
          <p style={{ color: "var(--text-muted)", marginTop: "0.75rem", marginBottom: 0, fontSize: "1rem", lineHeight: "1.5" }}>
            {project.description || "Không có mô tả cho dự án này."}
          </p>
        </div>
      )}

      {/* Task Board Columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
        
        {/* Column TODO */}
        <div className="glass-card" style={{ background: "rgba(10, 15, 30, 0.4)", minHeight: "500px", padding: "1.25rem" }}>
          <div className="flex-between" style={{ marginBottom: "1.25rem", borderBottom: "1px solid rgba(245,158,11,0.2)", paddingBottom: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--warning)" }}>
              <span>📝</span> Cần làm
            </h3>
            <span className="badge badge-todo">{todoTasks.length}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {todoTasks.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>Chưa có công việc nào</p>
            ) : (
              todoTasks.map((t) => (
                <TaskItem key={t.id} task={t} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteTask} />
              ))
            )}
          </div>
        </div>

        {/* Column IN PROGRESS */}
        <div className="glass-card" style={{ background: "rgba(10, 15, 30, 0.4)", minHeight: "500px", padding: "1.25rem" }}>
          <div className="flex-between" style={{ marginBottom: "1.25rem", borderBottom: "1px solid rgba(99,102,241,0.2)", paddingBottom: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
              <span>⏳</span> Đang thực hiện
            </h3>
            <span className="badge badge-in-progress">{inProgressTasks.length}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {inProgressTasks.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>Chưa có công việc nào</p>
            ) : (
              inProgressTasks.map((t) => (
                <TaskItem key={t.id} task={t} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteTask} />
              ))
            )}
          </div>
        </div>

        {/* Column DONE */}
        <div className="glass-card" style={{ background: "rgba(10, 15, 30, 0.4)", minHeight: "500px", padding: "1.25rem" }}>
          <div className="flex-between" style={{ marginBottom: "1.25rem", borderBottom: "1px solid rgba(16,185,129,0.2)", paddingBottom: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--success)" }}>
              <span>✅</span> Hoàn thành
            </h3>
            <span className="badge badge-done">{doneTasks.length}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {doneTasks.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>Chưa có công việc nào</p>
            ) : (
              doneTasks.map((t) => (
                <TaskItem key={t.id} task={t} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteTask} />
              ))
            )}
          </div>
        </div>

      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: "1.4rem", margin: "0 0 1.5rem 0" }}>Thêm Công Việc Mới</h3>
            
            {taskError && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "var(--danger)",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                marginBottom: "1rem"
              }}>
                {taskError}
              </div>
            )}

            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Tiêu đề</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Thiết kế giao diện"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả công việc</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: "80px", resize: "vertical" }}
                  placeholder="Mô tả chi tiết công việc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "2rem" }}>
                <label className="form-label">Trạng thái ban đầu</label>
                <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="todo">Cần làm</option>
                  <option value="in_progress">Đang thực hiện</option>
                  <option value="done">Hoàn thành</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" onClick={() => { setShowTaskModal(false); setTaskError(""); }} className="btn btn-secondary">
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={taskLoading}>
                  {taskLoading ? "Đang tạo..." : "Thêm công việc"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent TaskItem
function TaskItem({ task, onUpdateStatus, onDelete }) {
  return (
    <div className="glass-card" style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "0.75rem", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div>
        <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem", color: "var(--text-bright)", fontWeight: 600 }}>{task.title}</h4>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.4" }}>{task.description || "Không có mô tả."}</p>
      </div>

      <div className="flex-between" style={{ borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
        {/* Actions Dropdown */}
        <select
          value={task.status}
          onChange={(e) => onUpdateStatus(task.id, e.target.value)}
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            color: "var(--text-muted)",
            fontSize: "0.75rem",
            padding: "0.25rem 0.5rem",
            cursor: "pointer"
          }}
        >
          <option value="todo">Cần làm</option>
          <option value="in_progress">Đang làm</option>
          <option value="done">Xong</option>
        </select>

        {/* Delete action */}
        <button
          onClick={() => onDelete(task.id)}
          style={{
            background: "none",
            border: "none",
            color: "var(--danger)",
            fontSize: "0.75rem",
            cursor: "pointer",
            padding: 0
          }}
        >
          Xóa
        </button>
      </div>
    </div>
  );
}
