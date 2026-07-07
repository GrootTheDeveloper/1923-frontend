import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createJob,
  deleteCv,
  extractDocument,
  getCvs,
  getJobs,
  getMatchJob,
  startMatchJob,
  uploadCv,
} from "./api/cvmatchService";
import { getTurnstileToken } from "./utils/turnstile";
import AuthMenu from "./components/AuthMenu.jsx";
import BrandLogo from "./components/BrandLogo.jsx";

const t = {
  home: "Về trang chủ",
  checker: "AI CV Checker",
  history: "Lịch sử",
  title: "Đánh giá CV theo đúng vị trí tuyển dụng",
  intro: "Tải hồ sơ ứng viên và thêm mô tả công việc. TalentScan sẽ chấm mức độ phù hợp, chỉ ra bằng chứng và gợi ý câu hỏi phỏng vấn.",
  upload: "Tải lên CV",
  uploadHelp: "PDF, tối đa 5 MB mỗi tệp",
  choose: "Chọn hoặc kéo CV vào đây",
  multi: "Có thể tải nhiều ứng viên trong một lần quét",
  reading: "Đang đọc hồ sơ...",
  remove: "Xóa CV",
  jd: "Thêm mô tả công việc",
  jdHelp: "JD càng rõ, kết quả càng sát",
  saved: "Dùng JD đã lưu",
  chooseJd: "Chọn một JD",
  tabPaste: "Dán JD",
  tabUpload: "Tải JD (PDF)",
  orPaste: "Hoặc dán JD mới",
  placeholder: "Dán mô tả vị trí, yêu cầu kỹ năng và kinh nghiệm tại đây...",
  jdUploadHint: "Tải JD dạng PDF - hệ thống sẽ đọc và dùng nội dung để chấm CV.",
  jdReading: "Đang đọc JD từ PDF...",
  jdChoose: "Chọn hoặc kéo file JD vào đây",
  jdLoaded: "Đã đọc JD từ PDF. Bạn có thể chỉnh sửa trước khi quét.",
  start: "Bắt đầu quét CV",
  preparing: "Đang chuẩn bị JD...",
  report: "Báo cáo ứng viên",
  fit: "Mức độ phù hợp",
  strengths: "6 điểm mạnh - 3 điểm cần xác minh",
  good1: "Kinh nghiệm backend phù hợp",
  good2: "Có bằng chứng triển khai thực tế",
  warn: "Cần hỏi thêm về CI/CD",
  analyzing: "Đang phân tích hồ sơ...",
  analyzingText: "AI đang đọc JD, đối chiếu kỹ năng và tìm bằng chứng trong từng CV.",
  wait: "Quá trình này có thể mất 1-2 phút. Vui lòng giữ trang đang mở.",
  needCv: "Hãy tải lên ít nhất một CV PDF.",
  needJd: "Hãy dán mô tả công việc hoặc chọn một JD đã lưu.",
  failed: "Không thể hoàn tất phân tích. Vui lòng thử lại.",
};

const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

function Icon({ name, size = 20 }) {
  const paths = name === "upload" ? ["M12 16V4", "m7 9 5-5 5 5", "M5 20h14"]
    : name === "doc" ? ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"]
    : name === "close" ? ["M18 6 6 18", "M6 6l12 12"]
    : ["M12 3v18", "M3 12h18", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "M12 12l5-5"];
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d) => <path d={d} key={d} />)}
    </svg>
  );
}

