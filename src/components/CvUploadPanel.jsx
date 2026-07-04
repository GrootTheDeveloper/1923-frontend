import { EmptyLine } from "./cvmatchPrimitives";

export default function CvUploadPanel({
  checkedCvIds,
  cvs,
  onDeleteCv,
  onDeleteSelectedCvs,
  onOpenCvModal,
  onUploadCv,
  selectedCvId,
  setCheckedCvIds,
  working,
}) {
  return (
    <div className="workflow-card">
      <div className="card-header">
        <h3>2. Hồ sơ ứng viên (CVs)</h3>
      </div>
      <div className="stack">
        <label className="file-drop">
          <input type="file" accept="application/pdf" multiple onChange={onUploadCv} />
          <strong>{working === "cv-upload" ? "Đang trích xuất..." : "Tải lên CV (PDF)"}</strong>
          <span>Hệ thống dùng PyMuPDF đọc text và Gemini phân tích dữ liệu CV</span>
        </label>
        <div className="cv-list">
          {cvs.length > 0 && (
            <div className="cv-list-header">
              <label className="select-all-label">
                <input
                  type="checkbox"
                  checked={cvs.length > 0 && checkedCvIds.length === cvs.length}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setCheckedCvIds(cvs.map((cv) => cv.id));
                    } else {
                      setCheckedCvIds([]);
                    }
                  }}
                />
                <span>Chọn tất cả ({checkedCvIds.length}/{cvs.length})</span>
              </label>
              {checkedCvIds.length > 0 && (
                <button
                  type="button"
                  className="delete-selected-btn"
                  onClick={onDeleteSelectedCvs}
                  disabled={working === "cv-delete-multiple"}
                >
                  {working === "cv-delete-multiple" ? "Đang xóa..." : "Xóa đã chọn"}
                </button>
              )}
            </div>
          )}
          {cvs.length === 0 ? (
            <EmptyLine text="Chưa có CV nào được tải lên." />
          ) : (
            cvs.map((cv) => (
              <div
                key={cv.id}
                className={`list-item-wrapper ${cv.id === selectedCvId ? "active" : ""}`}
              >
                <div className="cv-checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={checkedCvIds.includes(cv.id)}
                    onChange={() => {
                      setCheckedCvIds((previous) =>
                        previous.includes(cv.id)
                          ? previous.filter((id) => id !== cv.id)
                          : [...previous, cv.id]
                      );
                    }}
                    className="cv-item-checkbox"
                    aria-label="Chọn CV"
                  />
                </div>
                <div className="cv-name-display">
                  <strong>{cv.extracted_data?.candidate_name || "Ứng viên chưa rõ tên"}</strong>
                </div>
                <button
                  type="button"
                  className="cv-detail-trigger-btn"
                  onClick={() => onOpenCvModal(cv)}
                >
                  Chi tiết
                </button>
                <button
                  type="button"
                  className="cv-delete-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteCv(cv.id);
                  }}
                  title="Xóa CV"
                  disabled={working === "cv-delete"}
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}