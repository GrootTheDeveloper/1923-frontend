import { matchLevelMap, statusMap, statusOptions } from "../constants/cvmatch";
import { EmptyLine, PanelHeader, ScoreBadge } from "./cvmatchPrimitives";

export default function RankingList({
  filteredMatches,
  onExportCsv,
  onOpenMatch,
  scoreFilter,
  selectedMatch,
  setScoreFilter,
  setStatusFilter,
  statusFilter,
}) {
  return (
    <div className="workflow-card">
      <PanelHeader title="Bảng xếp hạng" count={filteredMatches.length} />

      <div className="filters">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="All">Tất cả trạng thái</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>{statusMap[status] || status}</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          max="100"
          value={scoreFilter}
          onChange={(event) => setScoreFilter(event.target.value)}
          placeholder="Điểm tối thiểu"
          aria-label="Minimum score"
        />
        <button className="btn secondary" type="button" onClick={onExportCsv} disabled={!filteredMatches.length}>
          Xuất CSV
        </button>
      </div>

      <div className="ranking-list">
        {filteredMatches.length === 0 ? (
          <EmptyLine text="Chưa có dữ liệu xếp hạng. Vui lòng bấm bắt đầu đối chiếu ở trên." />
        ) : (
          filteredMatches.map((match, index) => (
            <button
              key={match.id}
              type="button"
              className={`rank-row ${selectedMatch?.id === match.id ? "active" : ""}`}
              onClick={() => onOpenMatch(match.id)}
            >
              <span className="rank-index">{index + 1}</span>
              <div>
                <strong>{match.candidate_name}</strong>
                <small>{statusMap[match.pipeline_status] || match.pipeline_status} / {matchLevelMap[match.match_level] || match.match_level}</small>
                {match.recruiter_priority && (
                  <small className="priority-label">
                    Ưu tiên: {match.recruiter_priority} ({match.recruiter_priority_score ?? match.final_score}%)
                  </small>
                )}
                {match.is_outdated && <small className="outdated-label">Cần chạy lại đối chiếu</small>}
              </div>
              <ScoreBadge score={match.final_score} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
