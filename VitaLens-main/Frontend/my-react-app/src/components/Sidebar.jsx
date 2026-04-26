export default function Sidebar({ view, setView, patients, critical, onOpenDetail }) {
  return (
    <nav className="sidebar" aria-label="Primary navigation">
      <div className="sidebar-section">
        <span className="sidebar-label">Views</span>
        <button
          className={`nav-item ${view === "dashboard" ? "active" : ""}`}
          onClick={() => setView("dashboard")}
        >
          Nurse Dashboard
          <span className={`nav-badge ${critical > 0 ? "critical" : "stable"}`}>{critical}</span>
        </button>
        <button
          className={`nav-item ${view === "handoff" ? "active" : ""}`}
          onClick={() => setView("handoff")}
        >
          Review Handoff
        </button>
        <button
          className={`nav-item ${view === "admin" ? "active" : ""}`}
          onClick={() => setView("admin")}
        >
          Admin Config
        </button>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <span className="sidebar-label">Patients</span>
        {patients.map((p) => (
            <button key={p.id} className="nav-item" onClick={() => onOpenDetail(p.id)}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: `var(--status-${p.score >= 60 ? "critical" : p.score >= 35 ? "watch" : "stable"})`,
              }}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.6875rem",
                fontFamily: "var(--font-mono)",
                color: "var(--text-tertiary)",
              }}
            >
              Bed {p.bed}
            </span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="nurse-card" role="region" aria-label="Current user">
          <div className="nurse-avatar" aria-hidden="true">
            SN
          </div>
          <div>
            <div className="nurse-name">Sarah Ng, RN</div>
            <div className="nurse-role">Night shift · Ward 4</div>
          </div>
        </div>
      </div>
    </nav>
  );
}