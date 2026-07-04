import { useCallback, useEffect, useMemo, useState } from "react";
import { createJob, getCv, getCvs, getJobMatches, getJobs, getMatchJob, getRecruitmentAnalytics, seedDemoData, startMatchJob, submitMatchFeedback, updateMatchStatus, uploadCv } from "./api/cvmatchService";

const paths = {
  grid: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"],
  briefcase: ["M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2", "M3 6h18v14H3z", "M3 11h18"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10", "m9 12 2 2 4-4"],
  upload: ["M12 16V4", "m7 9 5-5 5 5", "M5 20h14"],
  spark: ["m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z"],
  search: ["m21 21-4.35-4.35", "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14"],
  doc: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M9 13h6", "M9 17h6"],
  check: ["m5 12 4 4L19 6"], alert: ["M12 9v4", "M12 17h.01", "M10.3 3.7 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0z"],
};
function Icon({ name, size = 20 }) { return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{(paths[name] || paths.grid).map((d) => <path d={d} key={d} />)}</svg>; }
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const messageOf = (error) => error?.response?.data?.detail || error?.message || "Không thể hoàn tất thao tác.";

const SCORE_INFO = {
  rule: { label: "Khớp yêu cầu", help: "Ứng viên đáp ứng bao nhiêu % yêu cầu trong JD (kỹ năng bắt buộc/ưu tiên, kinh nghiệm, học vấn)." },
  semantic: { label: "Giống nội dung JD", help: "Nội dung CV gần nghĩa với JD đến mức nào — AI hiểu từ đồng nghĩa, nên 'ReactJS' vẫn khớp 'React'." },
  ml: { label: "Điểm AI", help: "AI dự đoán dựa trên các quyết định shortlist/loại trước đây của bạn. Dùng càng nhiều càng hợp gu tuyển." },
  confidence: { label: "Độ tin cậy", help: "CV có đầy đủ thông tin, bằng chứng rõ không. Thấp = nên kiểm tra tay, không có nghĩa ứng viên kém." },
};

const VIEW_HEADERS = {
  jobs: { eyebrow: "Bước 1 · Vị trí tuyển dụng", title: "Tạo và quản lý JD." },
  cvs: { eyebrow: "Bước 2 · Kho ứng viên", title: "Thêm CV, xem hồ sơ." },
  match: { eyebrow: "Bước 3–4 · Xếp hạng & quyết định", title: "Tìm ứng viên phù hợp nhất." },
  insights: { eyebrow: "Giám sát", title: "AI có công bằng, chính xác không?" },
};

export default function App() {
  const [jobs, setJobs] = useState([]), [cvs, setCvs] = useState([]), [matches, setMatches] = useState([]);
  const [jobId, setJobId] = useState(""), [match, setMatch] = useState(null), [analytics, setAnalytics] = useState(null);
  const [matchJob, setMatchJob] = useState(null), [jd, setJd] = useState(""), [filter, setFilter] = useState("");
  const [working, setWorking] = useState(""), [notice, setNotice] = useState({ type: "", text: "" });
  const [view, setView] = useState(null);
  const [viewer, setViewer] = useState(null);

  const job = jobs.find((item) => item.id === jobId);
  const visible = useMemo(() => matches.filter((item) => !filter || `${item.candidate_name} ${(item.matched_skills || []).join(" ")}`.toLowerCase().includes(filter.toLowerCase())), [matches, filter]);
  const loadMatches = useCallback(async (id) => { if (!id) { setMatches([]); setMatch(null); return; } const data = await getJobMatches(id); setMatches(data); setMatch((old) => data.find((x) => x.id === old?.id) || data[0] || null); }, []);
  const refresh = useCallback(async () => {
    setWorking("loading");
    try {
      const [j, c, a] = await Promise.all([getJobs(), getCvs(), getRecruitmentAnalytics()]);
      setJobs(j); setCvs(c); setAnalytics(a);
      const id = jobId || j[0]?.id || ""; setJobId(id); await loadMatches(id);
      setView((current) => current ?? (j.length ? (c.length ? "match" : "cvs") : "jobs"));
    } catch (error) { setNotice({ type: "error", text: messageOf(error) }); } finally { setWorking(""); }
  }, [jobId, loadMatches]);
  useEffect(() => { const timer = window.setTimeout(() => refresh(), 0); return () => window.clearTimeout(timer); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const step = jobs.length === 0 ? 1 : cvs.length === 0 ? 2 : matches.length === 0 ? 3 : 4;
  const isEmptyWorkspace = jobs.length === 0 && cvs.length === 0;

  async function runMatch() {
    setWorking("matching"); setNotice({ type: "", text: "" });
    try { let task = await startMatchJob(jobId, { top_k: 1000 }); setMatchJob(task); for (let i = 0; i < 60 && !["completed", "failed"].includes(task.status); i += 1) { await sleep(650); task = await getMatchJob(task.id); setMatchJob(task); } if (task.status !== "completed") throw new Error(task.error || "Xếp hạng chưa hoàn tất."); await loadMatches(jobId); setAnalytics(await getRecruitmentAnalytics()); setNotice({ type: "success", text: `Đã xếp hạng ${task.result_count} ứng viên. Bấm vào từng người để xem lý do — bạn là người quyết định cuối.` }); }
    catch (error) { setNotice({ type: "error", text: messageOf(error) }); } finally { setWorking(""); }
  }
  async function addJob(event) {
    event.preventDefault(); setWorking("job");
    try {
      const created = await createJob({ raw_text: jd });
      setJobs((x) => [created, ...x]); setJobId(created.id); setJd(""); await loadMatches(created.id);
      if (cvs.length) { setView("match"); setNotice({ type: "success", text: `Đã tạo vị trí "${created.title}". Bấm "Tìm ứng viên phù hợp" để xếp hạng.` }); }
      else { setView("cvs"); setNotice({ type: "success", text: `Đã tạo vị trí "${created.title}". Bước tiếp theo: thêm CV ứng viên.` }); }
    } catch (error) { setNotice({ type: "error", text: messageOf(error) }); } finally { setWorking(""); }
  }
  async function addCvs(event) {
    const files = [...(event.target.files || [])]; event.target.value = ""; if (!files.length) return; setWorking("upload");
    try { await Promise.all(files.map(uploadCv)); setCvs(await getCvs()); setNotice({ type: "success", text: `Đã thêm ${files.length} CV (tự động đọc nội dung & ẩn thông tin cá nhân).${jobs.length ? " Sang mục Xếp hạng để tìm người phù hợp." : " Bước tiếp theo: tạo vị trí (JD)."}` }); }
    catch (error) { setNotice({ type: "error", text: messageOf(error) }); } finally { setWorking(""); }
  }
  async function feedback(verdict) { if (!match) return; setWorking("feedback"); try { await submitMatchFeedback(match.id, { verdict, reason: "HR review workspace" }); await sleep(500); setAnalytics(await getRecruitmentAnalytics()); setNotice({ type: "success", text: "Đã ghi nhận. AI sẽ dùng phản hồi này để xếp hạng chính xác hơn." }); } catch (error) { setNotice({ type: "error", text: messageOf(error) }); } finally { setWorking(""); } }
  async function pipeline(status) { const updated = await updateMatchStatus(match.id, { pipeline_status: status, note: match.note || "" }); setMatch(updated); setMatches((x) => x.map((item) => item.id === updated.id ? updated : item)); await sleep(500); setAnalytics(await getRecruitmentAnalytics()); }
  async function demo() { setWorking("demo"); try { await seedDemoData(); setView("match"); await refresh(); } finally { setWorking(""); } }

  async function openCvOriginal(cvId, name) {
    setViewer({ title: `CV gốc · ${name || ""}`, loading: true });
    try { const full = await getCv(cvId); setViewer({ title: `CV gốc · ${full.extracted_data?.candidate_name || name || ""}`, text: full.raw_text || "(CV này không trích được văn bản)" }); }
    catch (error) { setViewer({ title: "CV gốc", text: messageOf(error) }); }
  }
  const openJdOriginal = (item) => setViewer({ title: `JD gốc · ${item.title}`, text: item.raw_text || "(Không có nội dung gốc)" });
  const openCvParsed = (cv) => setViewer({ title: `Hồ sơ trích xuất · ${cv.extracted_data?.candidate_name || cv.filename}`, text: parsedToText(cv.extracted_data) });

  const pickJobForMatching = (id) => { setJobId(id); loadMatches(id); setView("match"); };
  const goStep = (n) => setView(n === 1 ? "jobs" : n === 2 ? "cvs" : "match");
  const NAV = [
    { key: "jobs", icon: "briefcase", label: "Vị trí (JD)", count: jobs.length },
    { key: "cvs", icon: "users", label: "Ứng viên (CV)", count: cvs.length },
    { key: "match", icon: "spark", label: "Xếp hạng", count: matches.length },
    { key: "insights", icon: "shield", label: "Công bằng & AI" },
  ];
  const header = VIEW_HEADERS[view] || VIEW_HEADERS.match;

  return <div className="app-frame">
    <aside className="sidebar" data-ai-id="primary-navigation">
      <div className="brand"><span><Icon name="spark" /></span><div><strong>Lattice</strong><small>Talent intelligence</small></div></div>
      <nav>{NAV.map((item) => <a key={item.key} className={view === item.key ? "active" : ""} href={`#${item.key}`} onClick={(e) => { e.preventDefault(); setView(item.key); }}><Icon name={item.icon} />{item.label} {item.count != null && <b>{item.count}</b>}</a>)}</nav>
      <div className="privacy-note"><Icon name="shield" /><div><strong>PII shield active</strong><span>Thông tin cá nhân không đi vào chấm điểm.</span></div></div>
      <button className="quiet-button" onClick={demo} disabled={Boolean(working)}>Nạp dữ liệu mẫu</button>
    </aside>
    <main id="workspace" data-ai-id="recruitment-workbench">
      <header className="command-bar">
        <div><p className="eyebrow">{header.eyebrow}</p><h1>{header.title}</h1><Stepper step={step} onGo={goStep} /></div>
        {view === "match" && <div className="command-actions"><label>Vị trí đang đánh giá<select value={jobId} onChange={(e) => { setJobId(e.target.value); loadMatches(e.target.value); }}><option value="">Chọn JD</option>{jobs.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.company || "Chưa rõ công ty"}</option>)}</select></label><button className="primary-button" onClick={runMatch} disabled={!jobId || !cvs.length || working === "matching"} title={!jobId ? "Chọn một vị trí (JD) trước" : !cvs.length ? "Cần thêm ít nhất 1 CV trước" : "Xếp hạng toàn bộ CV theo JD đang chọn"}><Icon name="spark" />{working === "matching" ? "Đang xếp hạng…" : "Tìm ứng viên phù hợp"}</button></div>}
      </header>
      {isEmptyWorkspace && <section style={{ border: "1px dashed rgba(124,92,255,.5)", borderRadius: 14, padding: "16px 18px", margin: "14px 0 0", background: "rgba(124,92,255,.06)" }}>
        <strong style={{ display: "block", marginBottom: 4 }}>👋 Bạn mới dùng Lattice?</strong>
        <span style={{ fontSize: 13, opacity: 0.8 }}>Quy trình 4 bước: tạo vị trí (JD) → thêm CV → bấm xếp hạng → duyệt kết quả kèm bằng chứng. Cách nhanh nhất để hiểu là xem thử:</span>
        <div style={{ marginTop: 10 }}><button className="primary-button" onClick={demo} disabled={Boolean(working)}>{working === "demo" ? "Đang nạp…" : "Nạp dữ liệu mẫu & xem thử"}</button></div>
      </section>}
      {notice.text && <div className={`notice ${notice.type}`} role="status"><Icon name={notice.type === "error" ? "alert" : "check"} />{notice.text}</div>}

      {view === "jobs" && <section style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 18, alignItems: "start", marginTop: 16 }}>
        <aside className="intake-panel"><Heading index="Tạo mới" title="Dán tin tuyển dụng" />
          <form onSubmit={addJob}><label>Nội dung JD<textarea rows="12" value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Dán toàn bộ tin tuyển dụng vào đây — hệ thống tự trích kỹ năng, cấp bậc, yêu cầu…" /></label><button className="secondary-button" disabled={!jd.trim() || working === "job"}>{working === "job" ? "Đang xử lý…" : "Lưu vị trí tuyển dụng"}</button></form>
        </aside>
        <section className="ranking-panel"><Heading index={`${jobs.length} vị trí`} title="Danh sách vị trí" />
          <div style={{ display: "grid", gap: 10 }}>
            {!jobs.length && <Empty icon="briefcase" title="Chưa có vị trí nào" text="Dán JD vào ô bên trái để bắt đầu, hoặc bấm 'Nạp dữ liệu mẫu'." />}
            {jobs.map((item) => <article key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(120,120,160,.08)", flexWrap: "wrap" }}>
              <div style={{ minWidth: 200 }}>
                <strong>{item.title}</strong><span style={{ opacity: 0.6, fontSize: 13 }}> · {item.company || "Chưa rõ công ty"} · {item.level || "?"}</span>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 3 }}>Kỹ năng bắt buộc: {(item.required_skills || []).slice(0, 6).join(", ") || "—"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="quiet-button" onClick={() => openJdOriginal(item)} title="Xem nguyên văn JD đã dán"><Icon name="doc" size={15} /> JD gốc</button>
                <button className="secondary-button" onClick={() => pickJobForMatching(item.id)} title="Chuyển sang màn hình xếp hạng với vị trí này">Xếp hạng vị trí này →</button>
              </div>
            </article>)}
          </div>
        </section>
      </section>}

      {view === "cvs" && <section style={{ marginTop: 16 }}>
        <label className="upload-zone"><input type="file" accept="application/pdf" multiple onChange={addCvs} /><Icon name="upload" size={24} /><strong>{working === "upload" ? "Đang đọc CV…" : "Thêm CV (PDF, chọn được nhiều file)"}</strong><span>Tự động đọc nội dung & ẩn thông tin cá nhân trước khi chấm điểm</span></label>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {!cvs.length && <Empty icon="users" title="Kho ứng viên trống" text="Kéo-thả hoặc bấm vào ô phía trên để thêm CV PDF." />}
          {cvs.map((cv) => <article key={cv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(120,120,160,.08)", flexWrap: "wrap" }}>
            <div style={{ minWidth: 200 }}>
              <strong>{cv.extracted_data?.candidate_name || cv.filename}</strong>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 3 }}>{(cv.extracted_data?.skills || []).slice(0, 7).join(", ") || "Chưa nhận diện được kỹ năng"}</div>
              <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{cv.filename} · {cv.pii_masking?.status === "masked" ? "Đã ẩn thông tin cá nhân ✓" : "Đang chờ xử lý"}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="quiet-button" onClick={() => openCvOriginal(cv.id, cv.extracted_data?.candidate_name)} title="Xem nguyên văn nội dung CV"><Icon name="doc" size={15} /> CV gốc</button>
              <button className="quiet-button" onClick={() => openCvParsed(cv)} title="Xem dữ liệu hệ thống đã trích từ CV">Bản trích xuất</button>
            </div>
          </article>)}
        </div>
      </section>}

      {view === "match" && <>
        {matchJob && working === "matching" && <section className="pipeline-card"><div><span className="live-dot" /><strong>Đang xử lý…</strong><small>Tìm ứng viên → Chấm điểm → AI xếp hạng → Kiểm tra công bằng</small></div><div className="progress"><span style={{ width: `${matchJob?.progress || 0}%` }} /></div><b>{matchJob?.progress || 0}%</b></section>}
        <section style={{ display: "grid", gridTemplateColumns: "minmax(330px, 1.05fr) minmax(320px, 0.95fr)", gap: 18, alignItems: "start", marginTop: 14 }}>
          <section className="ranking-panel" id="candidates">
            <div className="panel-heading"><div><p className="eyebrow">Bảng xếp hạng</p><h2>{job?.title || "Chọn một vị trí"}</h2></div><label className="search-field"><Icon name="search" size={18} /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Lọc tên hoặc kỹ năng" /></label></div>
            <div className="score-legend"><span title={SCORE_INFO.rule.help}>{SCORE_INFO.rule.label}</span><span title={SCORE_INFO.semantic.help}>{SCORE_INFO.semantic.label}</span><span title={SCORE_INFO.ml.help}>{SCORE_INFO.ml.label}</span><span title={SCORE_INFO.confidence.help}>{SCORE_INFO.confidence.label}</span></div>
            <div className="candidate-list">
              {!visible.length && <Empty icon="users" title="Chưa có bảng xếp hạng" text={step <= 2 ? "Cần có vị trí (bước 1) và CV (bước 2) trước — dùng thanh bước phía trên." : "Bấm 'Tìm ứng viên phù hợp' ở góc trên phải."} />}
              {visible.map((x, i) => <button key={x.id} className={`candidate-row ${match?.id === x.id ? "selected" : ""}`} onClick={() => setMatch(x)}>
                <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                <div className="candidate-copy"><strong>{x.candidate_name}</strong><small>{x.matched_skills?.slice(0, 3).join(" · ") || "Chưa có kỹ năng khớp"}</small><div className="micro-scores">{[x.rule_score, x.semantic_score, x.ml_rank_score, x.confidence_score].map((n, k) => <i key={k} style={{ width: `${n || 0}%` }} />)}</div></div>
                <div className="final-score"><strong>{x.final_score}</strong><small>/100</small></div>
              </button>)}
            </div>
          </section>
          <aside className="detail-panel">{!match ? <Empty icon="search" title="Chọn một ứng viên" text="Bấm vào một người ở bảng xếp hạng để xem điểm, bằng chứng từ CV và ra quyết định." /> : <>
            <div className="detail-hero"><div><p className="eyebrow">Hồ sơ ứng viên</p><h2>{match.candidate_name}</h2><span>{match.recruiter_priority || "Cần xem xét"}</span></div><div className="score-orbit" title="Điểm tổng hợp để gợi ý thứ tự xem — KHÔNG tự loại ai"><strong>{match.final_score}</strong><small>gợi ý</small></div></div>
            <div style={{ display: "flex", gap: 8, margin: "2px 0 10px" }}>
              <button className="quiet-button" onClick={() => openCvOriginal(match.cv_id, match.candidate_name)}><Icon name="doc" size={15} /> Xem CV gốc</button>
              {job && <button className="quiet-button" onClick={() => openJdOriginal(job)}><Icon name="doc" size={15} /> Xem JD gốc</button>}
            </div>
            <div className="score-quartet"><Score label={SCORE_INFO.rule.label} value={match.rule_score} help={SCORE_INFO.rule.help} /><Score label={SCORE_INFO.semantic.label} value={match.semantic_score} help={SCORE_INFO.semantic.help} /><Score label={SCORE_INFO.ml.label} value={match.ml_rank_score} help={SCORE_INFO.ml.help} /><Score label={SCORE_INFO.confidence.label} value={match.confidence_score} help={SCORE_INFO.confidence.help} /></div>
            {(match.fairness_flags || []).length > 0 && <div style={{ display: "grid", gap: 6, margin: "4px 0 10px" }}>{match.fairness_flags.map((f, i) => <div key={i} style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8, background: "rgba(255,90,90,.10)", color: "#c53" }}>⚑ {f.signal === "gap_year" ? "CV có quãng nghỉ sự nghiệp — đừng để điều này bất lợi cho ứng viên." : f.signal === "school_prestige" ? "Có tín hiệu 'trường danh tiếng' — đừng để điều này nâng điểm bất công." : f.note}</div>)}</div>}
            {match.decision_support?.needs_verification && <div className="verification"><Icon name="alert" /><span><strong>Cần xác minh</strong>Thiếu bằng chứng không đồng nghĩa thiếu năng lực — hãy hỏi ứng viên.</span></div>}
            <Detail title="Bằng chứng từ CV">{(match.evidence || []).slice(0, 4).map((e, i) => <article className="evidence" key={i}><Icon name={e.cv_evidence ? "check" : "alert"} size={16} /><div><strong>{e.requirement}</strong><p>{e.cv_evidence || "Không có bằng chứng trực tiếp — nên hỏi lại ứng viên."}</p></div></article>)}</Detail>
            <Detail title="Câu hỏi phỏng vấn gợi ý">{(match.interview_questions || []).slice(0, 3).map((q) => <article className="question" key={q.question}><span>{q.focus}</span><p>{q.question}</p></article>)}</Detail>
            <div className="review-actions"><button onClick={() => pipeline("Shortlisted")} title="Chọn ứng viên này vào vòng sau">✓ Shortlist</button><button onClick={() => pipeline("Reviewed")} title="Đánh dấu đã xem, chưa quyết">Đã xem</button><button onClick={() => pipeline("Rejected")} title="Loại khỏi vị trí này (AI sẽ học từ quyết định của bạn)" style={{ color: "#c53" }}>Loại</button></div>
            <div className="feedback-row"><span title="Phản hồi giúp AI xếp hạng chính xác hơn ở các lần sau">AI đánh giá có đúng không?</span><button onClick={() => feedback("good_match")}>Đúng</button><button onClick={() => feedback("explanation_incorrect")}>Chưa đúng</button></div>
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.6 }}>Chi tiết kỹ thuật (cách hệ thống tính)</summary>
              <div style={{ fontSize: 12, opacity: 0.75, display: "grid", gap: 4, marginTop: 6 }}>
                <span>• Nguồn Điểm AI: {(match.ml_rank_source || "").startsWith("learned") ? "model đã học từ phản hồi của đội bạn" : "công thức mặc định (chưa đủ phản hồi để học)"}</span>
                <span>• So khớp nội dung: {match.retrieval?.semantic_source === "embedding" ? "AI ngữ nghĩa (embedding)" : "trùng từ khóa đơn giản"}</span>
                <span>• Cách tìm ứng viên: {match.retrieval?.strategy === "vector_keyword_hybrid" ? "kết hợp AI ngữ nghĩa + từ khóa" : "lọc theo từ khóa"}</span>
              </div>
            </details>
          </>}</aside>
        </section>
      </>}

      {view === "insights" && <section className="insight-grid" id="fairness" style={{ marginTop: 16 }}>
        <article className="fairness-card"><Heading index="Công bằng" title="Không tự động loại ai." /><div className="fairness-stats"><Score label="PII dùng chấm điểm" value={analytics?.fairness?.ranking_uses_pii ? "Có" : "Không"} /><Score label="Hồ sơ bị cảnh báo" value={analytics?.fairness?.fairness_flagged_matches ?? 0} /><Score label="Tự động loại" value={analytics?.fairness?.automatic_rejection_enabled ? "Bật" : "Tắt"} /></div>
          {(analytics?.fairness?.alerts || []).map((a, i) => <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,90,90,.12)", color: "#c53", borderRadius: 8, padding: "8px 10px", marginTop: 8, fontSize: 13 }}><Icon name="alert" size={16} />{a}</div>)}
          <DisparateImpact dims={analytics?.fairness?.group_fairness?.dimensions} />
          <p>{analytics?.fairness?.notice}</p>
        </article>
        <article className="gaps-card"><Heading index="Chất lượng gợi ý" title="AI học từ phản hồi" />
          <div className="fairness-stats"><Score label="NDCG@5" value={analytics?.rankingEval?.ndcg_at_5 ?? "—"} help="Thước đo chất lượng thứ tự xếp hạng (1.0 = hoàn hảo so với quyết định của bạn)" /><Score label="MAP" value={analytics?.rankingEval?.map ?? "—"} help="Độ chính xác trung bình của các ứng viên được chọn" /><Score label="Nguồn xếp hạng" value={analytics?.rankingEval?.active_model ? "Đã học" : "Mặc định"} /></div>
          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Hệ thống tự học từ shortlist/loại/phản hồi của bạn sau mỗi lượt — không cần thao tác gì. {analytics?.rankingEval?.active_model ? "Đang dùng model đã học từ đội của bạn." : "Sẽ tự kích hoạt khi đủ dữ liệu phản hồi."}</p>
          <div className="divider" style={{ margin: "14px 0 10px" }}><span>Kỹ năng thị trường đang thiếu</span></div>
          <div className="gap-cloud">{(analytics?.skills?.top_gaps || []).slice(0, 6).map((x) => <span key={x.skill}>{x.skill}<b>{x.count}</b></span>)}</div>
        </article>
      </section>}
    </main>
    <RawViewer viewer={viewer} onClose={() => setViewer(null)} />
  </div>;
}

