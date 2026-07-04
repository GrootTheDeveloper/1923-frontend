import { useCallback, useEffect, useMemo, useState } from "react";
import { createJob, getCvs, getJobMatches, getJobs, getMatchJob, getRecruitmentAnalytics, seedDemoData, startMatchJob, submitMatchFeedback, updateMatchStatus, uploadCv } from "./api/cvmatchService";

const paths = {
  grid: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"],
  briefcase: ["M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2", "M3 6h18v14H3z", "M3 11h18"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10", "m9 12 2 2 4-4"],
  upload: ["M12 16V4", "m7 9 5-5 5 5", "M5 20h14"],
  spark: ["m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z"],
  search: ["m21 21-4.35-4.35", "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14"],
  check: ["m5 12 4 4L19 6"], alert: ["M12 9v4", "M12 17h.01", "M10.3 3.7 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0z"],
};
function Icon({ name, size = 20 }) { return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{(paths[name] || paths.grid).map((d) => <path d={d} key={d} />)}</svg>; }
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const messageOf = (error) => error?.response?.data?.detail || error?.message || "Không thể hoàn tất thao tác.";

export default function App() {
  const [jobs, setJobs] = useState([]), [cvs, setCvs] = useState([]), [matches, setMatches] = useState([]);
  const [jobId, setJobId] = useState(""), [match, setMatch] = useState(null), [analytics, setAnalytics] = useState(null);
  const [matchJob, setMatchJob] = useState(null), [jd, setJd] = useState(""), [filter, setFilter] = useState("");
  const [working, setWorking] = useState(""), [notice, setNotice] = useState({ type: "", text: "" });
  const job = jobs.find((item) => item.id === jobId);
  const visible = useMemo(() => matches.filter((item) => !filter || `${item.candidate_name} ${(item.matched_skills || []).join(" ")}`.toLowerCase().includes(filter.toLowerCase())), [matches, filter]);
  const loadMatches = useCallback(async (id) => { if (!id) return; const data = await getJobMatches(id); setMatches(data); setMatch((old) => data.find((x) => x.id === old?.id) || data[0] || null); }, []);
  const refresh = useCallback(async () => {
    setWorking("loading");
    try { const [j, c, a] = await Promise.all([getJobs(), getCvs(), getRecruitmentAnalytics()]); setJobs(j); setCvs(c); setAnalytics(a); const id = jobId || j[0]?.id || ""; setJobId(id); await loadMatches(id); }
    catch (error) { setNotice({ type: "error", text: messageOf(error) }); } finally { setWorking(""); }
  }, [jobId, loadMatches]);
  useEffect(() => { const timer = window.setTimeout(() => refresh(), 0); return () => window.clearTimeout(timer); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runMatch() {
    setWorking("matching"); setNotice({ type: "", text: "" });
    try { let task = await startMatchJob(jobId, { top_k: 1000 }); setMatchJob(task); for (let i = 0; i < 60 && !["completed", "failed"].includes(task.status); i += 1) { await sleep(650); task = await getMatchJob(task.id); setMatchJob(task); } if (task.status !== "completed") throw new Error(task.error || "Matching job chưa hoàn tất."); await loadMatches(jobId); setAnalytics(await getRecruitmentAnalytics()); setNotice({ type: "success", text: `Đã xếp hạng ${task.result_count} ứng viên. HR vẫn là người quyết định.` }); }
    catch (error) { setNotice({ type: "error", text: messageOf(error) }); } finally { setWorking(""); }
  }
  async function addJob(event) { event.preventDefault(); setWorking("job"); try { const created = await createJob({ raw_text: jd }); setJobs((x) => [created, ...x]); setJobId(created.id); setJd(""); setMatches([]); setMatch(null); setNotice({ type: "success", text: "JD đã được cấu trúc hóa. Hãy kiểm tra tiêu chí trước khi matching." }); } catch (error) { setNotice({ type: "error", text: messageOf(error) }); } finally { setWorking(""); } }
  async function addCvs(event) { const files = [...(event.target.files || [])]; event.target.value = ""; if (!files.length) return; setWorking("upload"); try { await Promise.all(files.map(uploadCv)); setCvs(await getCvs()); setNotice({ type: "success", text: `${files.length} CV đã được parse, mask PII và index.` }); } catch (error) { setNotice({ type: "error", text: messageOf(error) }); } finally { setWorking(""); } }
  async function feedback(verdict) { if (!match) return; setWorking("feedback"); try { await submitMatchFeedback(match.id, { verdict, reason: "HR review workspace" }); await sleep(500); setAnalytics(await getRecruitmentAnalytics()); setNotice({ type: "success", text: "Feedback đã vào audit trail; AI tự học lại từ nhãn mới." }); } catch (error) { setNotice({ type: "error", text: messageOf(error) }); } finally { setWorking(""); } }
  async function pipeline(status) { const updated = await updateMatchStatus(match.id, { pipeline_status: status, note: match.note || "" }); setMatch(updated); setMatches((x) => x.map((item) => item.id === updated.id ? updated : item)); await sleep(500); setAnalytics(await getRecruitmentAnalytics()); }
  async function demo() { setWorking("demo"); try { await seedDemoData(); await refresh(); } finally { setWorking(""); } }
  const confidence = matches.length ? Math.round(matches.reduce((sum, x) => sum + (x.confidence_score || 0), 0) / matches.length) : 0;
  // Guided flow for first-time users: which step are they on?
  const step = jobs.length === 0 ? 1 : cvs.length === 0 ? 2 : matches.length === 0 ? 3 : 4;
  const isEmptyWorkspace = jobs.length === 0 && cvs.length === 0;

  return <div className="app-frame">
    <aside className="sidebar" data-ai-id="primary-navigation">
      <div className="brand"><span><Icon name="spark" /></span><div><strong>Lattice</strong><small>Talent intelligence</small></div></div>
      <nav><a className="active" href="#workspace"><Icon name="grid" />Workbench</a><a href="#candidates"><Icon name="users" />Ứng viên <b>{cvs.length}</b></a><a href="#jobs"><Icon name="briefcase" />Vị trí <b>{jobs.length}</b></a><a href="#fairness"><Icon name="shield" />Fairness</a></nav>
      <div className="privacy-note"><Icon name="shield" /><div><strong>PII shield active</strong><span>Dữ liệu nhạy cảm không đi vào ranking.</span></div></div>
      <button className="quiet-button" onClick={demo} disabled={Boolean(working)}>Nạp dữ liệu mẫu</button>
    </aside>
    <main id="workspace" data-ai-id="recruitment-workbench">
      <header className="command-bar"><div><p className="eyebrow">Recruitment workbench</p><h1>Tuyển đúng người trong 4 bước.</h1><Stepper step={step} /></div><div className="command-actions"><label>Vị trí đang đánh giá<select value={jobId} onChange={(e) => { setJobId(e.target.value); loadMatches(e.target.value); }}><option value="">Chọn JD</option>{jobs.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.company || "Chưa rõ công ty"}</option>)}</select></label><button className="primary-button" onClick={runMatch} disabled={!jobId || !cvs.length || working === "matching"} title={!jobId ? "Chọn một vị trí (JD) trước" : !cvs.length ? "Cần import ít nhất 1 CV trước" : "Xếp hạng toàn bộ CV theo JD đang chọn"}><Icon name="spark" />{working === "matching" ? "Đang xếp hạng…" : "Tìm ứng viên phù hợp"}</button></div></header>
      {isEmptyWorkspace && <section style={{ border: "1px dashed rgba(124,92,255,.5)", borderRadius: 14, padding: "16px 18px", margin: "14px 0 0", background: "rgba(124,92,255,.06)" }}>
        <strong style={{ display: "block", marginBottom: 4 }}>👋 Bạn mới dùng Lattice?</strong>
        <span style={{ fontSize: 13, opacity: 0.8 }}>Hệ thống giúp bạn tìm ứng viên hợp với tin tuyển dụng: dán JD → thêm CV → bấm một nút → nhận bảng xếp hạng kèm lý do. Cách nhanh nhất để hiểu là xem thử với dữ liệu mẫu:</span>
        <div style={{ marginTop: 10 }}><button className="primary-button" onClick={demo} disabled={Boolean(working)}>{working === "demo" ? "Đang nạp…" : "Nạp dữ liệu mẫu & xem thử"}</button></div>
      </section>}
      {notice.text && <div className={`notice ${notice.type}`} role="status"><Icon name={notice.type === "error" ? "alert" : "check"} />{notice.text}</div>}
      <section className="metric-grid" data-ai-id="decision-metrics"><Metric label="CV đã nhập" value={cvs.length} note="Đã ẩn thông tin cá nhân" tone="violet" /><Metric label="Ứng viên được xếp hạng" value={matches.length} note="Cho vị trí đang chọn" tone="mint" /><Metric label="Độ tin cậy trung bình" value={`${confidence}%`} note="Dữ liệu CV đầy đủ đến đâu" tone="amber" /><Metric label="Đã shortlist" value={matches.filter((x) => x.pipeline_status === "Shortlisted").length} note="Bạn là người quyết định" tone="coral" /></section>
      <section className="pipeline-card"><div><span className="live-dot" /><strong>{matchJob ? `Job ${matchJob.status}` : "Hệ thống sẵn sàng"}</strong><small>{matchJob?.stage || "Tìm ứng viên → Chấm điểm → AI xếp hạng → Kiểm tra công bằng → Bạn duyệt"}</small></div><div className="progress"><span style={{ width: `${matchJob?.progress || 0}%` }} /></div><b>{matchJob?.progress || 0}%</b></section>
      <section className="work-grid">
        <aside className="intake-panel" id="jobs"><Heading index="Bước 1 & 2" title="Nhập JD và CV" /><form onSubmit={addJob}><label>Bước 1 · Dán tin tuyển dụng (JD)<textarea rows="7" value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Dán toàn bộ nội dung tin tuyển dụng vào đây — hệ thống tự trích kỹ năng, kinh nghiệm yêu cầu…" /></label><button className="secondary-button" disabled={!jd.trim() || working === "job"}>{working === "job" ? "Đang xử lý…" : "Lưu vị trí tuyển dụng"}</button></form><div className="divider"><span>Bước 2 · CV ứng viên</span></div><label className="upload-zone"><input type="file" accept="application/pdf" multiple onChange={addCvs} /><Icon name="upload" size={24} /><strong>{working === "upload" ? "Đang đọc CV…" : "Thêm CV (PDF, chọn nhiều file)"}</strong><span>Tự động đọc nội dung & ẩn thông tin cá nhân</span></label><div className="corpus-list">{cvs.slice(0, 5).map((cv) => <article key={cv.id}><i>{(cv.extracted_data?.candidate_name || "?")[0]}</i><div><strong>{cv.extracted_data?.candidate_name || "Ứng viên chưa rõ tên"}</strong><small>{cv.pii_masking?.status === "masked" ? "Ranking profile đã ẩn PII" : "Chờ masking"}</small></div><Icon name="check" size={18} /></article>)}</div></aside>
        <section className="ranking-panel" id="candidates"><div className="panel-heading"><div><p className="eyebrow">Bước 3 · Bảng xếp hạng</p><h2>{job?.title || "Chọn một vị trí"}</h2></div><label className="search-field"><Icon name="search" size={18} /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Lọc tên hoặc kỹ năng" /></label></div><div className="score-legend"><span title={SCORE_INFO.rule.help}>{SCORE_INFO.rule.label}</span><span title={SCORE_INFO.semantic.help}>{SCORE_INFO.semantic.label}</span><span title={SCORE_INFO.ml.help}>{SCORE_INFO.ml.label}</span><span title={SCORE_INFO.confidence.help}>{SCORE_INFO.confidence.label}</span></div><div className="candidate-list">{!visible.length && <Empty icon="users" title="Chưa có bảng xếp hạng" text={step <= 2 ? "Hoàn thành bước 1–2 (JD + CV) ở cột trái trước đã." : "Bấm nút 'Tìm ứng viên phù hợp' ở góc trên để xếp hạng."} />}{visible.map((x, i) => <button key={x.id} className={`candidate-row ${match?.id === x.id ? "selected" : ""}`} onClick={() => setMatch(x)}><span className="rank">{String(i + 1).padStart(2, "0")}</span><div className="candidate-copy"><strong>{x.candidate_name}</strong><small>{x.matched_skills?.slice(0, 3).join(" · ") || "Chưa có skill xác nhận"}</small><div className="micro-scores">{[x.rule_score, x.semantic_score, x.ml_rank_score, x.confidence_score].map((n, k) => <i key={k} style={{ width: `${n || 0}%` }} />)}</div></div><div className="final-score"><strong>{x.final_score}</strong><small>/100</small></div></button>)}</div></section>
        <aside className="detail-panel">{!match ? <Empty icon="search" title="Chọn một ứng viên" text="Bấm vào một ứng viên trong bảng xếp hạng để xem điểm số, bằng chứng từ CV và ra quyết định." /> : <><div className="detail-hero"><div><p className="eyebrow">Bước 4 · Xem & quyết định</p><h2>{match.candidate_name}</h2><span>{match.recruiter_priority || "Cần xem xét"}</span></div><div className="score-orbit" title="Điểm tổng hợp để gợi ý thứ tự xem — KHÔNG tự loại ai"><strong>{match.final_score}</strong><small>gợi ý</small></div></div><div className="score-quartet"><Score label={SCORE_INFO.rule.label} value={match.rule_score} help={SCORE_INFO.rule.help} /><Score label={SCORE_INFO.semantic.label} value={match.semantic_score} help={SCORE_INFO.semantic.help} /><Score label={SCORE_INFO.ml.label} value={match.ml_rank_score} help={SCORE_INFO.ml.help} /><Score label={SCORE_INFO.confidence.label} value={match.confidence_score} help={SCORE_INFO.confidence.help} /></div><SignalRow match={match} />{match.decision_support?.needs_verification && <div className="verification"><Icon name="alert" /><span><strong>Cần xác minh</strong>Thiếu bằng chứng không đồng nghĩa thiếu năng lực.</span></div>}<Detail title="Evidence từ CV">{(match.evidence || []).slice(0, 4).map((e, i) => <article className="evidence" key={i}><Icon name={e.cv_evidence ? "check" : "alert"} size={16} /><div><strong>{e.requirement}</strong><p>{e.cv_evidence || "Không có bằng chứng trực tiếp — cần hỏi lại ứng viên."}</p></div></article>)}</Detail><Detail title="Câu hỏi phỏng vấn">{(match.interview_questions || []).slice(0, 3).map((q) => <article className="question" key={q.question}><span>{q.focus}</span><p>{q.question}</p></article>)}</Detail><div className="review-actions"><button onClick={() => pipeline("Shortlisted")} title="Chọn ứng viên này vào vòng sau">✓ Shortlist</button><button onClick={() => pipeline("Reviewed")} title="Đánh dấu đã xem, chưa quyết">Đã xem</button><button onClick={() => pipeline("Rejected")} title="Loại khỏi vị trí này (AI sẽ học từ quyết định của bạn)" style={{ color: "#c53" }}>Loại</button></div><div className="feedback-row"><span title="Phản hồi của bạn giúp AI xếp hạng chính xác hơn ở các lần sau">AI đánh giá có đúng không?</span><button onClick={() => feedback("good_match")}>Đúng</button><button onClick={() => feedback("explanation_incorrect")}>Chưa đúng</button></div></>}</aside>
      </section>
      <section className="insight-grid" id="fairness">
        <article className="fairness-card"><Heading index="Fairness guardrail" title="Không tự động loại." /><div className="fairness-stats"><Score label="PII dùng ranking" value={analytics?.fairness?.ranking_uses_pii ? "Có" : "Không"} /><Score label="Match bị flag" value={analytics?.fairness?.fairness_flagged_matches ?? 0} /><Score label="Auto reject" value={analytics?.fairness?.automatic_rejection_enabled ? "Bật" : "Tắt"} /></div>
          {(analytics?.fairness?.alerts || []).map((a, i) => <div className="fairness-alert" key={i} style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,90,90,.12)", color: "#c53", borderRadius: 8, padding: "8px 10px", marginTop: 8, fontSize: 13 }}><Icon name="alert" size={16} />{a}</div>)}
          <DisparateImpact dims={analytics?.fairness?.group_fairness?.dimensions} />
          <p>{analytics?.fairness?.notice}</p>
        </article>
        <article className="gaps-card"><Heading index="Chất lượng gợi ý" title="AI học từ feedback" />
          <div className="fairness-stats"><Score label="NDCG@5" value={analytics?.rankingEval?.ndcg_at_5 ?? "—"} /><Score label="MAP" value={analytics?.rankingEval?.map ?? "—"} /><Score label="Nguồn xếp hạng" value={analytics?.rankingEval?.active_model ? "Đã học" : "Mặc định"} /></div>
          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Hệ thống tự học từ shortlist/feedback của HR sau mỗi lượt đánh giá — không cần thao tác thủ công. {analytics?.rankingEval?.active_model ? "Đang dùng model đã học từ đội của bạn." : "Sẽ tự kích hoạt khi đủ dữ liệu phản hồi."}</p>
          <div className="divider" style={{ margin: "14px 0 10px" }}><span>Skill gaps</span></div>
          <div className="gap-cloud">{(analytics?.skills?.top_gaps || []).slice(0, 6).map((x) => <span key={x.skill}>{x.skill}<b>{x.count}</b></span>)}</div>
        </article>
      </section>
    </main>
  </div>;
}
const SCORE_INFO = {
  rule: { label: "Khớp yêu cầu", help: "Ứng viên đáp ứng bao nhiêu % yêu cầu trong JD (kỹ năng bắt buộc/ưu tiên, kinh nghiệm, học vấn). Di chuột vào từng mục để xem giải thích." },
  semantic: { label: "Giống nội dung JD", help: "Nội dung CV gần nghĩa với JD đến mức nào — do AI so sánh ngữ nghĩa, nên 'ReactJS' vẫn khớp với 'React'." },
  ml: { label: "Điểm AI", help: "Điểm AI dự đoán dựa trên các quyết định shortlist/loại trước đây của bạn. Càng dùng nhiều, điểm càng hợp gu tuyển của đội." },
  confidence: { label: "Độ tin cậy", help: "CV có đầy đủ thông tin và bằng chứng rõ ràng không. Điểm thấp = nên kiểm tra thủ công, không có nghĩa ứng viên kém." },
};
function Stepper({ step }) {
  const items = ["Tạo vị trí (JD)", "Thêm CV ứng viên", "Chạy xếp hạng", "Duyệt & quyết định"];
  return <ol style={{ display: "flex", gap: 10, listStyle: "none", padding: 0, margin: "10px 0 0", flexWrap: "wrap" }}>
    {items.map((title, i) => {
      const n = i + 1, active = n === step, done = n < step;
      return <li key={title} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, opacity: done || active ? 1 : 0.45 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, background: done ? "rgba(80,200,120,.25)" : active ? "rgba(124,92,255,.3)" : "rgba(120,120,160,.15)" }}>{done ? "✓" : n}</span>
        <span style={{ fontWeight: active ? 700 : 500 }}>{title}</span>
        {i < items.length - 1 && <span style={{ opacity: 0.4 }}>→</span>}
      </li>;
    })}
  </ol>;
}
const tagStyle = (warn) => ({ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: warn ? "rgba(255,90,90,.14)" : "rgba(120,120,160,.14)", color: warn ? "#c53" : "inherit" });
function Tag({ label, value, warn }) { return <span style={tagStyle(warn)}><b style={{ opacity: 0.6, fontWeight: 500 }}>{label}</b>{value}</span>; }
const mlSourceLabel = (s) => (s || "").startsWith("learned") ? "AI đã học từ phản hồi" : "Công thức mặc định";
const strategyLabel = (s) => s === "vector_keyword_hybrid" ? "AI ngữ nghĩa + từ khóa" : s === "keyword_only" ? "Chỉ từ khóa" : (s || "—");
function SignalRow({ match }) {
  const embedding = match.retrieval?.semantic_source === "embedding";
  return <><div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "4px 0 10px" }}>
    <span title="Điểm AI đến từ đâu: đã học từ quyết định của bạn, hay còn dùng công thức mặc định" style={tagStyle(!(match.ml_rank_source || "").startsWith("learned"))}><b style={{ opacity: 0.6, fontWeight: 500 }}>Điểm AI</b>{mlSourceLabel(match.ml_rank_source)}</span>
    <span title="Cách so nội dung CV với JD: AI ngữ nghĩa (hiểu từ đồng nghĩa) hay chỉ đếm trùng từ" style={tagStyle(!embedding)}><b style={{ opacity: 0.6, fontWeight: 500 }}>So khớp</b>{embedding ? "AI ngữ nghĩa" : "Trùng từ đơn giản"}</span>
    <span title="Cách hệ thống tìm ra ứng viên này trong kho CV" style={tagStyle(false)}><b style={{ opacity: 0.6, fontWeight: 500 }}>Cách tìm</b>{strategyLabel(match.retrieval?.strategy)}</span>
    {match.fairness_risk_score > 0 && <Tag label="Công bằng" value={`Cần lưu ý ${match.fairness_risk_score}`} warn />}
  </div>{(match.fairness_flags || []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{match.fairness_flags.map((f, i) => <span key={i} title={f.note} style={tagStyle(true)}>⚑ {f.signal === "gap_year" ? "Có quãng nghỉ sự nghiệp — đừng để điều này bất lợi cho ứng viên" : f.signal === "school_prestige" ? "Trường 'danh tiếng' — đừng để điều này nâng điểm bất công" : f.signal}</span>)}</div>}</>;
}
function DisparateImpact({ dims }) {
  const entries = Object.entries(dims || {}).filter(([, v]) => v.disparate_impact !== null && v.disparate_impact !== undefined);
  if (!entries.length) return null;
  const dimName = (d) => ({ school_tier: "Nhóm trường", region: "Vùng miền" }[d] || d.replace("inferred_", "").replace("_", " "));
  return <div style={{ marginTop: 10, display: "grid", gap: 6 }} title="Disparate impact = tỷ lệ được chọn của nhóm thấp nhất chia nhóm cao nhất. Dưới 0.8 (quy tắc 4/5) là dấu hiệu thiên vị cần xem lại.">{entries.map(([dim, info]) => <div key={dim} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px", borderRadius: 8, background: info.disparate_impact < 0.8 ? "rgba(255,90,90,.10)" : "rgba(120,120,160,.10)" }}><span>{dimName(dim)}</span><b style={{ color: info.disparate_impact < 0.8 ? "#c53" : "inherit" }}>Cân bằng {info.disparate_impact}{info.disparate_impact < 0.8 ? " ⚠ cần xem lại" : ""}</b></div>)}</div>;
}
function Heading({ index, title }) { return <div className="panel-heading"><div><p className="eyebrow">{index}</p><h2>{title}</h2></div></div>; }
function Metric({ label, value, note, tone }) { return <article className={`metric-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function Score({ label, value = 0, help }) { return <div title={help} style={help ? { cursor: "help" } : undefined}><span>{label}</span><strong>{value}</strong></div>; }
function Detail({ title, children }) { return <section className="detail-section"><h3>{title}</h3>{children}</section>; }
function Empty({ icon, title, text }) { return <div className="empty-state"><Icon name={icon} size={32} /><strong>{title}</strong><span>{text}</span></div>; }
