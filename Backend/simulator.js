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
    cyclesRemaining: 0
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

    const state = patientStates[p.PATIENT_ID]; // 'state' is defined here...

    // --- DEMO OVERRIDE (Forcing "Scary" Data for Cortex AI) ---
    if (p.BED_NUMBER === 4) {
        state.cyclesRemaining = 999;
        state.driftFactor = 0.50; 
        state.driftDirection = { hr: 1.2, spo2: -1.5, rr: 1.2, bp: -0.8 }; 
    } 
    else if (p.BED_NUMBER === 3) {
        state.cyclesRemaining = 999; 
        state.driftFactor = 0.25; 
        state.driftDirection = { hr: 0.8, spo2: -0.6, rr: 0.5, bp: 0.2 }; 
    }

    if (state.cyclesRemaining > 0) {
      if (p.BED_NUMBER !== 4 && p.BED_NUMBER !== 3) state.cyclesRemaining--;
      
      const hrTarget = p.HR_BASELINE + (p.HR_BASELINE * state.driftFactor * state.driftDirection.hr);
      const spo2Target = p.SPO2_BASELINE + (p.SPO2_BASELINE * state.driftFactor * state.driftDirection.spo2);
      
      state.hr = jitter(state.hr * 0.4 + hrTarget * 0.6, 5);
      state.spo2 = jitter(state.spo2 * 0.4 + spo2Target * 0.6, 2);
    } else {
      state.hr = jitter(p.HR_BASELINE, 3);
      state.spo2 = jitter(p.SPO2_BASELINE, 1);
    }

    // Force Bed 4 to be Critical so you can test audio and Cortex AI
    if (p.BED_NUMBER === 4) {
        state.spo2 = Math.min(87.5, state.spo2);
        state.hr = Math.max(115, state.hr);
    }

    state.hr = Math.max(40, Math.min(160, state.hr));
    state.spo2 = Math.max(70, Math.min(100, state.spo2));

    return query(
      `INSERT INTO VITALS_STREAM (patient_id, heart_rate, spo2, resp_rate, bp_systolic)
       VALUES (?, ?, ?, ?, ?)`,
      [p.PATIENT_ID, state.hr, state.spo2, state.rr, state.bp]
    );
  }); // ...but 'state' dies here when the map ends.

  await Promise.all(inserts);
  
  // FIXED: No longer referencing 'state' outside the loop
  console.log(`[Simulator] Vitals updated for ${patients.length} patients.`);
}