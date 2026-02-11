export default function SaveBar({ show, saving, onSave, onReset }) {
  if (!show) return null;

  return (
    <div className="save-bar">
      <span className="save-bar-text">You have unsaved changes</span>
      <div className="save-bar-actions">
        <button className="btn btn-ghost" onClick={onReset} disabled={saving}>
          Reset
        </button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