function parsedToText(d = {}) {
  const section = (label, value) => value && value.length ? `${label}:\n${(Array.isArray(value) ? value : [value]).map((x) => "  • " + x).join("\n")}\n\n` : "";
  return [
    d.candidate_name ? `Ứng viên: ${d.candidate_name}\n\n` : "",
    d.summary ? `Tóm tắt: ${d.summary}\n\n` : "",
    section("Kỹ năng", d.skills), section("Kinh nghiệm", d.experience), section("Dự án", d.projects),
    section("Học vấn", d.education), section("Chứng chỉ", d.certifications), section("Ngôn ngữ", d.languages),
  ].join("") || "(Chưa trích xuất được dữ liệu từ CV này)";
}

function RawViewer({ viewer, onClose }) {
  if (!viewer) return null;
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 60, display: "grid", placeItems: "center", padding: 20 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: "min(720px, 100%)", maxHeight: "82vh", display: "flex", flexDirection: "column", background: "#15151f", color: "#e8e8f0", borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 18px 60px rgba(0,0,0,.5)" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <strong>{viewer.title}</strong>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.08)", color: "inherit", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Đóng ✕</button>
      </header>
      <pre style={{ margin: 0, padding: 16, overflow: "auto", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55, fontFamily: "inherit" }}>{viewer.loading ? "Đang tải…" : viewer.text}</pre>
    </div>
  </div>;
}

