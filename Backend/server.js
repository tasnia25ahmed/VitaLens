import express from 'express';
import cors from 'cors';
import { 
  initDatabase, 
  getPatientDeviationScores,
  getPatientVitalsHistory,
  writeConcernLog,
  getLatestConcernLogs
} from './snowflake.js';
import { runVitalsSimulator } from './simulator.js';
import { generatePatientNarrative } from './narrative.js';
import { textToSpeech } from './elevenlabs.js';

const app = express(); // <--- This MUST be defined here
app.use(cors());
app.use(express.json());

// Using real ElevenLabs TTS from elevenlabs.js

// --- INITIALIZATION & HEARTBEAT ---
async function startSystem() {
  try {
    await initDatabase();
    console.log('🚀 VitaLens Backend is LIVE on Snowflake/GCP');

    setInterval(async () => {
      try {
        console.log('--- Processing Ward Cycle ---');
        await runVitalsSimulator(); 
        const scores = await getPatientDeviationScores();

        for (const p of scores) {
          const currentScore = p.CONCERN_SCORE ?? p.concern_score ?? 0;

          if (currentScore >= 0) {
            const history = await getPatientVitalsHistory(p.PATIENT_ID || p.patient_id);
            const whisper = await generatePatientNarrative({
              patient: p,
              vitalsHistory: history,
              deviationScore: currentScore,
              urgency: currentScore > 60 ? 'CRITICAL' : 'STABLE'
            });

            let audioBase64 = null;
            if (currentScore > 60) {
              audioBase64 = await textToSpeech(`Attention: Bed ${p.BED_NUMBER || p.bed_number}, ${whisper}`);
            }

            await writeConcernLog({
              patientId: p.PATIENT_ID || p.patient_id,
              score: currentScore,
              narrative: whisper,
              audioData: audioBase64,
              trajectory: { 
                hr: (p.AVG_HR || 0) + (p.HR_TREND || 0), 
                spo2: (p.AVG_SPO2 || 0) + (p.SPO2_TREND || 0) 
              }
            });
          }
        }
      } catch (loopErr) {
        console.error('Error in Heartbeat Loop:', loopErr);
      }
    }, 10000); 

  } catch (err) {
    console.error('Failed to start system:', err);
    process.exit(1);
  }
}

// --- API ENDPOINTS ---
// Placing these clearly outside of startSystem()
app.get('/api/dashboard', async (req, res) => {
  try {
    const liveScores = await getPatientDeviationScores();
    const concernLogs = await getLatestConcernLogs();
    
    const merged = liveScores.map(p => {
      const pid = p.PATIENT_ID || p.patient_id;
      const log = concernLogs.find(l => (l.PATIENT_ID || l.patient_id) === pid);
      
      return {
        PATIENT_ID: pid,
        NAME: p.NAME || p.name,
        BED_NUMBER: p.BED_NUMBER || p.bed_number,
        CONCERN_SCORE: p.CONCERN_SCORE ?? p.concern_score ?? 0,
        AVG_HR: p.AVG_HR || 0,
        AVG_SPO2: p.AVG_SPO2 || 0,
        AVG_RR: p.AVG_RR || 0,
        AVG_BP: p.AVG_BP || 0,
        HR_TREND: p.HR_TREND || 0,
        SPO2_TREND: p.SPO2_TREND || 0,
        NARRATIVE_TEXT: log?.NARRATIVE_TEXT || log?.narrative_text || 'Analyzing real-time vitals...',
        AUDIO_DATA: log?.AUDIO_DATA || log?.audio_data || null
      };
    });
    
    res.json(merged);
  } catch (err) {
    console.error('Dashboard API error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// --- START SERVER ---
app.listen(3001, () => {
  console.log('Server listening on port 3001');
  startSystem();
});