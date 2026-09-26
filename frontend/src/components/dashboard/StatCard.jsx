import Icon from "../common/Icon.jsx";

export default function StatCard({ icon, label, value, hint, tone = "default" }) {
  const hintText = typeof hint === "string" ? hint : hint?.text;
  const hintTone = typeof hint === "object" ? (hint.up ? "up" : hint.down ? "down" : "") : "";
  return (
    <section className={`stat-card tone-${tone}`}>
      <div className="stat-card-top"><span className="stat-icon"><Icon name={icon} size={18} /></span></div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {hintText ? <span className={`stat-hint ${hintTone}`.trim()}>{hintText}</span> : null}
      </div>
    </section>
  );
}