import snowflake from 'snowflake-sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

let connection = null;

/**
 * Singleton pattern to manage the Snowflake connection.
 */
export function getConnection() {
  if (connection) return connection;
  
  const username = process.env.SNOWFLAKE_USERNAME || process.env.SNOWFLAKE_USER;
  
  if (!username) {
    console.error('ERROR: Snowflake credentials missing in .env file.');
  }
  
  connection = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: username,
    password: process.env.SNOWFLAKE_PASSWORD,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  });
  return connection;
}

/**
 * Promisified connection handshake.
 */
export function connectSnowflake() {
  return new Promise((resolve, reject) => {
    const conn = getConnection();
    conn.connect((err, conn) => {
      if (err) {
        console.error('[Snowflake] Connection Failed:', err.message);
        reject(err);
      } else {
        console.log('[Snowflake] Connected as ID:', conn.getId());
        resolve(conn);
      }
    });
  });
}

/**
 * General-purpose query runner.
 */
export function query(sql, binds = []) {
  return new Promise((resolve, reject) => {
    getConnection().execute({
      sqlText: sql,
      binds,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows);
      },
    });
  });
}

/**
 * Sets up the Tables. Note: Added AUDIO_DATA to CONCERN_LOG.
 */
export async function bootstrapSchema() {
  // 1. Patients Table
  await query(`
    CREATE TABLE IF NOT EXISTS PATIENTS (
      patient_id    VARCHAR PRIMARY KEY,
      name          VARCHAR NOT NULL,
      bed_number    INT NOT NULL,
      ward_id       INT DEFAULT 4,
      hr_baseline   FLOAT DEFAULT 72,
      spo2_baseline FLOAT DEFAULT 98,
      rr_baseline   FLOAT DEFAULT 14,
      bp_baseline   FLOAT DEFAULT 120
    )
  `);

  // 2. Vitals Stream Table
  await query(`
    CREATE TABLE IF NOT EXISTS VITALS_STREAM (
      reading_id   VARCHAR DEFAULT UUID_STRING() PRIMARY KEY,
      patient_id   VARCHAR REFERENCES PATIENTS(patient_id),
      recorded_at  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
      heart_rate   FLOAT,
      spo2         FLOAT,
      resp_rate    FLOAT,
      bp_systolic  FLOAT
    )
  `);

  // 3. Concern Log Table
  await query(`
    CREATE TABLE IF NOT EXISTS CONCERN_LOG (
      log_id          VARCHAR DEFAULT UUID_STRING() PRIMARY KEY,
      patient_id      VARCHAR REFERENCES PATIENTS(patient_id),
      generated_at    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
      concern_score   FLOAT,
      narrative_text  VARCHAR,
      audio_data      TEXT, 
      trajectory_json VARIANT
    )
  `);

  console.log('[Snowflake] Architecture validated.');
}

/**
 * Seeds the 12-bed ward.
 */
export async function seedPatients() {
  const existing = await query(`SELECT COUNT(*) AS cnt FROM PATIENTS`);
  if (existing[0].CNT >= 12) return; 

  const patients = [
    ['pt-001', 'Margaret Chen',   1, 74, 97, 15, 118],
    ['pt-002', 'Raj Patel',       2, 68, 98, 13, 125],
    ['pt-003', 'Amara Osei',      3, 80, 96, 16, 130],
    ['pt-004', 'Luca Moretti',    4, 99, 95, 16, 118],
    ['pt-005', 'Sofia Andersen',  5, 65, 97, 12, 122],
    ['pt-006', 'James Okwu',      6, 78, 98, 15, 128],
    ['pt-007', 'Yuki Tanaka',     7, 70, 99, 13, 116],
    ['pt-008', 'Elena Vasquez',   8, 75, 96, 16, 132],
    ['pt-009', 'David Miller',    9, 83, 98, 12, 111],
    ['pt-010', 'Aisha Khan',     10, 66, 97, 15, 131],
    ['pt-011', "Liam O'Brien",   11, 84, 98, 16, 119],
    ['pt-012', 'Chen Wei',       12, 84, 97, 12, 137],
  ];

  for (const [id, name, bed, hr, spo2, rr, bp] of patients) {
    await query(
      `INSERT INTO PATIENTS (patient_id, name, bed_number, ward_id, hr_baseline, spo2_baseline, rr_baseline, bp_baseline) 
       VALUES (?, ?, ?, 4, ?, ?, ?, ?)`,
      [id, name, bed, hr, spo2, rr, bp]
    );
  }
  console.log('[Snowflake] Ward seeded.');
}

// --- CLINICAL QUERIES ---

export async function getPatientVitalsHistory(patientId) {
  return await query(`
    SELECT recorded_at, heart_rate, spo2, resp_rate, bp_systolic
    FROM VITALS_STREAM
    WHERE patient_id = ?
    AND recorded_at > DATEADD(minute, -30, CURRENT_TIMESTAMP())
    ORDER BY recorded_at ASC
  `, [patientId]);
}

