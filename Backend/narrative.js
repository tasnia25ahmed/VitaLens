import { query } from './snowflake.js';
import 'dotenv/config';

/**
 * Generates a calm, clinical AI observation using Snowflake Cortex (Llama 3).
 * This replaces the previous Vultr/Gemma implementation.
 * * @param {Object} patient - Patient metadata (Name, Bed, Baselines)
 * @param {Array} vitalsHistory - Recent time-series vitals from Snowflake
 * @param {number} deviationScore - The calculated clinical concern score
 * @param {Object} trajectory - Predicted future vitals
 */
export async function generatePatientNarrative({ patient, vitalsHistory, deviationScore, trajectory }) {
  
  // Format the history into a readable string for the LLM
  const vitalsText = vitalsHistory.slice(0, 8).map(v =>
    `${v.TIME}: HR ${v.HEART_RATE}, SpO2 ${v.SPO2}%, RR ${v.RESP_RATE}, BP ${v.BP_SYSTOLIC}`
  ).join('\\n');

  const trajectoryText = trajectory
    ? `Projected state: HR ${trajectory.hr?.toFixed(0)}, SpO2 ${trajectory.spo2?.toFixed(1)}%`
    : 'Trajectory data unavailable.';

  // Your original prompt logic, refined for the Cortex engine
  const prompt = `You are GhostRound, an AI clinical observer. 
    Whisper a brief, calm, specific observation to the night nurse.

    PATIENT: ${patient.NAME}, Bed ${patient.BED_NUMBER}
    CONCERN SCORE: ${deviationScore.toFixed(0)} / 100
    ${trajectoryText}

    RECENT VITALS:
    ${vitalsText}

    BASELINES: HR ${patient.HR_BASELINE}, SpO2 ${patient.SPO2_BASELINE}%, RR ${patient.RR_BASELINE}

    INSTRUCTIONS:
    - Write 2-4 sentences.
    - Mention actual numbers and trends.
    - Suggest one action if score > 40.
    - Do NOT start with "I" or the patient's name.
    - Maximum 80 words. Only output the paragraph.`;

  // Use Snowflake Cortex for inference
  const sql = `SELECT SNOWFLAKE.CORTEX.COMPLETE('llama3-8b', ?) AS NARRATIVE`;

  try {
    const result = await query(sql, [prompt]);
    // Snowflake returns results in an array; we grab the NARRATIVE column from the first row
    return result[0].NARRATIVE.trim();
  } catch (error) {
    console.error('[Narrative Engine] Failed to generate AI whisper:', error);
    return "Clinical observation currently unavailable due to system sync.";
  }
}