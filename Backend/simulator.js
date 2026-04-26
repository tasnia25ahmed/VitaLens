import { query } from './snowflake.js';

const patientStates = {};

function initState(p) {
  return {
    hr:   p.HR_BASELINE, 
    spo2: p.SPO2_BASELINE,
    rr:   p.RR_BASELINE,
    bp:   p.BP_BASELINE,
    driftFactor: 0,
    driftDirection: { hr: 0, spo2: 0, rr: 0, bp: 0 },
    cyclesRemaining: 0,
    demoRole: null // Added to track if they have a special role
  };
}

function jitter(val, range) {
  return +(val + (Math.random() - 0.5) * range).toFixed(1);
}

export async function runVitalsSimulator() {
  const patients = await query('SELECT * FROM PATIENTS');

  const inserts = patients.map(p => {
    if (!patientStates[p.PATIENT_ID]) {
      patientStates[p.PATIENT_ID] = initState(p);
    }

    const state = patientStates[p.PATIENT_ID];

    // --- NEW DEMO OVERRIDE LOGIC ---
    // Forces Bed 4 to be CRITICAL and Bed 3 to be WATCH
    if (p.BED_NUMBER === 4) {
        state.cyclesRemaining = 999; // Never recovers during demo
        state.driftFactor = 0.45;    // Large 45% drift
        state.driftDirection = { hr: 1, spo2: -1, rr: 1, bp: 0.5 }; // Crashing
    } 
    else if (p.BED_NUMBER === 3) {
        state.cyclesRemaining = 999; 
        state.driftFactor = 0.20;    // Moderate 20% drift
        state.driftDirection = { hr: 1, spo2: -1, rr: 0.5, bp: 0 }; // Drifting
    }
    // --- END DEMO OVERRIDE ---

    // Normal Deterioration Logic for all other beds
    else if (state.cyclesRemaining === 0 && Math.random() < 0.05) {
      state.cyclesRemaining = Math.floor(Math.random() * 20) + 10;
      state.driftFactor = Math.random() * 0.3 + 0.1;
      state.driftDirection = {
        hr: Math.random() > 0.3 ? 1 : -1,
        spo2: Math.random() > 0.7 ? 1 : -1,
        rr: Math.random() > 0.4 ? 1 : -1,
        bp: Math.random() > 0.5 ? 1 : -1
      };
    } else if (state.cyclesRemaining > 0 && p.BED_NUMBER !== 4 && p.BED_NUMBER !== 3 && Math.random() < 0.10) {
      state.cyclesRemaining = 0;
      state.driftFactor = 0;
    }

    // Apply drift if in deterioration event
    if (state.cyclesRemaining > 0) {
      if (p.BED_NUMBER !== 4 && p.BED_NUMBER !== 3) state.cyclesRemaining--;
      
      const hrDrift = p.HR_BASELINE * state.driftFactor * state.driftDirection.hr;
      const spo2Drift = p.SPO2_BASELINE * state.driftFactor * state.driftDirection.spo2;
      const rrDrift = p.RR_BASELINE * state.driftFactor * state.driftDirection.rr;
      const bpDrift = p.BP_BASELINE * state.driftFactor * state.driftDirection.bp;

      state.hr = jitter(state.hr * 0.7 + (p.HR_BASELINE + hrDrift) * 0.3, 4);
      state.spo2 = jitter(state.spo2 * 0.7 + (p.SPO2_BASELINE + spo2Drift) * 0.3, 1.5);
      state.rr = jitter(state.rr * 0.7 + (p.RR_BASELINE + rrDrift) * 0.3, 2);
      state.bp = jitter(state.bp * 0.7 + (p.BP_BASELINE + bpDrift) * 0.3, 5);
    } else {
      state.hr = jitter(state.hr * 0.85 + p.HR_BASELINE * 0.15, 2);
      state.spo2 = jitter(state.spo2 * 0.9 + p.SPO2_BASELINE * 0.1, 0.5);
      state.rr = jitter(state.rr * 0.85 + p.RR_BASELINE * 0.15, 1);
      state.bp = jitter(state.bp * 0.85 + p.BP_BASELINE * 0.15, 3);
    }

    // Clamp to realistic bounds
    state.hr = Math.max(40, Math.min(160, state.hr));
    state.spo2 = Math.max(70, Math.min(100, state.spo2));
    state.rr = Math.max(8, Math.min(40, state.rr));
    state.bp = Math.max(80, Math.min(200, state.bp));

    return query(
      `INSERT INTO VITALS_STREAM (patient_id, heart_rate, spo2, resp_rate, bp_systolic)
       VALUES (?, ?, ?, ?, ?)`,
      [p.PATIENT_ID, state.hr, state.spo2, state.rr, state.bp]
    );
  });

  await Promise.all(inserts);
  console.log(`[Simulator] Live: Bed 4 CRITICAL, Bed 3 WATCH, others STABLE.`);
}