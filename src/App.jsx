import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createJob,
  getCv,
  getCvs,
  getJobMatches,
  getJobs,
  getMatchJob,
  getRecruitmentAnalytics,
  seedDemoData,
  startMatchJob,
  submitMatchFeedback,
  updateMatchStatus,
  uploadCv,
} from "./api/cvmatchService";

const paths = {
  alert: ["M12 9v4", "M12 17h.01", "M10.3 3.7 2.2 18a2 2 0 0 1 3.4 0l8.2 14.6a2 2 0 0 1-1.8 3H3.9a2 2 0 0 1-1.8-3z"],
  arrow: ["M5 12h14", "m13 6 6 6-6 6"],
  briefcase: ["M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2", "M3 6h18v14H3z", "M3 11h18"],
  check: ["m5 12 4 4L19 6"],
  close: ["M18 6 6 18", "M6 6l12 12"],
  doc: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M9 13h6", "M9 17h6"],
  download: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"],
  mail: ["M4 4h16v16H4z", "m22 6-10 7L2 6"],
  radar: ["M12 3v18", "M3 12h18", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "M12 12l5-5"],
  search: ["m21 21-4.35-4.35", "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10", "m9 12 2 2 4-4"],
  spark: ["m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z", "M19 15l.7 2.3L22 18l-2.3.7L19 22l-.7-3.3L15 18l3.3-.7z"],
  upload: ["M12 16V4", "m7 9 5-5 5 5", "M5 20h14"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M22 21v-2a4 4 0 0 0-3-3.9", "M16 3.1a4 4 0 0 1 0 7.8"],
};

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const messageOf = (error) => {
  const detail = error?.response?.data?.detail || error?.message;
  if (detail === "Network Error") return "Không kết nối được backend. Vui lòng bật API rồi tải lại trang.";
  return detail || "Không thể hoàn tất thao tác. Vui lòng thử lại.";
};

const SCORE_INFO = [
  { key: "rule_score", label: "Yêu cầu JD", color: "blue", help: "Mức độ đáp ứng kỹ năng, kinh nghiệm và điều kiện bắt buộc trong JD." },
  { key: "semantic_score", label: "Ngữ nghĩa", color: "mint", help: "Mức độ CV gần nghĩa với JD, kể cả khi dùng từ khác nhau." },
  { key: "ml_rank_score", label: "AI học từ bạn", color: "orange", help: "Điểm ưu tiên dựa trên phản hồi shortlist/loại trước đó." },
  { key: "confidence_score", label: "Độ tin cậy", color: "violet", help: "Mức đầy đủ của bằng chứng trong CV. Thấp nghĩa là nên kiểm tra thêm." },
];

const VIEW_META = {
  jobs: { title: "Tạo JD rõ ràng", subtitle: "Dán tin tuyển dụng, hệ thống tách yêu cầu và chuẩn bị tiêu chí chấm điểm." },
  cvs: { title: "Nạp CV ứng viên", subtitle: "Tải nhiều CV PDF, trích xuất hồ sơ và ẩn thông tin cá nhân trước khi chấm điểm." },
  match: { title: "Phân tích mức độ phù hợp", subtitle: "Tổng quan điểm, danh mục đề xuất, bằng chứng CV và bước quyết định cho từng ứng viên." },
  summary: { title: "Tổng hợp tuyển dụng", subtitle: "Nắm toàn cảnh ứng viên, tiến độ xử lý và những điểm cần xác minh trước khi chốt danh sách." },
};

const NAV = [
  { key: "jobs", icon: "briefcase", label: "JD" },
  { key: "cvs", icon: "upload", label: "CV" },
  { key: "match", icon: "radar", label: "Phân tích" },
  { key: "summary", icon: "users", label: "Tổng hợp" },
];

function Icon({ name, size = 20 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {(paths[name] || paths.spark).map((d) => <path d={d} key={d} />)}
    </svg>
  );
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [cvs, setCvs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [jobId, setJobId] = useState("");
  const [match, setMatch] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [matchJob, setMatchJob] = useState(null);
  const [jd, setJd] = useState("");
  const [filter, setFilter] = useState("");
  const [working, setWorking] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [view, setView] = useState(null);
  const [viewer, setViewer] = useState(null);

  const job = jobs.find((item) => item.id === jobId);
  const visibleMatches = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return matches;
    return matches.filter((item) => `${item.candidate_name || ""} ${(item.matched_skills || []).join(" ")} ${(item.missing_skills || []).join(" ")}`.toLowerCase().includes(needle));
  }, [filter, matches]);

  const loadMatches = useCallback(async (id) => {
    if (!id) {
      setMatches([]);
      setMatch(null);
      return;
    }
    const data = await getJobMatches(id);
    setMatches(data);
    setMatch((current) => data.find((item) => item.id === current?.id) || data[0] || null);
  }, []);

  const refresh = useCallback(async () => {
    setWorking("loading");
    try {
      const [jobData, cvData, analyticsData] = await Promise.all([getJobs(), getCvs(), getRecruitmentAnalytics()]);
      setJobs(jobData);
      setCvs(cvData);
      setAnalytics(analyticsData);
      const nextJobId = jobId || jobData[0]?.id || "";
      setJobId(nextJobId);
      await loadMatches(nextJobId);
      setView((current) => current ?? (jobData.length ? (cvData.length ? "match" : "cvs") : "jobs"));
    } catch (error) {
      setNotice({ type: "error", text: messageOf(error) });
      setView((current) => current || "jobs");
    } finally {
      setWorking("");
    }
  }, [jobId, loadMatches]);

  useEffect(() => {
    const timer = window.setTimeout(() => refresh(), 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = VIEW_META[view] || VIEW_META.match;

  async function runMatch() {
    if (!jobId || !cvs.length) {
      setNotice({ type: "error", text: "Cần có một JD và ít nhất một CV trước khi chạy phân tích." });
      return;
    }
    setWorking("matching");
    setNotice({ type: "", text: "" });
    try {
      let task = await startMatchJob(jobId, { top_k: 1000 });
      setMatchJob(task);
      for (let i = 0; i < 70 && !["completed", "failed"].includes(task.status); i += 1) {
        await sleep(650);
        task = await getMatchJob(task.id);
        setMatchJob(task);
      }
      if (task.status !== "completed") throw new Error(task.error || "Phiên phân tích chưa hoàn tất.");
      await loadMatches(jobId);
      setAnalytics(await getRecruitmentAnalytics());
      setNotice({ type: "success", text: `Đã phân tích ${task.result_count || 0} ứng viên. Chọn từng người để xem lý do và bằng chứng.` });
    } catch (error) {
      setNotice({ type: "error", text: messageOf(error) });
    } finally {
      setWorking("");
    }
  }

  async function addJob(event) {
    event.preventDefault();
    if (!jd.trim()) return;
    setWorking("job");
    try {
      const created = await createJob({ raw_text: jd });
      setJobs((items) => [created, ...items]);
      setJobId(created.id);
      setJd("");
      await loadMatches(created.id);
      setView(cvs.length ? "match" : "cvs");
      setNotice({ type: "success", text: cvs.length ? `Đã tạo JD "${created.title}". Bước tiếp theo: chạy phân tích ứng viên.` : `Đã tạo JD "${created.title}". Bước tiếp theo: tải CV ứng viên.` });
    } catch (error) {
      setNotice({ type: "error", text: messageOf(error) });
    } finally {
      setWorking("");
    }
  }

  async function addCvs(event) {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;
    setWorking("upload");
    try {
      await Promise.all(files.map(uploadCv));
      setCvs(await getCvs());
      setNotice({ type: "success", text: `Đã thêm ${files.length} CV. Hệ thống đã trích xuất nội dung và chuẩn bị dữ liệu chấm điểm.` });
      if (jobs.length) setView("match");
    } catch (error) {
      setNotice({ type: "error", text: messageOf(error) });
    } finally {
      setWorking("");
    }
  }

  async function sendFeedback(verdict) {
    if (!match) return;
    setWorking("feedback");
    try {
      await submitMatchFeedback(match.id, { verdict, reason: "Recruiter review workspace" });
      setAnalytics(await getRecruitmentAnalytics());
      setNotice({ type: "success", text: "Đã ghi nhận phản hồi. Các lần xếp hạng sau sẽ học từ quyết định này." });
    } catch (error) {
      setNotice({ type: "error", text: messageOf(error) });
    } finally {
      setWorking("");
    }
  }

  async function updatePipeline(status) {
    if (!match) return;
    setWorking("status");
    try {
      const updated = await updateMatchStatus(match.id, { pipeline_status: status, note: match.note || "" });
      setMatch(updated);
      setMatches((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setAnalytics(await getRecruitmentAnalytics());
      setNotice({ type: "success", text: `Đã lưu trạng thái: ${pipelineStatusLabel(status)}.` });
    } catch (error) {
      setNotice({ type: "error", text: messageOf(error) });
    } finally {
      setWorking("");
    }
  }

  async function loadDemo() {
    setWorking("demo");
    try {
      await seedDemoData();
      setView("match");
      await refresh();
    } catch (error) {
      setNotice({ type: "error", text: messageOf(error) });
    } finally {
      setWorking("");
    }
  }

  async function exportSummary() {
    if (!job || !matches.length) return;
    setWorking("export");
    setNotice({ type: "", text: "" });
    const report = document.createElement("div");
    report.className = "pdf-report-root";
    report.innerHTML = buildRecruitmentReportMarkup(job, matches, analytics);
    document.body.appendChild(report);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const safeTitle = String(job.title || "tuyen-dung").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
      const filename = `bao-cao-tuyen-dung-${safeTitle || "tong-hop"}.pdf`;
      await document.fonts.ready;
      const canvas = await html2canvas(report, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        width: report.scrollWidth,
        height: report.scrollHeight,
        windowWidth: report.scrollWidth,
        windowHeight: report.scrollHeight,
      });
      if (canvas.width < 1000 || canvas.height < 600) throw new Error("Không dựng được nội dung báo cáo.");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const imageData = canvas.toDataURL("image/jpeg", 0.96);
      const imageHeight = (canvas.height * contentWidth) / canvas.width;
      let renderedHeight = 0;
      pdf.addImage(imageData, "JPEG", margin, margin, contentWidth, imageHeight, undefined, "FAST");
      renderedHeight += contentHeight;
      while (renderedHeight < imageHeight) {
        pdf.addPage();
        pdf.addImage(imageData, "JPEG", margin, margin - renderedHeight, contentWidth, imageHeight, undefined, "FAST");
        renderedHeight += contentHeight;
      }
      const pdfBlob = pdf.output("blob");
      document.documentElement.dataset.lastPdfSize = String(pdfBlob?.size || 0);
      document.documentElement.dataset.lastPdfCanvas = `${canvas.width}x${canvas.height}`;
      if (!pdfBlob || pdfBlob.size < 15000) throw new Error("File PDF không chứa đủ dữ liệu để xuất.");
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setNotice({ type: "success", text: `Đã xuất báo cáo tuyển dụng cho vị trí "${job.title}".` });
    } catch (error) {
      setNotice({ type: "error", text: `Không thể xuất báo cáo. ${messageOf(error)}` });
    } finally {
      report.remove();
      setWorking("");
    }
  }

  async function openCvOriginal(cvId, name) {
    setViewer({ title: `CV gốc · ${name || "Ứng viên"}`, loading: true });
    try {
      const full = await getCv(cvId);
      setViewer({ title: `CV gốc · ${full.extracted_data?.candidate_name || name || "Ứng viên"}`, text: full.raw_text || "(CV này chưa trích được văn bản.)" });
    } catch (error) {
      setViewer({ title: "CV gốc", text: messageOf(error) });
    }
  }

  const openJdOriginal = (item) => setViewer({ title: `JD gốc · ${item.title}`, text: item.raw_text || "(Không có nội dung JD gốc.)" });
  const openCvParsed = (cv) => setViewer({ title: `Hồ sơ trích xuất · ${cv.extracted_data?.candidate_name || cv.filename}`, text: parsedToText(cv.extracted_data) });
  const selectJobForMatching = (id) => {
    setJobId(id);
    loadMatches(id);
    setView("match");
  };

  return (
    <div className="app-shell" data-ai-id="cv-match-workspace">
      <header className="step-rail" data-ai-id="step-rail">
        <div className="brand-mark">
          <span><Icon name="spark" /></span>
          <div><strong>TalentScan</strong><small>Báo cáo CV minh bạch</small></div>
        </div>
        <nav className="rail-nav" aria-label="Điều hướng chính">
          {NAV.map((item, index) => (
            <button key={item.key} type="button" className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}>
              <span>{index + 1}</span><Icon name={item.icon} /><b>{item.label}</b>
            </button>
          ))}
        </nav>
        <WorkspaceStats jobs={jobs.length} cvs={cvs.length} matches={matches.length} analytics={analytics} />
        <button className="ghost-action" type="button" onClick={loadDemo} disabled={Boolean(working)}>
          <Icon name="download" size={18} />{working === "demo" ? "Đang nạp mẫu" : "Nạp dữ liệu mẫu"}
        </button>
      </header>

      <main className="workspace" data-ai-id="main-workspace">
        <header className="workspace-header">
          <div><p className="eyebrow">Quy trình tuyển dụng</p><h1>{meta.title}</h1><p>{meta.subtitle}</p></div>
          <div className="header-actions">
            {(view === "match" || view === "summary") && (
              <>
                <label><span>JD đang đánh giá</span><select value={jobId} onChange={(event) => selectJobForMatching(event.target.value)}>
                  <option value="">Chọn JD</option>
                  {jobs.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.company || "Chưa rõ công ty"}</option>)}
                </select></label>
                {view === "match" && <button className="primary-action" type="button" onClick={runMatch} disabled={!jobId || !cvs.length || working === "matching"}>
                  <Icon name="radar" />{working === "matching" ? "Đang phân tích" : "Bắt đầu phân tích"}
                </button>}
                {view === "summary" && <button className="primary-action" type="button" onClick={exportSummary} disabled={!job || !matches.length || working === "export"}>
                  <Icon name="download" />{working === "export" ? "Đang tạo PDF" : "Xuất báo cáo PDF"}
                </button>}
              </>
            )}
          </div>
        </header>

        {notice.text && <Notice type={notice.type} text={notice.text} />}
        {working === "loading" && <LoadingBar text="Đang tải dữ liệu tuyển dụng..." />}
        {working === "matching" && <MatchingProgress task={matchJob} />}
        {view === "jobs" && <JobsView jd={jd} jobs={jobs} onOpenOriginal={openJdOriginal} onSelectJob={selectJobForMatching} onSubmit={addJob} setJd={setJd} working={working} />}
        {view === "cvs" && <CvsView cvs={cvs} jobs={jobs} onOpenOriginal={openCvOriginal} onOpenParsed={openCvParsed} onUpload={addCvs} setView={setView} working={working} />}
        {view === "match" && (
          <MatchView
            cvs={cvs}
            filter={filter}
            job={job}
            jobs={jobs}
            match={match}
            matches={matches}
            onFeedback={sendFeedback}
            onOpenCv={openCvOriginal}
            onOpenJd={openJdOriginal}
            onRunMatch={runMatch}
            onSelectMatch={setMatch}
            onSetView={setView}
            onUpdatePipeline={updatePipeline}
            setFilter={setFilter}
            visibleMatches={visibleMatches}
            working={working}
          />
        )}
        {view === "summary" && (
          <RecruitmentSummary
            analytics={analytics}
            job={job}
            matches={matches}
            onOpenCandidate={(item) => {
              setMatch(item);
              setView("match");
            }}
            onSetView={setView}
          />
        )}
      </main>
      <RawViewer viewer={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}

function WorkspaceStats({ jobs, cvs, matches, analytics }) {
  return <section className="rail-stats" data-ai-id="workspace-stats"><MiniStat label="JD" value={jobs} /><MiniStat label="CV" value={cvs} /><MiniStat label="Kết quả" value={matches} /><MiniStat label="Cảnh báo" value={analytics?.fairness?.fairness_flagged_matches ?? 0} /></section>;
}

function MiniStat({ label, value }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function Notice({ type, text }) {
  return <div className={`notice ${type || "info"}`} role="status"><Icon name={type === "error" ? "alert" : "check"} /><span>{text}</span></div>;
}

function LoadingBar({ text }) {
  return <div className="loading-line" role="status"><span /><b>{text}</b></div>;
}

function MatchingProgress({ task }) {
  const progress = Number(task?.progress || 0);
  return <section className="match-progress" data-ai-id="matching-progress"><div><span className="pulse-dot" /><strong>Đang phân tích hồ sơ</strong><small>Tách yêu cầu JD, so khớp CV, tính điểm và kiểm tra cảnh báo công bằng.</small></div><div className="progress-track" aria-label={`Tiến độ ${progress}%`}><span style={{ width: `${progress}%` }} /></div><b>{progress}%</b></section>;
}

function JobsView({ jd, jobs, onOpenOriginal, onSelectJob, onSubmit, setJd, working }) {
  return (
    <section className="setup-grid" data-ai-id="job-setup">
      <article className="input-panel">
        <PanelTitle icon="briefcase" eyebrow="Bước 1" title="Dán mô tả công việc" />
        <form onSubmit={onSubmit}>
          <label><span>Nội dung JD</span><textarea rows={14} value={jd} onChange={(event) => setJd(event.target.value)} placeholder="Dán toàn bộ tin tuyển dụng vào đây. Hệ thống sẽ tự tách chức danh, công ty, kỹ năng bắt buộc, kỹ năng ưu tiên và cấp bậc." required /></label>
          <button className="primary-action full" type="submit" disabled={!jd.trim() || working === "job"}><Icon name="spark" />{working === "job" ? "Đang phân tích JD" : "Lưu JD và chuyển bước"}</button>
        </form>
      </article>
      <article className="table-panel">
        <PanelTitle icon="doc" eyebrow={`${jobs.length} JD đã lưu`} title="Danh sách vị trí" />
        <div className="job-list">
          {!jobs.length && <EmptyState icon="briefcase" title="Chưa có JD" text="Dán một tin tuyển dụng ở khung bên trái để hệ thống biết tiêu chí cần so khớp." />}
          {jobs.map((item) => <article className="job-row" key={item.id}><div><strong>{item.title}</strong><span>{item.company || "Chưa rõ công ty"} · {item.level || "Chưa rõ cấp bậc"}</span><small>{(item.required_skills || []).slice(0, 7).join(" · ") || "Chưa nhận diện kỹ năng bắt buộc"}</small></div><div className="row-actions"><button className="text-action" type="button" onClick={() => onOpenOriginal(item)}><Icon name="doc" size={17} /> JD gốc</button><button className="secondary-action" type="button" onClick={() => onSelectJob(item.id)}>Phân tích CV <Icon name="arrow" size={17} /></button></div></article>)}
        </div>
      </article>
    </section>
  );
}

function CvsView({ cvs, jobs, onOpenOriginal, onOpenParsed, onUpload, setView, working }) {
  return (
    <section className="setup-grid" data-ai-id="cv-upload">
      <article className="input-panel">
        <PanelTitle icon="upload" eyebrow="Bước 2" title="Tải CV ứng viên" />
        <label className="upload-drop"><input type="file" accept="application/pdf" multiple onChange={onUpload} /><Icon name="upload" size={30} /><strong>{working === "upload" ? "Đang đọc CV" : "Chọn hoặc kéo CV PDF"}</strong><span>Tải được nhiều file cùng lúc. Hệ thống đọc nội dung, trích kỹ năng và đánh dấu thông tin cá nhân.</span></label>
        <button className="secondary-action full" type="button" onClick={() => setView("match")} disabled={!jobs.length || !cvs.length}>Sang bước phân tích <Icon name="arrow" size={17} /></button>
      </article>
      <article className="table-panel">
        <PanelTitle icon="users" eyebrow={`${cvs.length} CV trong kho`} title="Hồ sơ đã tải" />
        <div className="cv-list">
          {!cvs.length && <EmptyState icon="users" title="Chưa có CV" text="Tải CV PDF để hệ thống tạo kho ứng viên và chuẩn bị bảng xếp hạng." />}
          {cvs.map((cv) => <article className="cv-row" key={cv.id}><div className="file-badge">PDF</div><div><strong>{cv.extracted_data?.candidate_name || "Ứng viên chưa rõ tên"}</strong><span>{(cv.extracted_data?.skills || []).slice(0, 8).join(" · ") || "Chưa nhận diện kỹ năng"}</span><small>{cv.filename} · {cv.pii_masking?.status === "masked" ? "Đã ẩn thông tin cá nhân" : "Đang chờ xử lý"}</small></div><div className="row-actions"><button className="text-action" type="button" onClick={() => onOpenOriginal(cv.id, cv.extracted_data?.candidate_name)}><Icon name="doc" size={17} /> CV gốc</button><button className="text-action" type="button" onClick={() => onOpenParsed(cv)}><Icon name="search" size={17} /> Trích xuất</button></div></article>)}
        </div>
      </article>
    </section>
  );
}

function MatchView({ cvs, filter, job, jobs, match, matches, onFeedback, onOpenCv, onOpenJd, onRunMatch, onSelectMatch, onSetView, onUpdatePipeline, setFilter, visibleMatches, working }) {
  if (!jobs.length || !cvs.length) {
    return <section className="missing-setup" data-ai-id="missing-setup"><PanelTitle icon="alert" eyebrow="Thiếu dữ liệu" title="Cần JD và CV trước khi phân tích" /><p>Luồng này cần ít nhất một mô tả công việc và một CV. Hoàn tất các bước còn thiếu rồi quay lại phân tích.</p><div><button className="secondary-action" type="button" onClick={() => onSetView("jobs")}>Tạo JD</button><button className="primary-action" type="button" onClick={() => onSetView("cvs")}>Tải CV</button></div></section>;
  }
  return (
    <section className="report-layout" data-ai-id="match-report">
      <article className="ranking-card">
        <div className="ranking-head"><PanelTitle icon="radar" eyebrow={`Bước phân tích · ${matches.length} kết quả`} title={job?.title || "Chọn JD để phân tích"} /><label className="search-box"><Icon name="search" size={18} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Tìm tên hoặc kỹ năng" /></label></div>
        <div className="legend-strip">{SCORE_INFO.map((item) => <span key={item.key}>{item.label}</span>)}</div>
        <div className="candidate-list">
          {!visibleMatches.length && <EmptyState icon="radar" title="Chưa có phân tích" text="Bấm “Bắt đầu phân tích” để tạo điểm phù hợp, bằng chứng và câu hỏi phỏng vấn cho từng CV."><button className="primary-action" type="button" onClick={onRunMatch} disabled={working === "matching"}><Icon name="radar" /> Bắt đầu phân tích</button></EmptyState>}
          {visibleMatches.map((item, index) => <button type="button" className={`candidate-row ${match?.id === item.id ? "selected" : ""}`} key={item.id} onClick={() => onSelectMatch(item)}><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><div className="candidate-main"><strong>{item.candidate_name}</strong><small>{item.recruiter_priority || item.pipeline_status || "Cần xem xét"}</small><div className="score-bars">{SCORE_INFO.map((score) => <i key={score.key} className={score.color} style={{ "--value": `${scoreValue(item[score.key])}%` }} title={`${score.label}: ${scoreValue(item[score.key])}`} />)}</div></div><ScoreRing score={item.final_score} small /></button>)}
        </div>
      </article>
      <CandidateReport job={job} match={match} onFeedback={onFeedback} onOpenCv={onOpenCv} onOpenJd={onOpenJd} onUpdatePipeline={onUpdatePipeline} working={working} />
    </section>
  );
}

function CandidateReport({ job, match, onFeedback, onOpenCv, onOpenJd, onUpdatePipeline, working }) {
  if (!match) return <aside className="report-card empty-report" data-ai-id="candidate-report-empty"><EmptyState icon="search" title="Chọn một ứng viên" text="Bảng bên trái là danh sách ưu tiên. Chọn một dòng để xem tổng quan, điểm mạnh, điểm cần cải thiện và bằng chứng từ CV." /></aside>;

  const analysis = buildReportStats(match, job);

  return (
    <aside className="report-card analysis-report" data-ai-id="candidate-report">
      <div className="analysis-dashboard">
        <div className="analysis-content">
          <OverviewAnalysis analysis={analysis} match={match} />
          <div className="quick-actions"><button className="text-action" type="button" onClick={() => onOpenCv(match.cv_id, match.candidate_name)}><Icon name="doc" size={17} /> Xem CV gốc</button>{job && <button className="text-action" type="button" onClick={() => onOpenJd(job)}><Icon name="briefcase" size={17} /> Xem JD gốc</button>}</div>
          <ContentAnalysis analysis={analysis} match={match} />
          <SkillsAnalysis analysis={analysis} />
          <InterviewQuestions questions={match.interview_questions || []} />
          <DecisionSection status={match.pipeline_status} onFeedback={onFeedback} onUpdatePipeline={onUpdatePipeline} working={working} />
        </div>
      </div>
    </aside>
  );
}

function OverviewAnalysis({ analysis, match }) {
  return (
    <section className="analysis-panel overview-analysis" data-ai-id="overview-analysis">
      <div className="overview-copy">
        <p className="eyebrow">Tổng quan</p>
        <h2>{match.candidate_name}</h2>
        <p><strong>Mức độ phù hợp: {analysis.score}</strong></p>
        <p>{analysis.summary}</p>
      </div>
      <RadarChart categories={analysis.categories} />
      <div className="overview-insights">
        <InsightBox tone="good" title="Điểm nổi bật" items={analysis.strengths} empty="Chưa có điểm mạnh nổi bật từ dữ liệu hiện tại." />
        <InsightBox tone="warn" title="Cải thiện" items={analysis.risks} empty="Chưa phát hiện khoảng thiếu rõ ràng." />
      </div>
    </section>
  );
}

function RadarChart({ categories }) {
  const center = 88;
  const maxRadius = 58;
  const points = categories.map((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / categories.length;
    const radius = 16 + (scoreValue(item.value) / 100) * maxRadius;
    return {
      ...item,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * 82,
      labelY: center + Math.sin(angle) * 82,
      axisX: center + Math.cos(angle) * 70,
      axisY: center + Math.sin(angle) * 70,
    };
  });
  const polygon = points.map((item) => `${item.x},${item.y}`).join(" ");
  const grid = [14, 28, 42, 56, 70].map((radius) => categories.map((_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / categories.length;
    return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
  }).join(" "));

  return (
    <svg className="radar-chart" viewBox="0 0 176 176" role="img" aria-label="Biểu đồ radar mức độ phù hợp theo nhóm">
      {grid.map((line) => <polygon className="radar-grid" points={line} key={line} />)}
      {points.map((item) => <line className="radar-axis" x1={center} y1={center} x2={item.axisX} y2={item.axisY} key={`${item.key}-axis`} />)}
      <polygon className="radar-area" points={polygon} />
      <polyline className="radar-line" points={`${polygon} ${points[0].x},${points[0].y}`} />
      {points.map((item) => <circle className={`radar-dot ${item.color}`} cx={item.x} cy={item.y} r="3.8" key={`${item.key}-dot`} />)}
      {points.map((item) => <text className="radar-label" x={item.labelX} y={item.labelY} textAnchor="middle" dominantBaseline="middle" key={`${item.key}-label`}>{item.label}</text>)}
    </svg>
  );
}

function ContentAnalysis({ analysis, match }) {
  const evidenceItems = analysis.missingEvidence.slice(0, 3);
  return (
    <AnalysisSection icon="doc" tone="blue" title="Nội dung" description="Phần này kiểm tra bằng chứng trong CV có đủ rõ để nhà tuyển dụng hiểu vì sao hệ thống chấm điểm như vậy hay chưa.">
      <SummaryBanner tone="blue" title="Gần xong rồi! Hãy làm rõ bằng chứng để tăng tính thuyết phục." metrics={[{ label: "Bằng chứng còn thiếu", value: analysis.evidenceGapCount }, { label: "Độ tin cậy", value: `${analysis.confidence}%` }]} />
      <div className="suggestion-stack">
        <SuggestionCard tone={evidenceItems.length ? "warn" : "good"} title={evidenceItems.length ? "Bằng chứng CV còn thiếu" : "Bằng chứng chính đã rõ"} description={evidenceItems.length ? "Những yêu cầu này có trong JD nhưng CV chưa có dẫn chứng trực tiếp." : "Các yêu cầu chính đã có dữ liệu để đối chiếu với CV."}>
          {evidenceItems.length ? evidenceItems.map((item, index) => <p key={`${item.requirement}-${index}`}>{formatRequirementName(item.requirement)}</p>) : analysis.matchedEvidence.slice(0, 3).map((item, index) => <p key={`${item.requirement}-${index}`}>{item.cv_evidence}</p>)}
        </SuggestionCard>
        <SuggestionCard tone="neutral" title="Nhận định hệ thống" description="Tóm tắt ngắn để người duyệt hiểu điểm số trước khi xem chi tiết.">
          <p>{match.recommendation || analysis.summary}</p>
        </SuggestionCard>
      </div>
    </AnalysisSection>
  );
}

function SkillsAnalysis({ analysis }) {
  return (
    <AnalysisSection icon="spark" tone="mint" title="Kỹ năng" description="Phần này so sánh kỹ năng trong JD với bằng chứng tìm thấy trong CV, tách riêng kỹ năng chuyên môn và kỹ năng mềm.">
      <SummaryBanner tone="mint" title="Thêm những kỹ năng quan trọng này để tăng độ phù hợp!" metrics={[{ label: "Kỹ năng chuyên môn thiếu", value: analysis.missingHardCount }, { label: "Kỹ năng mềm thiếu", value: analysis.missingSoftCount }]} />
      <SkillTable title="Kỹ năng chuyên môn" rows={analysis.hardRows} />
      <SkillTable title="Kỹ năng mềm" rows={analysis.softRows} />
      <p className="report-tip"><Icon name="alert" size={15} /> Tip: ATS thường ưu tiên các từ khóa xuất hiện rõ trong JD. Nếu ứng viên có kỹ năng đó, CV nên ghi đúng tên kỹ năng và kèm ngữ cảnh sử dụng.</p>
    </AnalysisSection>
  );
}

function InterviewQuestions({ questions }) {
  return (
    <AnalysisSection icon="mail" tone="blue" title="Câu hỏi phỏng vấn" description="Gợi ý câu hỏi dựa trên các khoảng thiếu quan trọng trong CV, giúp người duyệt xác minh bằng chứng thay vì đoán.">
      <div className="question-list">
        {questions.length ? questions.slice(0, 3).map((item) => <article className="question-row" key={item.question}><span>{item.focus || "Kiểm tra thêm"}</span><p>{item.question}</p></article>) : <p className="muted-copy">Chưa có câu hỏi gợi ý cho hồ sơ này.</p>}
      </div>
    </AnalysisSection>
  );
}

function DecisionSection({ onFeedback, onUpdatePipeline, status = "New", working }) {
  const [feedbackChoice, setFeedbackChoice] = useState("");
  const statusOptions = [
    { value: "Shortlisted", label: "Shortlist" },
    { value: "Reviewed", label: "Đã xem" },
    { value: "Rejected", label: "Loại" },
  ];
  const chooseFeedback = async (verdict) => {
    setFeedbackChoice(verdict);
    await onFeedback(verdict);
  };
  return (
    <AnalysisSection icon="shield" tone="mint" title="Quyết định" description="Điểm số chỉ là tín hiệu hỗ trợ. Người tuyển dụng vẫn là người chốt trạng thái cuối cùng của ứng viên.">
      <div className="decision-panel compact">
        <div className="decision-actions">
          {statusOptions.map((item) => <button key={item.value} className={status === item.value ? "active" : ""} type="button" onClick={() => onUpdatePipeline(item.value)} disabled={working === "status"}>{working === "status" && status === item.value ? "Đang lưu..." : item.label}</button>)}
        </div>
        <p className="decision-current">Trạng thái hiện tại: <strong>{pipelineStatusLabel(status)}</strong></p>
        <div className="feedback-actions"><span>AI đánh giá có đúng không?</span><button className={feedbackChoice === "good_match" ? "active" : ""} type="button" onClick={() => chooseFeedback("good_match")} disabled={working === "feedback"}>{working === "feedback" && feedbackChoice === "good_match" ? "Đang ghi..." : "Đúng"}</button><button className={feedbackChoice === "explanation_incorrect" ? "active" : ""} type="button" onClick={() => chooseFeedback("explanation_incorrect")} disabled={working === "feedback"}>{working === "feedback" && feedbackChoice === "explanation_incorrect" ? "Đang ghi..." : "Chưa đúng"}</button></div>
        {feedbackChoice && <p className="feedback-confirmation"><Icon name="check" size={15} /> Đã ghi nhận phản hồi: {feedbackChoice === "good_match" ? "Đúng" : "Chưa đúng"}.</p>}
      </div>
    </AnalysisSection>
  );
}

function AnalysisSection({ icon, tone, title, description, children }) {
  return <section className={`analysis-section ${tone}`}><header><h3><span><Icon name={icon} size={18} /></span>{title}</h3><p>{description}</p></header>{children}</section>;
}

function SummaryBanner({ tone, title, metrics }) {
  return (
    <div className={`summary-banner ${tone}`}>
      <div className="summary-banner-copy">
        <strong>{title}</strong>
        <div className="summary-metrics">
          {metrics.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
        </div>
      </div>
      <div className="summary-visual" aria-hidden="true"><i /><i /><i /><b /></div>
    </div>
  );
}

function SuggestionCard({ tone, title, description, children }) {
  return <article className={`suggestion-card ${tone}`}><div className="suggestion-head"><Icon name={tone === "good" ? "check" : tone === "warn" ? "alert" : "doc"} size={18} /><div><strong>{title}</strong><span>{description}</span></div></div><div className="suggestion-body">{children}</div></article>;
}

function SkillTable({ title, rows }) {
  if (!rows.length) return null;
  return (
    <section className="skill-table-wrap">
      <h4>{title}</h4>
      <table className="skill-table">
        <thead><tr><th>Kỹ năng</th><th>Mô tả công việc</th><th>CV của bạn</th><th /></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr className={row.matched ? "" : "missing"} key={`${title}-${row.name}`}>
              <td><Icon name={row.matched ? "check" : "close"} size={16} /><strong>{row.name}</strong> <span>{priorityLabel(row.priority)}</span></td>
              <td>1</td>
              <td>{row.matched ? Math.max(1, row.cvCount) : 0}</td>
              <td>{row.evidence ? <span title={row.evidence}>Có bằng chứng</span> : <span>Chưa rõ</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function buildReportStats(match, job) {
  const explanation = match.match_explanation || {};
  const evidence = match.evidence || [];
  const requirementRows = (match.requirement_results || []).map(normalizeRequirementRow);
  const fallbackRows = buildFallbackRequirementRows(match, job);
  const rows = requirementRows.length ? requirementRows : fallbackRows;
  const hardRows = rows.filter((item) => item.type !== "soft_skill").slice(0, 14);
  const softRows = rows.filter((item) => item.type === "soft_skill").slice(0, 8);
  const missingHardCount = hardRows.filter((item) => !item.matched).length;
  const missingSoftCount = softRows.filter((item) => !item.matched).length;
  const missingEvidence = evidence.filter((item) => !item.cv_evidence);
  const matchedEvidence = evidence.filter((item) => item.cv_evidence);
  const confidence = scoreValue(match.confidence_score ?? match.score_breakdown?.confidence_score);
  const completeness = scoreValue(match.score_breakdown?.completeness_score ?? confidence);
  const semantic = scoreValue(match.semantic_score ?? match.score_breakdown?.semantic_score);
  const rule = scoreValue(match.rule_score ?? match.score_breakdown?.rule_score);
  const evidenceGapCount = missingEvidence.length;
  const contentIssues = (evidenceGapCount ? Math.max(1, Math.ceil(evidenceGapCount / 5)) : 0) + (confidence < 65 ? 1 : 0);
  const formatIssues = (confidence < 70 ? 1 : 0) + (completeness < 60 ? 1 : 0);
  const sectionIssues = (match.fairness_flags || []).length + (match.decision_support?.needs_verification ? 1 : 0);
  const styleIssues = semantic < 55 ? 1 : 0;
  const totalIssues = contentIssues + missingHardCount + missingSoftCount + formatIssues + sectionIssues + styleIssues;
  const strengths = uniqueList([...(explanation.strengths || []), ...(match.matched_skills || []).slice(0, 4)]).slice(0, 4);
  const risks = uniqueList([...(explanation.risks || []), ...(match.missing_skills || []).slice(0, 5)]).slice(0, 4);

  return {
    score: scoreValue(match.final_score),
    summary: explanation.summary || match.recommendation || "Hệ thống đã tạo điểm phù hợp dựa trên JD, nội dung CV và bằng chứng trích xuất.",
    strengths,
    risks,
    hardRows,
    softRows,
    missingHardCount,
    missingSoftCount,
    missingEvidence,
    matchedEvidence,
    evidenceGapCount,
    confidence,
    totalIssues,
    categories: [
      { key: "content", label: "Nội dung", count: contentIssues, value: Math.max(8, confidence), color: "blue" },
      { key: "skills", label: "Kỹ năng", count: missingHardCount + missingSoftCount, value: Math.max(8, rule), color: "mint" },
      { key: "sections", label: "Các mục", count: sectionIssues, value: Math.max(8, 100 - sectionIssues * 20), color: "red" },
      { key: "style", label: "Phong cách", count: styleIssues, value: Math.max(8, semantic), color: "violet" },
    ],
  };
}

function normalizeRequirementRow(item) {
  return {
    name: item.name || item.requirement || "Yêu cầu",
    type: item.type || "skill",
    priority: item.priority || (item.is_knockout ? "required" : "preferred"),
    matched: Boolean(item.matched || item.earned_weight > 0 || item.evidence),
    evidence: item.evidence || "",
    cvCount: item.evidence ? 1 : 0,
  };
}

function buildFallbackRequirementRows(match, job) {
  const matched = (match.matched_skills || []).map((name) => ({ name, type: "skill", priority: "matched", matched: true, evidence: name, cvCount: 1 }));
  const missing = (match.missing_skills || []).map((name) => ({ name, type: "skill", priority: "missing", matched: false, evidence: "", cvCount: 0 }));
  const soft = (job?.extracted_requirements?.soft_skills || []).map((name) => ({
    name,
    type: "soft_skill",
    priority: "preferred",
    matched: (match.matched_skills || []).some((skill) => String(skill).toLowerCase() === String(name).toLowerCase()),
    evidence: "",
    cvCount: 0,
  }));
  return [...missing, ...matched, ...soft];
}

function priorityLabel(priority) {
  if (priority === "required") return "(bắt buộc)";
  if (priority === "preferred") return "(ưu tiên)";
  if (priority === "matched") return "(đã có)";
  return "(cần bổ sung)";
}

function pipelineStatusLabel(status) {
  if (status === "Shortlisted") return "Shortlist";
  if (status === "Reviewed") return "Đã xem";
  if (status === "Rejected") return "Loại";
  return "Mới";
}

function RecruitmentSummary({ analytics, job, matches, onOpenCandidate, onSetView }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const sorted = useMemo(
    () => [...matches].sort((a, b) => scoreValue(b.final_score) - scoreValue(a.final_score)),
    [matches],
  );
  const counts = {
    All: matches.length,
    Shortlisted: matches.filter((item) => item.pipeline_status === "Shortlisted").length,
    Reviewed: matches.filter((item) => item.pipeline_status === "Reviewed").length,
    Rejected: matches.filter((item) => item.pipeline_status === "Rejected").length,
    New: matches.filter((item) => !item.pipeline_status || item.pipeline_status === "New").length,
  };
  const visible = statusFilter === "All" ? sorted : sorted.filter((item) => (item.pipeline_status || "New") === statusFilter);
  const average = matches.length ? Math.round(matches.reduce((total, item) => total + scoreValue(item.final_score), 0) / matches.length) : 0;
  const quality = analytics?.quality || {};
  const positiveFeedback = quality.feedback_count ? Math.round(Number(quality.good_match_rate || 0) * 100) : null;
  const skillGaps = aggregateSkillGaps(matches);
  const reviewedCount = counts.Shortlisted + counts.Reviewed + counts.Rejected;

  if (!job || !matches.length) {
    return (
      <section className="summary-empty" data-ai-id="recruitment-summary-empty">
        <EmptyState icon="users" title="Chưa có kết quả để tổng hợp" text="Chọn một JD đã có ứng viên, hoặc chạy phân tích trước để tạo bảng tổng hợp tuyển dụng.">
          <button className="primary-action" type="button" onClick={() => onSetView("match")}><Icon name="radar" /> Đi đến phân tích</button>
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="recruitment-summary" data-ai-id="recruitment-summary">
      <div className="summary-kpis">
        <article className="summary-lead">
          <p className="eyebrow">Vị trí đang tuyển</p>
          <h2>{job.title}</h2>
          <span>{job.company || "Chưa rõ công ty"} · {matches.length} ứng viên đã phân tích</span>
          <div className="summary-lead-score"><strong>{average}</strong><span>Điểm phù hợp trung bình</span></div>
        </article>
        <SummaryKpi label="Đã xử lý" value={`${reviewedCount}/${matches.length}`} note={`${counts.New} hồ sơ đang chờ quyết định`} tone="blue" />
        <SummaryKpi label="Shortlist" value={counts.Shortlisted} note={counts.Shortlisted ? "Sẵn sàng cho vòng tiếp theo" : "Chưa có ứng viên được chọn"} tone="mint" />
        <SummaryKpi label="Phản hồi đồng thuận" value={positiveFeedback === null ? "—" : `${positiveFeedback}%`} note={`${quality.feedback_count || 0} lượt HR phản hồi`} tone="orange" />
      </div>

      <div className="summary-workbench">
        <article className="summary-ranking">
          <header className="summary-section-head">
            <div><p className="eyebrow">Danh sách quyết định</p><h2>Xếp hạng ứng viên</h2></div>
            <span>{visible.length} hồ sơ</span>
          </header>
          <div className="status-filters" aria-label="Lọc theo trạng thái">
            {[
              ["All", "Tất cả"],
              ["Shortlisted", "Shortlist"],
              ["Reviewed", "Đã xem"],
              ["Rejected", "Loại"],
              ["New", "Chưa xử lý"],
            ].map(([key, label]) => (
              <button type="button" className={statusFilter === key ? "active" : ""} onClick={() => setStatusFilter(key)} key={key}>
                {label}<span>{counts[key]}</span>
              </button>
            ))}
          </div>
          <div className="summary-candidate-table">
            <div className="summary-table-head"><span>Ứng viên</span><span>Điểm</span><span>Kỹ năng thiếu</span><span>Trạng thái</span><span /></div>
            {visible.map((item, index) => (
              <button type="button" className="summary-candidate-row" key={item.id} onClick={() => onOpenCandidate(item)}>
                <span className="summary-person"><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{item.candidate_name}</strong><small>{item.recruiter_priority || "Cần xem xét"}</small></span></span>
                <strong className="summary-score">{scoreValue(item.final_score)}</strong>
                <span className="summary-gap">{(item.missing_required_skills || item.missing_skills || []).slice(0, 2).join(", ") || "Đủ kỹ năng chính"}</span>
                <span className={`status-chip status-${item.pipeline_status || "New"}`}><Icon name={item.pipeline_status === "Shortlisted" ? "check" : item.pipeline_status === "Rejected" ? "close" : "doc"} size={15} />{pipelineStatusLabel(item.pipeline_status)}</span>
                <Icon name="arrow" size={17} />
              </button>
            ))}
            {!visible.length && <div className="summary-no-results">Không có ứng viên ở trạng thái này.</div>}
          </div>
        </article>

        <aside className="summary-side">
          <article className="summary-side-panel">
            <header><span className="panel-icon"><Icon name="alert" size={18} /></span><div><p className="eyebrow">Cần xác minh</p><h3>Khoảng trống kỹ năng</h3></div></header>
            <div className="gap-ranking">
              {skillGaps.slice(0, 6).map((item, index) => <div key={item.name}><span><b>{index + 1}</b>{item.name}</span><strong>{item.count}/{matches.length}</strong></div>)}
              {!skillGaps.length && <p>Không có kỹ năng thiếu nổi bật trong nhóm ứng viên này.</p>}
            </div>
          </article>
          <article className="summary-side-panel next-step-panel">
            <header><span className="panel-icon"><Icon name="check" size={18} /></span><div><p className="eyebrow">Bước tiếp theo</p><h3>Chốt danh sách phỏng vấn</h3></div></header>
            <p>{counts.Shortlisted ? `Có ${counts.Shortlisted} ứng viên đã được shortlist. Hãy mở từng hồ sơ để rà lại bằng chứng và câu hỏi phỏng vấn.` : "Chưa có ứng viên được shortlist. Hãy xử lý các hồ sơ điểm cao trước."}</p>
            <button className="primary-action full" type="button" onClick={() => onOpenCandidate(sorted.find((item) => item.pipeline_status === "Shortlisted") || sorted[0])}>
              <Icon name="users" size={18} />{counts.Shortlisted ? "Rà lại danh sách shortlist" : "Xem ứng viên ưu tiên"}
            </button>
          </article>
        </aside>
      </div>
    </section>
  );
}

function SummaryKpi({ label, value, note, tone }) {
  return <article className={`summary-kpi ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function aggregateSkillGaps(matches) {
  const gaps = new Map();
  matches.forEach((item) => {
    uniqueList(item.missing_required_skills?.length ? item.missing_required_skills : item.missing_skills || [])
      .forEach((name) => gaps.set(name, (gaps.get(name) || 0) + 1));
  });
  return [...gaps.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function buildRecruitmentReportMarkup(job, matches, analytics) {
  const sorted = [...matches].sort((a, b) => scoreValue(b.final_score) - scoreValue(a.final_score));
  const counts = {
    shortlisted: matches.filter((item) => item.pipeline_status === "Shortlisted").length,
    reviewed: matches.filter((item) => item.pipeline_status === "Reviewed").length,
    rejected: matches.filter((item) => item.pipeline_status === "Rejected").length,
    pending: matches.filter((item) => !item.pipeline_status || item.pipeline_status === "New").length,
  };
  const processed = counts.shortlisted + counts.reviewed + counts.rejected;
  const average = Math.round(matches.reduce((total, item) => total + scoreValue(item.final_score), 0) / matches.length);
  const quality = analytics?.quality || {};
  const agreement = quality.feedback_count ? `${Math.round(Number(quality.good_match_rate || 0) * 100)}%` : "Chưa có";
  const gaps = aggregateSkillGaps(matches).slice(0, 8);
  const generatedAt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const rows = sorted.map((item, index) => {
    const missing = uniqueList(item.missing_required_skills?.length ? item.missing_required_skills : item.missing_skills || []).slice(0, 4);
    const matched = uniqueList(item.matched_skills || []).slice(0, 5);
    return `<tr>
      <td><b>${String(index + 1).padStart(2, "0")}</b></td>
      <td><strong>${escapeReportText(item.candidate_name || "Ứng viên")}</strong><small>${escapeReportText(item.candidate_email || item.filename || "Chưa có thông tin liên hệ")}</small><small>${escapeReportText(item.filename || "")}</small></td>
      <td>${escapeReportText(matched.join(", ") || "Chưa nhận diện")}</td>
      <td class="score">${scoreValue(item.final_score)}</td>
      <td>${escapeReportText(missing.join(", ") || "Đủ kỹ năng chính")}</td>
      <td><span class="pdf-status status-${escapeReportText(item.pipeline_status || "New")}">${escapeReportText(pipelineStatusLabel(item.pipeline_status))}</span></td>
    </tr>`;
  }).join("");
  const gapRows = gaps.map((item) => `<li><span>${escapeReportText(item.name)}</span><b>${item.count}/${matches.length} ứng viên thiếu</b></li>`).join("");

  return `<style>
    .pdf-report { width: 277mm; min-height: 180mm; padding: 4mm 2mm; background: #fff; color: #16211d; font: 11px/1.45 "Segoe UI", sans-serif; }
    .pdf-report * { box-sizing: border-box; }
    .pdf-report h1,.pdf-report h2,.pdf-report p { margin: 0; }
    .pdf-cover { padding-bottom: 7mm; border-bottom: 2px solid #108a60; }
    .pdf-brand { color: #108a60; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .pdf-cover h1 { margin-top: 2mm; font-size: 24px; line-height: 1.15; }
    .pdf-cover p { margin-top: 2mm; color: #66706c; }
    .pdf-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-top: 5mm; }
    .pdf-meta div { padding: 3mm; background: #f4f7f5; border-left: 3px solid #108a60; }
    .pdf-meta span,.pdf-kpi span { display: block; color: #66706c; font-size: 9px; }
    .pdf-kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 3mm; margin: 6mm 0; }
    .pdf-kpi { padding: 4mm 3mm; border: 1px solid #dde4df; border-top: 3px solid #29516d; }
    .pdf-kpi:nth-child(2) { border-top-color: #108a60; }.pdf-kpi:nth-child(3) { border-top-color: #c5872d; }.pdf-kpi:nth-child(4) { border-top-color: #6d61d8; }
    .pdf-kpi b { display: block; margin-top: 1mm; font-size: 19px; }
    .pdf-section { margin-top: 6mm; }
    .pdf-section h2 { margin-bottom: 3mm; font-size: 15px; }
    .pdf-table { width: 100%; border-collapse: collapse; }
    .pdf-table th { padding: 2.5mm; background: #eef2ef; color: #66706c; font-size: 8px; text-align: left; text-transform: uppercase; }
    .pdf-table tr { page-break-inside: avoid; }
    .pdf-table td { padding: 3mm 2.5mm; border-bottom: 1px solid #e2e7e3; vertical-align: top; }
    .pdf-table td:first-child { width: 9mm; color: #87928d; }.pdf-table td:nth-child(2) { width: 49mm; }
    .pdf-table td:nth-child(3) { width: 60mm; }.pdf-table td:nth-child(4) { width: 14mm; }.pdf-table td:nth-child(6) { width: 25mm; }
    .pdf-table small { display: block; margin-top: 1mm; color: #66706c; }.pdf-table .score { color: #108a60; font-size: 16px; font-weight: 800; }
    .pdf-status { display: inline-block; padding: 1.5mm 2.5mm; border-radius: 20px; background: #edf1ef; font-size: 9px; font-weight: 700; }
    .pdf-status.status-Shortlisted { background: #e2f6ef; color: #108a60; }.pdf-status.status-Rejected { background: #fff0ed; color: #c64d42; }
    .pdf-gaps { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 6mm; padding: 0; list-style: none; }
    .pdf-gaps li { display: flex; justify-content: space-between; gap: 3mm; padding: 2.5mm 0; border-bottom: 1px solid #e2e7e3; }
    .pdf-gaps b { color: #c5872d; font-size: 9px; }
    .pdf-note { margin-top: 7mm; padding: 4mm; border: 1px solid #cfe1da; background: #f3fbf7; color: #42514b; }
    .pdf-footer { margin-top: 6mm; color: #7b8581; font-size: 8px; text-align: right; }
  </style>
  <main class="pdf-report">
    <header class="pdf-cover">
      <div class="pdf-brand">TalentScan · Báo cáo tuyển dụng</div>
      <h1>${escapeReportText(job.title || "Vị trí tuyển dụng")}</h1>
      <p>${escapeReportText(job.company || "Chưa rõ công ty")} · Xuất lúc ${escapeReportText(generatedAt)}</p>
      <div class="pdf-meta"><div><span>Cấp bậc</span><b>${escapeReportText(job.level || "Chưa xác định")}</b></div><div><span>Quy mô đánh giá</span><b>${matches.length} hồ sơ</b></div></div>
    </header>
    <section class="pdf-kpis">
      <div class="pdf-kpi"><span>Điểm trung bình</span><b>${average}</b></div>
      <div class="pdf-kpi"><span>Đã xử lý</span><b>${processed}/${matches.length}</b></div>
      <div class="pdf-kpi"><span>Shortlist</span><b>${counts.shortlisted}</b></div>
      <div class="pdf-kpi"><span>HR đồng thuận</span><b>${agreement}</b></div>
    </section>
    <section class="pdf-section"><h2>Danh sách ứng viên · Sắp xếp theo điểm từ cao xuống thấp</h2><table class="pdf-table"><thead><tr><th>STT</th><th>Thông tin ứng viên</th><th>Kỹ năng nổi bật</th><th>Điểm</th><th>Kỹ năng cần xác minh</th><th>Trạng thái</th></tr></thead><tbody>${rows}</tbody></table></section>
    <section class="pdf-section"><h2>Khoảng trống kỹ năng nổi bật</h2><ul class="pdf-gaps">${gapRows || "<li>Không có kỹ năng thiếu nổi bật.</li>"}</ul></section>
    <aside class="pdf-note"><strong>Lưu ý khi ra quyết định:</strong> Điểm số là tín hiệu hỗ trợ. HR cần kiểm tra bằng chứng trong CV và kết quả phỏng vấn trước khi đưa ra quyết định cuối cùng.</aside>
    <footer class="pdf-footer">TalentScan · Báo cáo CV minh bạch</footer>
  </main>`;
}

function escapeReportText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function formatRequirementName(value) {
  return String(value || "").replace(/^Preferred\s+/i, "").replace(/^Required\s+/i, "").replace(/_/g, " ");
}

function PanelTitle({ icon, eyebrow, title }) {
  return <header className="panel-title"><span><Icon name={icon} size={18} /></span><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></header>;
}

function ScoreRing({ score, small = false }) {
  const value = scoreValue(score);
  return <div className={`score-ring ${small ? "small" : ""}`} style={{ "--score": `${value}%` }} title={`Điểm phù hợp ${value}/100`}><strong>{value}</strong>{!small && <span>phù hợp</span>}</div>;
}

function InsightBox({ tone, title, items, empty }) {
  const list = items.length ? items.slice(0, 4) : [empty];
  return <section className={`insight-box ${tone}`}><h3>{title}</h3><ul>{list.map((item) => <li key={item}><Icon name={tone === "good" ? "check" : "alert"} size={15} />{item}</li>)}</ul></section>;
}

function EmptyState({ icon, title, text, children }) {
  return <div className="empty-state"><Icon name={icon} size={34} /><strong>{title}</strong><span>{text}</span>{children}</div>;
}

function RawViewer({ viewer, onClose }) {
  if (!viewer) return null;
  return <div className="modal-backdrop" onClick={onClose} role="presentation"><section className="raw-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={viewer.title}><header><strong>{viewer.title}</strong><button type="button" onClick={onClose} aria-label="Đóng"><Icon name="close" size={18} /></button></header><pre>{viewer.loading ? "Đang tải..." : viewer.text}</pre></section></div>;
}

function parsedToText(data = {}) {
  const section = (label, value) => {
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    return rows.length ? `${label}:\n${rows.map((item) => `  - ${item}`).join("\n")}\n\n` : "";
  };
  return [
    data.candidate_name ? `Ứng viên: ${data.candidate_name}\n\n` : "",
    data.summary ? `Tóm tắt: ${data.summary}\n\n` : "",
    section("Kỹ năng", data.skills),
    section("Kinh nghiệm", data.experience),
    section("Dự án", data.projects),
    section("Học vấn", data.education),
    section("Chứng chỉ", data.certifications),
    section("Ngôn ngữ", data.languages),
  ].join("") || "(Chưa trích xuất được dữ liệu từ CV này.)";
}

function scoreValue(value) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
}
