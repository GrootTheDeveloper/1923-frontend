export default function JobInputPanel({ jobs, selectedJobId, jobForm, setJobForm, onCreateJob, onSelectJob, working }) {
  return (
    <div className="workflow-card">
      <div className="card-header">
        <h3>1. Job Description (JD)</h3>
        {jobs.length > 0 && (
          <div className="jd-selector-wrapper">
            <select
              value={selectedJobId}
              onChange={(event) => {
                const job = jobs.find((item) => item.id === event.target.value);
                if (job) onSelectJob(job);
              }}
              className="jd-select-dropdown"
            >
              <option value="" disabled>-- Chọn JD đã lưu --</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.company || "No Company"})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <form className="stack" onSubmit={onCreateJob}>
        <textarea
          value={jobForm.raw_text}
          onChange={(event) => setJobForm({ ...jobForm, raw_text: event.target.value })}
          placeholder="Dán nội dung JD nguyên bản vào đây. Gemini sẽ tự phân tích và trích xuất thông tin (Tiêu đề, Công ty, Cấp bậc, Yêu cầu)..."
          rows={8}
          required
        />
        <button className="btn primary full" type="submit" disabled={working === "job"}>
          {working === "job" ? "Đang phân tích..." : "Phân tích JD bằng Gemini"}
        </button>
      </form>
    </div>
  );
}