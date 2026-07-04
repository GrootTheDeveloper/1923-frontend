export function PanelHeader({ title, count }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <span>{count}</span>
    </div>
  );
}

export function Metric({ label, value }) {
  return (
    <article className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

export function Field({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function TextField({ label, value, onChange, rows = 3 }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} />
    </label>
  );
}

export function ScoreBadge({ score }) {
  const numeric = Number(score || 0);
  const tone = numeric >= 80 ? "high" : numeric >= 65 ? "good" : numeric >= 50 ? "mid" : "low";
  return <span className={`score-badge ${tone}`}>{numeric}%</span>;
}

export function EmptyLine({ text }) {
  return <p className="empty-line">{text}</p>;
}