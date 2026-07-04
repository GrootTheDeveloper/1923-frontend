import { priorityMap, requirementPriorities, requirementTypes, typeMap } from "../constants/cvmatch";

export default function RequirementEditor({
  onAddRequirement,
  onRemoveRequirement,
  onRequirementChange,
  onSaveRequirements,
  requirementsDraft,
  selectedJob,
  working,
}) {
  return (
    <div className="workflow-card">
      <section className="panel job-config no-shadow-border">
        <div className="panel-header compact-header">
          <span className="panel-title">Cấu hình yêu cầu JD: {selectedJob.title}</span>
          <div className="header-actions">
            <button className="icon-button" type="button" onClick={onAddRequirement} title="Thêm yêu cầu">
              + Thêm yêu cầu
            </button>
          </div>
        </div>
        <div className="panel-body compact-body">
          <div className="table-responsive">
            <table className="delta-table requirements-table">
              <thead>
                <tr>
                  <th>Tên yêu cầu</th>
                  <th>Loại</th>
                  <th>Ưu tiên</th>
                  <th>Trọng số</th>
                  <th>Knockout</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requirementsDraft.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="muted-cell">Chưa trích xuất được yêu cầu nào.</td>
                  </tr>
                ) : (
                  requirementsDraft.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td>
                        <input
                          value={item.name}
                          onChange={(event) => onRequirementChange(index, "name", event.target.value)}
                          placeholder="Ví dụ: React"
                        />
                      </td>
                      <td>
                        <select value={item.type} onChange={(event) => onRequirementChange(index, "type", event.target.value)}>
                          {requirementTypes.map((type) => (
                            <option key={type} value={type}>{typeMap[type] || type}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select value={item.priority} onChange={(event) => onRequirementChange(index, "priority", event.target.value)}>
                          {requirementPriorities.map((priority) => (
                            <option key={priority} value={priority}>{priorityMap[priority] || priority}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={item.weight}
                          onChange={(event) => onRequirementChange(index, "weight", event.target.value)}
                        />
                      </td>
                      <td className="center-cell">
                        <input
                          type="checkbox"
                          checked={Boolean(item.is_knockout)}
                          onChange={(event) => onRequirementChange(index, "is_knockout", event.target.checked)}
                        />
                      </td>
                      <td className="right-cell">
                        <button className="icon-button danger" type="button" onClick={() => onRemoveRequirement(index)} title="Xóa">
                          x
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="config-actions">
            <span className="helper-text">Hãy kiểm tra các trọng số (1-20) và đánh dấu Knockout trước khi đối chiếu.</span>
            <button className="primary-button" type="button" onClick={onSaveRequirements} disabled={working === "job-skills"}>
              {working === "job-skills" ? "Đang lưu..." : "Lưu cấu hình yêu cầu"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}