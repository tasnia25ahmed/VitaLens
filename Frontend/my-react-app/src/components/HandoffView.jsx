import React from 'react';

const getStatus = (score) => (score >= 60 ? 'critical' : score >= 35 ? 'watch' : 'stable');

const HandoffView = ({ patients = [] }) => {
  const hasPatients = Array.isArray(patients) && patients.length > 0;

  return (
    <div className="handoff-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shift Review & Handoff</h1>
          <p className="page-subtitle">Summary of ward activity for the incoming team</p>
        </div>
      </div>

      {!hasPatients ? (
        <div className="empty-state">
          <p>No handoff patients available.</p>
        </div>
      ) : (
        <div className="timeline">
          {patients.map((p, idx) => {
            const status = getStatus(p.score ?? 0);
            return (
              <div className="timeline-item" key={p.id ?? idx}>
                <div className={`timeline-dot ${status}`}></div>
                <div className="timeline-content">
                  <div className="timeline-head">
                    <span className="timeline-patient">Bed {p.bed ?? p.id}: {p.name || 'Unknown Patient'}</span>
                    <span className="timeline-time">Last Updated: 02:15 AM</span>
                  </div>
                  <p className="timeline-narrative">{p.narrative || 'No narrative available.'}</p>
                  <div className="card-footer" style={{ border: 'none', padding: 0, marginTop: '10px' }}>
                    <span className="status-pill watch">{status === 'critical' ? 'Critical Trend' : status === 'watch' ? 'Watch Trend' : 'Stable Trend'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HandoffView;