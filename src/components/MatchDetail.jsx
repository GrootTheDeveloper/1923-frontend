import { statusMap, statusOptions } from "../constants/cvmatch";
import { formatBreakdownLabel } from "../utils/cvmatchTransforms";
import { EmptyLine, ScoreBadge } from "./cvmatchPrimitives";

export default function MatchDetail({ match, noteDraft, setNoteDraft, onUpdateStatus, working }) {
  if (!match) {
    return (
      <section className="match-detail">
        <EmptyLine text="Chọn một ứng viên từ bảng xếp hạng ở bên để xem chi tiết." />
      </section>
    );
  }

  const explanation = match.match_explanation || {};
  const priorityScore = match.recruiter_priority_score ?? match.final_score;

  return (
    <section className="match-detail">
      <div className="detail-title">
        <div>
          <h3>{match.candidate_name}</h3>
          <span>{match.candidate_email || match.filename}</span>
        </div>
        <div className="score-stack">
          <ScoreBadge score={match.final_score} />
          <span className="priority-badge">Ưu tiên {priorityScore}%</span>
        </div>
      </div>

      {match.is_outdated && (
        <div className="outdated-warning">
          JD requirements đã thay đổi sau lần đối chiếu này. Chạy lại matching để cập nhật điểm và bằng chứng.
        </div>
      )}

      <p className="recommendation">{match.recommendation}</p>

      {explanation.summary && (
        <div className="match-explanation">
          <header>
            <span>Giải thích ưu tiên</span>
            <strong>{match.recruiter_priority || "Review carefully"}</strong>
          </header>
          <p>{explanation.summary}</p>
          <ExplanationList title="Điểm mạnh" items={explanation.strengths || []} />
          <ExplanationList title="Cần xác minh" items={explanation.risks || []} />
          <ExplanationList title="Bước tiếp theo" items={explanation.next_steps || []} />
        </div>
      )}

      <div className="breakdown">
        {Object.entries(match.score_breakdown || {}).map(([key, value]) => (
          <div key={key}>
            <span>{formatBreakdownLabel(key)}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <TagGroup title="Kỹ năng đáp ứng" tags={match.matched_skills || []} />
      <TagGroup title="Kỹ năng còn thiếu" tags={match.missing_skills || []} muted />

      <div className="status-actions">
        {statusOptions.map((status) => (
          <button
            key={status}
            className={match.pipeline_status === status ? "active" : ""}
            type="button"
            onClick={() => onUpdateStatus(status)}
            disabled={working === "status"}
          >
            {statusMap[status] || status}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Ghi chú tuyển dụng</span>
        <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={3} />
      </label>

      <div className="evidence-list">
        <h3>Bằng chứng đối chiếu thực tế từ CV</h3>
        {(match.evidence || []).length === 0 ? (
          <EmptyLine text="Không phát hiện bằng chứng so khớp." />
        ) : (
          match.evidence.map((item, index) => (
            <article key={`${item.requirement}-${index}`}>
              <strong>{item.requirement}</strong>
              {item.cv_evidence ? <p>{item.cv_evidence}</p> : <p className="muted">Không tìm thấy thông tin tương đương trong CV.</p>}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ExplanationList({ title, items }) {
  if (!items.length) return null;
  return (
    <div>
      <span>{title}</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TagGroup({ title, tags, muted = false }) {
  return (
    <div className="tag-group">
      <span>{title}</span>
      <div>
        {tags.length === 0 ? (
          <small>Không có</small>
        ) : (
          tags.slice(0, 12).map((tag) => (
            <em className={muted ? "muted" : ""} key={tag}>
              {tag}
            </em>
          ))
        )}
      </div>
    </div>
  );
}