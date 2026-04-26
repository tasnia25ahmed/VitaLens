import express from 'express';
import cors from 'cors';
import { 
  connectSnowflake, 
  bootstrapSchema, 
  seedPatients, 
  getPatientDeviationScores,
  getPatientVitalsHistory,
  writeConcernLog,
  getLatestConcernLogs
} from './snowflake.js';
import { runVitalsSimulator } from './simulator.js';
import { generatePatientNarrative } from './narrative.js';

const app = express();
app.use(cors());
app.use(express.json());

// --- INITIALIZATION ---
async function startSystem() {
  try {
    await connectSnowflake();
    await bootstrapSchema();
    await seedPatients();
    console.log('🚀 VitaLens Backend is LIVE on Snowflake/GCP');

    // --- THE HEARTBEAT LOOP ---
    // Runs every 10 seconds to update all 12 beds
    setInterval(async () => {
      console.log('--- Processing Ward Cycle ---');

      // Inside your setInterval loop
for (const p of scores) {
  if (p.CONCERN_SCORE > 60) {
    // 1. Generate the narrative
    const whisper = await generatePatientNarrative({ ...p, urgency: 'CRITICAL' });

    // 2. ONLY generate audio if it's a high-priority alert
    // This saves your ElevenLabs credits and prevents "alarm fatigue"
    const audioBase64 = await textToSpeech(`Attention: Bed ${p.BED_NUMBER}, ${whisper}`);

    // 3. Save everything to Snowflake
    await writeConcernLog({
      patientId: p.PATIENT_ID,
      score: p.CONCERN_SCORE,
      narrative: whisper,
      audio_url: audioBase64, // You'll need to add this column to your table!
      trajectory: { hr: p.AVG_HR, spo2: p.AVG_SPO2 }
    });
  }
}
      
      // 1. Generate new Kaggle-based vitals
      await runVitalsSimulator(); 

      // 2. Calculate clinical concern scores
      const scores = await getPatientDeviationScores();

      // 3. Narrative Generation (The AI Whispers)
      for (const p of scores) {
        // Only trigger AI for patients who are actually drifting (Score > 40)
        if (p.CONCERN_SCORE > 40) {
          const history = await getPatientVitalsHistory(p.PATIENT_ID);
          const whisper = await generatePatientNarrative({
            patient: p,
            vitalsHistory: history,
            deviationScore: p.CONCERN_SCORE
          });

          await writeConcernLog({
            patientId: p.PATIENT_ID,
            score: p.CONCERN_SCORE,
            narrative: whisper,
            trajectory: { hr: p.AVG_HR + p.HR_TREND, spo2: p.AVG_SPO2 + p.SPO2_TREND }
          });
        }
      }
    }, 10000); 

  } catch (err) {
    console.error('Failed to start system:', err);
  }
}

// --- API ENDPOINTS FOR REACT ---
app.get('/api/dashboard', async (req, res) => {
  try {
    // 1. Get LIVE deviation scores from real vitals
    const liveScores = await getPatientDeviationScores();
    
    // 2. Get latest AI narratives from concern logs
    const concernLogs = await getLatestConcernLogs();
    
    // 3. Merge: live scores drive the status, narratives add the story
    const merged = liveScores.map(p => {
      const log = concernLogs.find(l => l.PATIENT_ID === p.PATIENT_ID);
      return {
        PATIENT_ID: p.PATIENT_ID,
        NAME: p.NAME,
        BED_NUMBER: p.BED_NUMBER,
        CONCERN_SCORE: p.CONCERN_SCORE,           // LIVE score from vitals
        AVG_HR: p.AVG_HR,
        AVG_SPO2: p.AVG_SPO2,
        AVG_RR: p.AVG_RR,
        AVG_BP: p.AVG_BP,
        HR_TREND: p.HR_TREND,
        SPO2_TREND: p.SPO2_TREND,
        NARRATIVE_TEXT: log?.NARRATIVE_TEXT || 'Analyzing real-time vitals...'
      };
    });
    
    res.json(merged);
  } catch (err) {
    console.error('Dashboard API error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.listen(3001, () => startSystem());
