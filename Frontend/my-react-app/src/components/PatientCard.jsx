import React, { useEffect, useRef } from 'react';

const getStatus = (score) => (score >= 60 ? "critical" : score >= 35 ? "watch" : "stable");
const getStatusLabel = (score) => (score >= 60 ? "Critical" : score >= 35 ? "Watch" : "Stable");

export default function PatientCard({ patient, score, narrative, onOpen, onAcknowledge, onEscalate }) {
  const status = getStatus(score);
  const hasPlayedRef = useRef(false);

  const v = {
    hr: patient.AVG_HR || patient.hrbl || 0,
    spo2: patient.AVG_SPO2 || patient.spo2bl || 0,
    rr: patient.AVG_RR || patient.rrbl || 0,
    bp: patient.AVG_BP || patient.bpbl || 0,
  };

  useEffect(() => {
    // Reset the flag if the patient stabilizes
    if (score < 60) {
      hasPlayedRef.current = false;
      return;
    }

    // Check if we have a critical score and valid audio data
    if (score >= 60 && patient.AUDIO_DATA && !hasPlayedRef.current) {
      console.log(`🔊 Attempting alert for Bed ${patient.BED_NUMBER || patient.bed}`);
      
      const audio = new Audio(`data:audio/mpeg;base64,${patient.AUDIO_DATA}`);
      
      audio.play()
        .then(() => {
          hasPlayedRef.current = true; 
          console.log("✅ Playback successful");
        })
        .catch(e => {
          // This is usually the "NotAllowedError"
          console.warn("⚠️ Audio blocked: Click anywhere on the dashboard to enable alerts.", e);
        });
    }
  }, [score, patient.AUDIO_DATA, patient.BED_NUMBER, patient.bed]); 

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
          <div className="patient-name">{patient.NAME || patient.name}</div>
          <div className="patient-meta">
            Bed {patient.BED_NUMBER || patient.bed}{" "}
            <span className={`status-pill ${status}`}>{getStatusLabel(score)}</span>
          </div>
        </div>

        <div className="concern-badge">
          <div className="concern-score">{score}</div>
          <div className="concern-label">100</div>
        </div>
      </div>

      <div className="score-bar-wrap">
        <div className="score-bar">
          <div className="score-fill" style={{ width: `${score}%` }} />
        </div>
      </div>

      <div className="vitals-row">
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

      <div className="narrative">
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