export default function ScanFlow() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [cvs, setCvs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [jd, setJd] = useState("");
  const [jdMode, setJdMode] = useState("paste");
  const [jdNotice, setJdNotice] = useState("");
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [task, setTask] = useState(null);

  useEffect(() => {
    Promise.all([getJobs(), getCvs()])
      .then(([j, c]) => { setJobs(j); setCvs(c); setJobId(j[0]?.id || ""); })
      .catch(() => {});
  }, []);

  async function addCvs(event) {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;
    setWorking("upload");
    setError("");
    try {
      for (const file of files) {
        const token = await getTurnstileToken("upload_cv");
        await uploadCv(file, token);
      }
      setCvs(await getCvs());
    } catch (x) {
      setError(x?.response?.data?.detail || x?.message || t.failed);
    } finally {
      setWorking("");
    }
  }

  async function removeCv(cvId) {
    setError("");
    try {
      await deleteCv(cvId);
      setCvs(await getCvs());
    } catch (x) {
      setError(x?.response?.data?.detail || x?.message || t.failed);
    }
  }

  async function uploadJdFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setWorking("jd-upload");
    setError("");
    setJdNotice("");
    try {
      const token = await getTurnstileToken("upload_jd");
      const result = await extractDocument(file, token);
      const text = result?.full_text || "";
      if (!text.trim()) throw new Error("Không tìm thấy nội dung JD trong file PDF.");
      setJd(text);
      setJdNotice(t.jdLoaded);
    } catch (x) {
      setError(x?.response?.data?.detail || x?.message || t.failed);
    } finally {
      setWorking("");
    }
  }

  async function run() {
    if (!cvs.length) { setError(t.needCv); return; }
    let target = jobId;
    setError("");
    try {
      if (jd.trim()) {
        setWorking("job");
        const created = await createJob({ raw_text: jd });
        target = created.id;
        setJobId(target);
      }
      if (!target) { setError(t.needJd); setWorking(""); return; }
      setWorking("matching");
      let next = await startMatchJob(target, { top_k: 1000 });
      setTask(next);
      for (let i = 0; i < 70 && !["completed", "failed"].includes(next.status); i += 1) {
        await sleep(650);
        next = await getMatchJob(next.id);
        setTask(next);
      }
      if (next.status !== "completed") throw new Error(next.error || t.failed);
      navigate("/workspace", { replace: true });
    } catch (x) {
      setError(x?.response?.data?.detail || x?.message || t.failed);
      setWorking("");
    }
  }

  const progress = Math.max(8, Math.min(96, Number(task?.progress || 0) * 100 || 18));
  const ready = cvs.length > 0 && (jd.trim() || jobId);

  return (
    <div className="checker-flow setup-mode">
      <header className="checker-topbar">
        <Link className="brand-mark" to="/" title={t.home}>
          <BrandLogo subtitle={t.checker} />
        </Link>
        <nav className="checker-actions">
          <Link className="topbar-link" to="/workspace"><Icon name="doc" size={18} />{t.history}</Link>
          <AuthMenu />
        </nav>
      </header>

      <main className="scan-stage">
        {error && <div className="notice error" role="alert">{error}</div>}

        <section className="scan-composer">
          <div className="scan-copy">
            <p className="eyebrow">{t.checker}</p>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>

            <div className="scan-field">
              <header>
                <span>1</span>
                <div><h2>{t.upload}</h2><small>{t.uploadHelp}</small></div>
              </header>
              <label className={`scan-upload ${working === "upload" ? "is-working" : ""}`}>
                <input type="file" accept="application/pdf" multiple onChange={addCvs} />
                <Icon name="upload" size={28} />
                <strong>{working === "upload" ? t.reading : t.choose}</strong>
                {working === "upload" && <span className="scan-upload-loader" aria-hidden="true"><i /><i /><i /></span>}
                <span>{t.multi}</span>
              </label>
              {cvs.length > 0 && (
                <div className="scan-files">
                  {cvs.slice(0, 6).map((cv) => (
                    <div className="scan-file-static" key={cv.id}>
                      <b>PDF</b>
                      <span>
                        <strong>{cv.extracted_data?.candidate_name || cv.filename}</strong>
                        <small>{cv.filename}</small>
                      </span>
                      <button
                        type="button"
                        className="scan-file-remove"
                        aria-label={t.remove}
                        title={t.remove}
                        onClick={() => removeCv(cv.id)}
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="scan-field">
              <header>
                <span>2</span>
                <div><h2>{t.jd}</h2><small>{t.jdHelp}</small></div>
              </header>

              {jobs.length > 0 && (
                <label className="saved-job-select">
                  {t.saved}
                  <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                    <option value="">{t.chooseJd}</option>
                    {jobs.map((j) => <option value={j.id} key={j.id}>{j.title}</option>)}
                  </select>
                </label>
              )}

              <div className="jd-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={jdMode === "paste"}
                  className={`jd-tab ${jdMode === "paste" ? "active" : ""}`}
                  onClick={() => setJdMode("paste")}
                >
                  {t.tabPaste}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={jdMode === "upload"}
                  className={`jd-tab ${jdMode === "upload" ? "active" : ""}`}
                  onClick={() => setJdMode("upload")}
                >
                  {t.tabUpload}
                </button>
              </div>

              {jdMode === "paste" ? (
                <label className="jd-compose">
                  <span>{t.orPaste}</span>
                  <textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder={t.placeholder} />
                </label>
              ) : (
                <>
                  <label className={`scan-upload ${working === "jd-upload" ? "is-working" : ""}`}>
                    <input type="file" accept="application/pdf" onChange={uploadJdFile} />
                    <Icon name="upload" size={28} />
                    <strong>{working === "jd-upload" ? t.jdReading : t.jdChoose}</strong>
                    {working === "jd-upload" && <span className="scan-upload-loader" aria-hidden="true"><i /><i /><i /></span>}
                    <span>{t.jdUploadHint}</span>
                  </label>
                  {jdNotice && <div className="notice info" role="status">{jdNotice}</div>}
                  {jd && (
                    <label className="jd-compose">
                      <span>{t.orPaste}</span>
                      <textarea value={jd} onChange={(e) => setJd(e.target.value)} />
                    </label>
                  )}
                </>
              )}
            </div>

            <button
              className={`scan-submit ${working === "job" || working === "matching" ? "is-loading" : ""}`}
              type="button"
              onClick={run}
              disabled={!ready || Boolean(working)}
            >
              <span className="scan-submit-icon"><Icon name="radar" /></span>
              <span>{working === "job" ? t.preparing : t.start}</span>
            </button>
          </div>

          <aside className="scan-preview" aria-label={t.report}>
            <div className="preview-window">
              <header><span /><span /><span /><b>{t.report}</b></header>
              <div className="preview-report">
                <div className="preview-score-ring"><strong>82</strong><small>/100</small></div>
                <div><small>{t.fit}</small><h3>Backend Engineer</h3><p>{t.strengths}</p></div>
              </div>
              <div className="preview-findings">
                <p>{t.good1}</p>
                <p>{t.good2}</p>
                <p className="warn">{t.warn}</p>
              </div>
            </div>
          </aside>
        </section>

        {working === "matching" && (
          <div className="scan-modal-backdrop">
            <section className="scan-modal" role="dialog" aria-modal="true">
              <span className="scan-document"><Icon name="doc" size={30} /></span>
              <h2>{t.analyzing}</h2>
              <p>{t.analyzingText}</p>
              <div className="scan-progress" aria-label={`Tiến độ ${Math.round(progress)}%`}><span style={{ width: progress + "%" }} /></div>
              <div className="scan-modal-steps" aria-hidden="true">
                <span className={progress > 22 ? "done" : "active"}>Đọc JD</span>
                <span className={progress > 48 ? "done" : progress > 22 ? "active" : ""}>So khớp CV</span>
                <span className={progress > 74 ? "done" : progress > 48 ? "active" : ""}>Tính điểm</span>
                <span className={progress > 88 ? "active" : ""}>Tạo báo cáo</span>
              </div>
              <small>{t.wait}</small>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
