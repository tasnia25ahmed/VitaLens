import React from 'react';

const PatientDetail = ({ patient }) => {
  if (!patient) return <div className="panel-body">Select a patient to view details.</div>;

  return (
    <div className="detail-grid">
      <div className="detail-main">
        <div className="detail-header">
          <div className="detail-avatar">{patient.id.slice(-2)}</div>
          <div>
            <h2 className="detail-name">{patient.name}</h2>
            <p className="detail-submeta">
              Bed {patient.id} • {patient.age} years old • Admitted 2 days ago
            </p>
          </div>
          <div className="detail-score-block">
            <div className="detail-score-num" style={{ color: 'var(--status-critical)' }}>
              84
            </div>
            <div className="detail-score-label">Concern Score</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Vitals Trend (Last 24h)</h3>
          </div>
          <div className="panel-body">
            <div className="chart-area">
              {/* Placeholder for your Sparkline Canvas/SVG */}
              <div className="loading-shimmer" style={{ height: '100%', opacity: 0.2 }}></div>
            </div>
            <div className="chart-labels">
              <span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>00:00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-aside">
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Clinical Narrative</h3>
          </div>
          <div className="panel-body">
            <div className="narrative">
              <p className="narrative-text">{patient.narrative}</p>
            </div>
          </div>
        </div>
        
        <button className="btn btn-teal" style={{ width: '100%', justifyContent: 'center' }}>
          Update Observation
        </button>
      </div>
    </div>
  );
};

export default PatientDetail;