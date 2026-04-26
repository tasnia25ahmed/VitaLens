import React, { useEffect, useMemo, useState } from "react";
import "./VitaLens.css";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";
import PatientCard from "./components/PatientCard";
import PatientDetail from "./components/PatientDetail";
import HandoffView from "./components/HandoffView";
import AdminView from "./components/AdminView";

const getStatus = (score) => (score >= 60 ? "critical" : score >= 35 ? "watch" : "stable");

export default function VitaLensWardMonitoring() {
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState("dashboard");
  const [patientsData, setPatientsData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState("concern");
  const [selectedId, setSelectedId] = useState(null); // Use ID instead of Index for stability
  const [toast, setToast] = useState({ show: false, icon: "✓", msg: "" });
  const [clock, setClock] = useState("");

  // --- CLOCK LOGIC ---
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-CA", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // --- BACKEND SYNC (The Snowflake Handshake) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/dashboard');
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        
        setPatientsData(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch from Snowflake:", err);
      }
    };

    fetchData(); 
    const interval = setInterval(fetchData, 10000); // Sync every 10s
    return () => clearInterval(interval);
  }, []);

  // --- DATA TRANSFORMATION ---
  const patientsWithScores = useMemo(() => {
    if (!patientsData.length) return [];
    
    // Map Snowflake's UPPERCASE columns to our React component's expected camelCase props
    const processed = patientsData.map((p) => ({
      ...p,
      id: p.PATIENT_ID,
      name: p.NAME,
      bed: p.BED_NUMBER,
      score: p.CONCERN_SCORE || 0,
      narrative: p.NARRATIVE_TEXT || "Analyzing real-time vitals..."
    }));

    if (sortMode === "concern") processed.sort((a, b) => b.score - a.score);
    if (sortMode === "name") processed.sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === "bed") processed.sort((a, b) => a.bed - b.bed);
    
    return processed;
  }, [patientsData, sortMode]);

  // Derived Stats for Summary Cards
  const critical = patientsWithScores.filter((p) => p.score >= 60).length;
  const watch = patientsWithScores.filter((p) => p.score >= 35 && p.score < 60).length;
  const stable = patientsWithScores.filter((p) => p.score < 35).length;

  // --- UI HANDLERS ---
  const showToast = (icon, msg) => {
    setToast({ show: true, icon, msg });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2500);
  };

  const openDetail = (id) => {
    setSelectedId(id);
    setView("detail");
  };

  const selectedPatient = useMemo(() => 
    patientsWithScores.find(p => p.id === selectedId), 
    [patientsWithScores, selectedId]
  );

  // --- RENDER ---
  if (loading) return <div className="loading-screen">Synchronizing with Snowflake Ward...</div>;

  return (
    <div className="app" role="application" aria-label="VitaLens ward monitoring system">
      <Topbar clock={clock} />
      
      <Sidebar
        view={view}
        setView={setView}
        patients={patientsWithScores}
        critical={critical}
        onOpenDetail={openDetail}
      />

      <main className="main" id="main-content">
        {view === "dashboard" && (
          <section className="view active">
            <div className="page-header">
              <div>
                <h1 className="page-title">Ward Overview</h1>
                <p className="page-subtitle">
                  {patientsWithScores.length} beds active. Last updated: Just now
                </p>
              </div>

              <div className="sort-controls">
                <label className="form-label">Sort by</label>
                <select
                  className="form-input"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                >
                  <option value="concern">Concern</option>
                  <option value="name">Patient name</option>
                  <option value="bed">Bed number</option>
                </select>
              </div>
            </div>

            {/* Summary Strip (Now dynamic based on 12 beds) */}
            <div className="summary-strip">
              <div className="summary-card critical">
                <span className="summary-num">{critical}</span>
                <span className="summary-label">Critical</span>
              </div>
              <div className="summary-card watch">
                <span className="summary-num">{watch}</span>
                <span className="summary-label">Watch</span>
              </div>
              <div className="summary-card stable">
                <span className="summary-num">{stable}</span>
                <span className="summary-label">Stable</span>
              </div>
              <div className="summary-card total">
                <span className="summary-num">{patientsWithScores.length}</span>
                <span className="summary-label">Total Beds</span>
              </div>
            </div>

            {/* Urgent Section */}
            <div className="section-head">
              <h2 className="section-title">Most Urgent</h2>
            </div>
            <div className="patient-grid">
              {patientsWithScores
                .filter((p) => p.score >= 60)
                .map((p) => (
                  <PatientCard
                    key={p.id}
                    patient={p}
                    score={p.score}
                    narrative={p.narrative}
                    onOpen={() => openDetail(p.id)}
                    onAcknowledge={() => showToast("✓", `${p.name} acknowledged`)}
                    onEscalate={() => showToast("!", `${p.name} escalated`)}
                  />
                ))}
            </div>

            {/* All Patients Section */}
            <div className="section-head" style={{ marginTop: "2rem" }}>
              <h2 className="section-title">All Patients</h2>
            </div>
            <div className="patient-grid">
              {patientsWithScores.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  score={p.score}
                  narrative={p.narrative}
                  onOpen={() => openDetail(p.id)}
                  onAcknowledge={() => showToast("✓", `${p.name} acknowledged`)}
                  onEscalate={() => showToast("!", `${p.name} escalated`)}
                />
              ))}
            </div>
          </section>
        )}

        {view === "detail" && selectedPatient && (
          <PatientDetail
            patient={selectedPatient}
            selectedScore={selectedPatient.score}
            selectedStatus={getStatus(selectedPatient.score)}
            onBack={() => setView("dashboard")}
            onAcknowledge={() => showToast("✓", `${selectedPatient.name} acknowledged`)}
            onEscalate={() => showToast("!", `${selectedPatient.name} escalated`)}
            narrative={selectedPatient.narrative}
          />
        )}

        {view === "handoff" && (
          <HandoffView patients={patientsWithScores} />
        )}

        {view === "admin" && (
          <AdminView 
            patients={patientsWithScores} 
            onToast={showToast} 
          />
        )}
      </main>

      <div className={`toast ${toast.show ? "show" : ""}`}>
        <span className="toast-icon">{toast.icon}</span>
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}