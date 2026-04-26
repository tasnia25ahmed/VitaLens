import React from 'react';

const AdminView = ({ patients, onDeteriorate, onReset }) => {
  return (
    <div className="admin-grid">
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">System Configuration</h3>
        </div>
        <div className="panel-body">
          <div className="connection-status">
            <div className="connection-dot"></div>
            <span className="connection-text">
              Snowflake Instance: <strong>Connected</strong> (v2.4.1)
            </span>
          </div>
          
          <div className="form-group">
            <label className="form-label">AI Narrative Refresh Rate (ms)</label>
            <input type="number" className="form-input" defaultValue="5000" />
          </div>
          
          <div className="form-group">
            <label className="form-label">Alert Sensitivity Threshold</label>
            <input type="range" className="form-input" />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Simulation Controls</h3>
        </div>
        <div className="panel-body">
          <div className="sim-controls">
            {patients.map(p => (
              <div className="sim-patient-row" key={p.id}>
                <div>
                  <div className="sim-patient-name">{p.name}</div>
                  <div className="sim-patient-bed">Bed {p.id}</div>
                </div>
                <div className="sim-btn-group">
                  <button className="btn-sim-deteriorate" onClick={() => onDeteriorate(p.id)}>
                    Deteriorate
                  </button>
                  <button className="btn-sim-reset" onClick={() => onReset(p.id)}>
                    Reset
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminView;