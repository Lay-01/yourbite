import { inr } from "../../utils/format.js";

export function BarChart({ data, height = 180, format = inr, color = "#0ea5e9" }) {
  if (!data?.length) return <p className="muted">No data for this range.</p>;
  const max = Math.max(...data.map((point) => point.value), 1);
  const labelEvery = Math.ceil(data.length / 10);
  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((point, index) => (
        <div className="bar-col" key={`${point.label}-${index}`} title={`${point.label}: ${format(point.value)}`}>
          <div className="bar" style={{ height: `${Math.max((point.value / max) * 100, point.value > 0 ? 3 : 0)}%`, background: color }} />
          <span className="bar-label">{index % labelEvery === 0 ? point.label : ""}</span>
        </div>
      ))}
    </div>
  );
}

export function HBarChart({ data, colors = [] }) {
  if (!data?.length) return <p className="muted">No data for this range.</p>;
  const max = Math.max(...data.map((point) => point.value), 1);
  return (
    <ul className="hbar-list">
      {data.map((point, index) => (
        <li key={point.name}>
          <span className="hbar-name">{point.name}</span>
          <div className="hbar-track"><div className="hbar-fill" style={{ width: `${Math.max((point.value / max) * 100, 2)}%`, background: colors[index % colors.length] || "#0ea5e9" }} /></div>
          <span className="hbar-value">{inr(point.value)}</span>
        </li>
      ))}
    </ul>
  );
}