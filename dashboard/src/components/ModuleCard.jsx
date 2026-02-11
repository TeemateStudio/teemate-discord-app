export default function ModuleCard({ icon, title, description, enabled, onToggle }) {
  return (
    <div className="module-card">
      <div className="module-card-icon">{icon}</div>
      <div className="module-card-info">
        <div className="module-card-title">{title}</div>
        <div className="module-card-desc">{description}</div>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={enabled} onChange={onToggle} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}
