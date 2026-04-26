import { query } from './snowflake.js';
import 'dotenv/config';

/**
 * Generates a calm, clinical AI observation using Snowflake Cortex (Llama 3).
 * @param {Object} patient - Patient metadata
 * @param {Array} vitalsHistory - Recent time-series vitals
 * @param {number} deviationScore - The calculated concern score
 * @param {Object} trajectory - Predicted future vitals
 */
export async function generatePatientNarrative({ patient, vitalsHistory, deviationScore, trajectory }) {
  
  // 1. Format history safely. 
  // Note: We use || to handle both uppercase and lowercase keys from Snowflake
  const vitalsText = vitalsHistory && vitalsHistory.length > 0 
    ? vitalsHistory.slice(-5).map(v =>
        `HR ${v.HEART_RATE || v.heart_rate}, SpO2 ${v.SPO2 || v.spo2}%`
      ).join(' -> ')
    : 'No recent history available.';

  const trajectoryText = trajectory
    ? `Projected state: HR ${trajectory.hr?.toFixed(0)}, SpO2 ${trajectory.spo2?.toFixed(1)}%`
    : 'Trajectory data unavailable.';

  // 2. Refined Prompt for Llama 3
  const prompt = `You are an AI clinical observer. 
    Write a brief, calm observation for a nurse's dashboard.

    PATIENT: ${patient.NAME || patient.name}, Bed ${patient.BED_NUMBER || patient.bed_number}
    CONCERN SCORE: ${deviationScore.toFixed(0)} / 100
    ${trajectoryText}

    RECENT TREND: ${vitalsText}

    BASELINES: HR ${patient.HR_BASELINE || patient.hr_baseline}, SpO2 ${patient.SPO2_BASELINE || patient.spo2_baseline}%

    INSTRUCTIONS:
    - Write 1-2 concise sentences.
    - Mention the actual numbers and the trend.
    - If score > 60, use an urgent but professional tone.
    - Do NOT start with "The patient" or "I".
    - Maximum 50 words. Output ONLY the clinical paragraph.`;

  // 3. Execute Cortex AI Inference
  // We use the 'NARRATIVE' alias to catch the result
  const sql = `SELECT SNOWFLAKE.CORTEX.COMPLETE('llama3-8b', ?) AS NARRATIVE`;

  try {
    const result = await query(sql, [prompt]);
    
    // Check if we got a valid response
    if (result && result.length > 0 && result[0].NARRATIVE) {
      return result[0].NARRATIVE.trim();
    }
    
    return "Analyzing vitals trend... waiting for more data points.";
  } catch (error) {
    console.error('[Narrative Engine] Cortex AI Error:', error.message);
    return "Clinical observation unavailable. Please check live monitor.";
  }
}