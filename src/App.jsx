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

  return <div className="app-frame">
    <aside className="sidebar" data-ai-id="primary-navigation">
      <div className="brand"><span><Icon name="spark" /></span><div><strong>Lattice</strong><small>Talent intelligence</small></div></div>
      <nav><a className="active" href="#workspace"><Icon name="grid" />Workbench</a><a href="#candidates"><Icon name="users" />Ứng viên <b>{cvs.length}</b></a><a href="#jobs"><Icon name="briefcase" />Vị trí <b>{jobs.length}</b></a><a href="#fairness"><Icon name="shield" />Fairness</a></nav>
      <div className="privacy-note"><Icon name="shield" /><div><strong>PII shield active</strong><span>Dữ liệu nhạy cảm không đi vào ranking.</span></div></div>
      <button className="quiet-button" onClick={demo} disabled={Boolean(working)}>Nạp dữ liệu mẫu</button>
    </aside>
    <main id="workspace" data-ai-id="recruitment-workbench">
      <header className="command-bar"><div><p className="eyebrow">Recruitment workbench</p><h1>Đưa bằng chứng lên trước.</h1></div><div className="command-actions"><label>Vị trí đang đánh giá<select value={jobId} onChange={(e) => { setJobId(e.target.value); loadMatches(e.target.value); }}><option value="">Chọn JD</option>{jobs.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.company || "Chưa rõ công ty"}</option>)}</select></label><button className="primary-button" onClick={runMatch} disabled={!jobId || !cvs.length || working === "matching"}><Icon name="spark" />{working === "matching" ? "Đang xếp hạng…" : "Chạy matching"}</button></div></header>
      {notice.text && <div className={`notice ${notice.type}`} role="status"><Icon name={notice.type === "error" ? "alert" : "check"} />{notice.text}</div>}
      <section className="metric-grid" data-ai-id="decision-metrics"><Metric label="Profile đã index" value={cvs.length} note="PII masked" tone="violet" /><Metric label="Kết quả retrieval" value={matches.length} note="Top K, không scan" tone="mint" /><Metric label="Confidence TB" value={`${confidence}%`} note="Theo evidence" tone="amber" /><Metric label="Đã shortlist" value={matches.filter((x) => x.pipeline_status === "Shortlisted").length} note="HR quyết định" tone="coral" /></section>
      <section className="pipeline-card"><div><span className="live-dot" /><strong>{matchJob ? `Job ${matchJob.status}` : "Pipeline sẵn sàng"}</strong><small>{matchJob?.stage || "Retrieval → Rules → ML rank → Fairness → HR review"}</small></div><div className="progress"><span style={{ width: `${matchJob?.progress || 0}%` }} /></div><b>{matchJob?.progress || 0}%</b></section>
      <section className="work-grid">
        <aside className="intake-panel" id="jobs"><Heading index="01" title="Chuẩn hóa đầu vào" /><form onSubmit={addJob}><label>Nội dung JD<textarea rows="7" value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Dán JD để trích yêu cầu, seniority và domain…" /></label><button className="secondary-button" disabled={!jd.trim() || working === "job"}>Tạo JD có cấu trúc</button></form><div className="divider"><span>Candidate corpus</span></div><label className="upload-zone"><input type="file" accept="application/pdf" multiple onChange={addCvs} /><Icon name="upload" size={24} /><strong>{working === "upload" ? "Đang parse…" : "Import CV hàng loạt"}</strong><span>Parse → mask PII → index</span></label><div className="corpus-list">{cvs.slice(0, 5).map((cv) => <article key={cv.id}><i>{(cv.extracted_data?.candidate_name || "?")[0]}</i><div><strong>{cv.extracted_data?.candidate_name || "Ứng viên chưa rõ tên"}</strong><small>{cv.pii_masking?.status === "masked" ? "Ranking profile đã ẩn PII" : "Chờ masking"}</small></div><Icon name="check" size={18} /></article>)}</div></aside>
        <section className="ranking-panel" id="candidates"><div className="panel-heading"><div><p className="eyebrow">02 · Hybrid ranking</p><h2>{job?.title || "Chọn một vị trí"}</h2></div><label className="search-field"><Icon name="search" size={18} /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Lọc tên hoặc kỹ năng" /></label></div><div className="score-legend"><span>Rule</span><span>Semantic</span><span>ML rank</span><span>Confidence</span></div><div className="candidate-list">{!visible.length && <Empty icon="users" title="Chưa có bảng xếp hạng" text="Import CV, chọn JD rồi chạy matching để tạo shortlist có bằng chứng." />}{visible.map((x, i) => <button key={x.id} className={`candidate-row ${match?.id === x.id ? "selected" : ""}`} onClick={() => setMatch(x)}><span className="rank">{String(i + 1).padStart(2, "0")}</span><div className="candidate-copy"><strong>{x.candidate_name}</strong><small>{x.matched_skills?.slice(0, 3).join(" · ") || "Chưa có skill xác nhận"}</small><div className="micro-scores">{[x.rule_score, x.semantic_score, x.ml_rank_score, x.confidence_score].map((n, k) => <i key={k} style={{ width: `${n || 0}%` }} />)}</div></div><div className="final-score"><strong>{x.final_score}</strong><small>/100</small></div></button>)}</div></section>
        <aside className="detail-panel">{!match ? <Empty icon="search" title="Chọn một ứng viên" text="Evidence, gap và câu hỏi xác minh sẽ xuất hiện ở đây." /> : <><div className="detail-hero"><div><p className="eyebrow">03 · Human review</p><h2>{match.candidate_name}</h2><span>{match.recruiter_priority || "Cần xem xét"}</span></div><div className="score-orbit"><strong>{match.final_score}</strong><small>recommend</small></div></div><div className="score-quartet"><Score label="Rule" value={match.rule_score} /><Score label="Semantic" value={match.semantic_score} /><Score label="ML rank" value={match.ml_rank_score} /><Score label="Confidence" value={match.confidence_score} /></div><SignalRow match={match} />{match.decision_support?.needs_verification && <div className="verification"><Icon name="alert" /><span><strong>Cần xác minh</strong>Thiếu bằng chứng không đồng nghĩa thiếu năng lực.</span></div>}<Detail title="Evidence từ CV">{(match.evidence || []).slice(0, 4).map((e, i) => <article className="evidence" key={i}><Icon name={e.cv_evidence ? "check" : "alert"} size={16} /><div><strong>{e.requirement}</strong><p>{e.cv_evidence || "Không có bằng chứng trực tiếp — cần hỏi lại ứng viên."}</p></div></article>)}</Detail><Detail title="Câu hỏi phỏng vấn">{(match.interview_questions || []).slice(0, 3).map((q) => <article className="question" key={q.question}><span>{q.focus}</span><p>{q.question}</p></article>)}</Detail><div className="review-actions"><button onClick={() => pipeline("Shortlisted")}>Đưa vào shortlist</button><button onClick={() => pipeline("Reviewed")}>Đã review</button></div><div className="feedback-row"><span>Explanation có ích?</span><button onClick={() => feedback("good_match")}>Đúng</button><button onClick={() => feedback("explanation_incorrect")}>Cần sửa</button></div></>}</aside>
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
const tagStyle = (warn) => ({ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: warn ? "rgba(255,90,90,.14)" : "rgba(120,120,160,.14)", color: warn ? "#c53" : "inherit" });
function Tag({ label, value, warn }) { return <span style={tagStyle(warn)}><b style={{ opacity: 0.6, fontWeight: 500 }}>{label}</b>{value}</span>; }
const mlSourceLabel = (s) => (s || "").startsWith("learned") ? "ML học từ feedback" : "ML heuristic (proxy)";
const strategyLabel = (s) => s === "vector_keyword_hybrid" ? "Vector + keyword" : s === "keyword_only" ? "Keyword" : (s || "—");
function SignalRow({ match }) {
  const embedding = match.retrieval?.semantic_source === "embedding";
  return <><div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "4px 0 10px" }}>
    <Tag label="ML rank" value={mlSourceLabel(match.ml_rank_source)} warn={!(match.ml_rank_source || "").startsWith("learned")} />
    <Tag label="Semantic" value={embedding ? "Vector embedding" : "Lexical (TF)"} warn={!embedding} />
    <Tag label="Retrieval" value={strategyLabel(match.retrieval?.strategy)} />
    {match.fairness_risk_score > 0 && <Tag label="Fairness" value={`Risk ${match.fairness_risk_score}`} warn />}
  </div>{(match.fairness_flags || []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{match.fairness_flags.map((f, i) => <span key={i} title={f.note} style={tagStyle(true)}>⚑ {f.signal}</span>)}</div>}</>;
}
function DisparateImpact({ dims }) {
  const entries = Object.entries(dims || {}).filter(([, v]) => v.disparate_impact !== null && v.disparate_impact !== undefined);
  if (!entries.length) return null;
  return <div style={{ marginTop: 10, display: "grid", gap: 6 }}>{entries.map(([dim, info]) => <div key={dim} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px", borderRadius: 8, background: info.disparate_impact < 0.8 ? "rgba(255,90,90,.10)" : "rgba(120,120,160,.10)" }}><span>{dim.replace("inferred_", "").replace("_", " ")}</span><b style={{ color: info.disparate_impact < 0.8 ? "#c53" : "inherit" }}>DI {info.disparate_impact}{info.disparate_impact < 0.8 ? " ⚠" : ""}</b></div>)}</div>;
}
function Heading({ index, title }) { return <div className="panel-heading"><div><p className="eyebrow">{index}</p><h2>{title}</h2></div></div>; }
function Metric({ label, value, note, tone }) { return <article className={`metric-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function Score({ label, value = 0 }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Detail({ title, children }) { return <section className="detail-section"><h3>{title}</h3>{children}</section>; }
function Empty({ icon, title, text }) { return <div className="empty-state"><Icon name={icon} size={32} /><strong>{title}</strong><span>{text}</span></div>; }
