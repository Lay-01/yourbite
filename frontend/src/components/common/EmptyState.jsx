import Icon from "./Icon.jsx";

export default function EmptyState({ icon = "inbox", title, subtitle, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} size={26} /></div>
      <h4>{title}</h4>
      {subtitle ? <p>{subtitle}</p> : null}
      {action}
    </div>
  );
}