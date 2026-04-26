const getStatus = (score) => (score >= 60 ? "critical" : score >= 35 ? "watch" : "stable");
const getStatusLabel = (score) => (score >= 60 ? "Critical" : score >= 35 ? "Watch" : "Stable");

export default function PatientCard({ patient, score, narrative, onOpen, onAcknowledge, onEscalate }) {
  const status = getStatus(score);
// Use the live averages from Snowflake
const v = {
  hr: patient.AVG_HR || patient.hrbl,
  spo2: patient.AVG_SPO2 || patient.spo2bl,
  rr: patient.AVG_RR || patient.rrbl,
  bp: patient.AVG_BP || patient.bpbl,
};

  return (
    <div
      className={`patient-card ${status}`}
      role="listitem"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
    >
      <div className="card-head">
        <div>
          <div className="patient-name">{patient.name}</div>
          <div className="patient-meta">
            Bed {patient.bed}{" "}
            <span className={`status-pill ${status}`}>{getStatusLabel(score)}</span>
          </div>
        </div>

        <div className="concern-badge" aria-hidden="true">
          <div className="concern-score">{score}</div>
          <div className="concern-label">100</div>
        </div>
      </div>

      <div className="score-bar-wrap" aria-hidden="true">
        <div className="score-bar">
          <div className="score-fill" style={{ width: `${score}%` }} />
        </div>
      </div>

      <div className="vitals-row" role="group" aria-label="Current vitals">
        <div className={`vital-chip ${score > 50 ? "alert" : ""}`}>
          <span className="vital-val">{v.hr.toFixed(0)}</span>
          <span className="vital-label">HR</span>
        </div>
        <div className={`vital-chip ${score > 60 ? "alert" : score > 40 ? "flagged" : ""}`}>
          <span className="vital-val">{v.spo2.toFixed(1)}</span>
          <span className="vital-label">SpO2</span>
        </div>
        <div className="vital-chip">
          <span className="vital-val">{v.rr.toFixed(0)}</span>
          <span className="vital-label">RR</span>
        </div>
        <div className="vital-chip">
          <span className="vital-val">{v.bp.toFixed(0)}</span>
          <span className="vital-label">BP sys</span>
        </div>
      </div>

      <div className="narrative" role="note" aria-label="AI clinical observation">
        <div className="narrative-text">{narrative}</div>
      </div>

      <div className="card-footer">
        <span className="last-updated">Updated just now</span>
        <div className="card-actions">
          <button
            className="action-btn acknowledge"
            onClick={(e) => {
              e.stopPropagation();
              onAcknowledge();
            }}
          >
            Acknowledge
          </button>
          {score >= 60 && (
            <button
              className="action-btn escalate"
              onClick={(e) => {
                e.stopPropagation();
                onEscalate();
              }}
            >
              Escalate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}