function Stepper({ step, onGo }) {
  const items = ["Tạo vị trí (JD)", "Thêm CV ứng viên", "Chạy xếp hạng", "Duyệt & quyết định"];
  return <ol style={{ display: "flex", gap: 10, listStyle: "none", padding: 0, margin: "10px 0 0", flexWrap: "wrap" }}>
    {items.map((title, i) => {
      const n = i + 1, active = n === step, done = n < step;
      return <li key={title} onClick={() => onGo?.(n)} title="Bấm để chuyển tới bước này" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, opacity: done || active ? 1 : 0.45, cursor: "pointer" }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, background: done ? "rgba(80,200,120,.25)" : active ? "rgba(124,92,255,.3)" : "rgba(120,120,160,.15)" }}>{done ? "✓" : n}</span>
        <span style={{ fontWeight: active ? 700 : 500 }}>{title}</span>
        {i < items.length - 1 && <span style={{ opacity: 0.4 }}>→</span>}
      </li>;
    })}
  </ol>;
}

function DisparateImpact({ dims }) {
  const entries = Object.entries(dims || {}).filter(([, v]) => v.disparate_impact !== null && v.disparate_impact !== undefined);
  if (!entries.length) return null;
  const dimName = (d) => ({ school_tier: "Nhóm trường", region: "Vùng miền" }[d] || d.replace("inferred_", "").replace("_", " "));
  return <div style={{ marginTop: 10, display: "grid", gap: 6 }} title="Tỷ lệ được chọn của nhóm thấp nhất chia nhóm cao nhất. Dưới 0.8 (quy tắc 4/5) là dấu hiệu thiên vị cần xem lại.">{entries.map(([dim, info]) => <div key={dim} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px", borderRadius: 8, background: info.disparate_impact < 0.8 ? "rgba(255,90,90,.10)" : "rgba(120,120,160,.10)" }}><span>{dimName(dim)}</span><b style={{ color: info.disparate_impact < 0.8 ? "#c53" : "inherit" }}>Cân bằng {info.disparate_impact}{info.disparate_impact < 0.8 ? " ⚠ cần xem lại" : ""}</b></div>)}</div>;
}

function Heading({ index, title }) { return <div className="panel-heading"><div><p className="eyebrow">{index}</p><h2>{title}</h2></div></div>; }
function Score({ label, value = 0, help }) { return <div title={help} style={help ? { cursor: "help" } : undefined}><span>{label}</span><strong>{value}</strong></div>; }
function Detail({ title, children }) { return <section className="detail-section"><h3>{title}</h3>{children}</section>; }
function Empty({ icon, title, text }) { return <div className="empty-state"><Icon name={icon} size={32} /><strong>{title}</strong><span>{text}</span></div>; }
