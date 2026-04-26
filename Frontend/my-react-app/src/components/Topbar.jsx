export default function Topbar({ clock }) {
  return (
    <header className="topbar" role="banner">
      <div className="topbar-brand">
        <div className="brand-mark" aria-hidden="true">
          V
        </div>
        <span className="brand-name">
          Vita<span>Lens</span>
        </span>
      </div>

      <div className="topbar-meta">
        <span className="ward-label">
          Ward <strong>4 General Medicine</strong>
        </span>
        <div className="heartbeat" role="status" aria-live="polite">
          <span className="heartbeat-dot" aria-hidden="true" />
          <span>{clock || "--:--:--"}</span>
          <span>Live</span>
        </div>
      </div>
    </header>
  );
}