export async function getPatientDeviationScores() {
  return await query(`
    WITH recent AS (
      SELECT
        v.patient_id, p.name, p.bed_number,
        p.hr_baseline, p.spo2_baseline, p.rr_baseline, p.bp_baseline,
        AVG(v.heart_rate)  AS avg_hr,
        AVG(v.spo2)        AS avg_spo2,
        AVG(v.resp_rate)   AS avg_rr,
        AVG(v.bp_systolic) AS avg_bp,
        AVG(CASE WHEN v.recorded_at > DATEADD(minute, -5, CURRENT_TIMESTAMP()) THEN v.heart_rate END)
          - AVG(CASE WHEN v.recorded_at BETWEEN DATEADD(minute, -10, CURRENT_TIMESTAMP()) AND DATEADD(minute, -5, CURRENT_TIMESTAMP()) THEN v.heart_rate END) AS hr_trend,
        AVG(CASE WHEN v.recorded_at > DATEADD(minute, -5, CURRENT_TIMESTAMP()) THEN v.spo2 END)
          - AVG(CASE WHEN v.recorded_at BETWEEN DATEADD(minute, -10, CURRENT_TIMESTAMP()) AND DATEADD(minute, -5, CURRENT_TIMESTAMP()) THEN v.spo2 END) AS spo2_trend
      FROM VITALS_STREAM v
      JOIN PATIENTS p ON v.patient_id = p.patient_id
      WHERE v.recorded_at > DATEADD(minute, -30, CURRENT_TIMESTAMP())
      GROUP BY 1,2,3,4,5,6,7
    )
    SELECT
      patient_id, name, bed_number,
      avg_hr, avg_spo2, avg_rr, avg_bp,
      hr_trend, spo2_trend,
      ROUND(LEAST(100, GREATEST(0,
        (ABS(avg_hr - hr_baseline) / NULLIF(hr_baseline,0)) * 100 * 0.25
      + (ABS(avg_spo2 - spo2_baseline) / NULLIF(spo2_baseline,0)) * 100 * 0.40
      + (ABS(avg_rr - rr_baseline) / NULLIF(rr_baseline,0)) * 100 * 0.20
      + (ABS(avg_bp - bp_baseline) / NULLIF(bp_baseline,0)) * 100 * 0.15
      + CASE WHEN spo2_trend < -1 THEN 25 ELSE 0 END
      + CASE WHEN hr_trend > 5 THEN 15 ELSE 0 END
      -- Absolute clinical thresholds for demo-critical vitals
      + CASE WHEN avg_spo2 < 86 THEN 50 WHEN avg_spo2 < 90 THEN 35 WHEN avg_spo2 < 92 THEN 15 ELSE 0 END
      + CASE WHEN avg_hr > 115 THEN 30 WHEN avg_hr > 110 THEN 15 WHEN avg_hr < 50 THEN 30 ELSE 0 END
      + CASE WHEN avg_rr > 28 THEN 20 WHEN avg_rr > 22 THEN 10 ELSE 0 END
      + CASE WHEN avg_bp > 160 OR avg_bp < 90 THEN 15 ELSE 0 END
      ))) AS concern_score
    FROM recent
    ORDER BY concern_score DESC
  `);
}

export async function getLatestConcernLogs() {
  return await query(`
    SELECT p.PATIENT_ID, p.NAME, p.BED_NUMBER, 
    COALESCE(cl.CONCERN_SCORE, 0) AS CONCERN_SCORE, 
    COALESCE(cl.NARRATIVE_TEXT, 'No active concerns.') AS NARRATIVE_TEXT,
    cl.AUDIO_DATA,
    p.HR_BASELINE AS AVG_HR, p.SPO2_BASELINE AS AVG_SPO2, p.RR_BASELINE AS AVG_RR, p.BP_BASELINE AS AVG_BP
    FROM PATIENTS p
    LEFT JOIN (
      SELECT PATIENT_ID, CONCERN_SCORE, NARRATIVE_TEXT, AUDIO_DATA,
             ROW_NUMBER() OVER (PARTITION BY PATIENT_ID ORDER BY GENERATED_AT DESC) as rank
      FROM CONCERN_LOG
    ) cl ON p.PATIENT_ID = cl.PATIENT_ID AND cl.rank = 1
    ORDER BY CONCERN_SCORE DESC
  `);
}

export async function writeConcernLog({ patientId, score, narrative, trajectory, audioData }) {
  // Use SELECT instead of VALUES to bypass the PARSE_JSON limitation with bind variables
  const sql = `
    INSERT INTO CONCERN_LOG (PATIENT_ID, GENERATED_AT, CONCERN_SCORE, NARRATIVE_TEXT, TRAJECTORY_JSON, AUDIO_DATA) 
    SELECT ?, CURRENT_TIMESTAMP(), ?, ?, PARSE_JSON(?), ?
  `;
  
  const trajectoryJson = trajectory ? JSON.stringify(trajectory) : JSON.stringify({});
  
  try {
    return await query(sql, [patientId, score, narrative, trajectoryJson, audioData || null]);
  } catch (err) {
    console.error('[Snowflake] writeConcernLog Error:', err.message);
    throw err;
  }
}

/**
 * One-call initialization to be used in server.js startup.
 */
export async function initDatabase() {
  try {
    await connectSnowflake();
    await bootstrapSchema();
    await seedPatients();
    console.log('[Snowflake] Full system ready.');
  } catch (err) {
    console.error('[Snowflake] Init Error:', err);
    throw err;
  }
}