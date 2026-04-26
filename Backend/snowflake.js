import snowflake from 'snowflake-sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

let connection = null;

/**
 * Singleton pattern to manage the Snowflake connection.
 * Ensures we don't open a new connection every time a query is run.
 */
export function getConnection() {
  if (connection) return connection;
  
  // Support both SNOWFLAKE_USERNAME and SNOWFLAKE_USER for compatibility
  const username = process.env.SNOWFLAKE_USERNAME || process.env.SNOWFLAKE_USER;
  
  if (!username) {
    console.error('ERROR: Neither SNOWFLAKE_USERNAME nor SNOWFLAKE_USER is set in environment.');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SNOWFLAKE')));
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
 * Initializes the handshake with Snowflake.
 */
export function connectSnowflake() {
  return new Promise((resolve, reject) => {
    const conn = getConnection();
    conn.connect((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

/**
 * General-purpose query runner.
 * @param {string} sql - The SQL query to execute.
 * @param {Array} binds - The parameters to safely inject into the SQL.
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

// ── DATA GOVERNANCE: Schema Setup ─────────────────────────────────────────────
/**
 * Creates the necessary database tables if they do not already exist.
 * This ensures the application is "self-healing" on a new Snowflake account.
 */
export async function bootstrapSchema() {
  // Table 1: Static patient data and their clinical baselines
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

  // Table 2: Time-series vitals (the 'firehose' of data)
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

  // Table 3: Audit log for AI-generated clinical insights
  await query(`
    CREATE TABLE IF NOT EXISTS CONCERN_LOG (
      log_id          VARCHAR DEFAULT UUID_STRING() PRIMARY KEY,
      patient_id      VARCHAR REFERENCES PATIENTS(patient_id),
      generated_at    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
      concern_score   FLOAT,
      narrative_text  VARCHAR,
      audio_url       VARCHAR,
      trajectory_json VARIANT
    )
  `);

  console.log('[Snowflake] Database architecture validated.');
}

// ── KAGGLE INTEGRATION: Data Seeding ─────────────────────────────────────────
/**
 * Populates the ward with 12 patients using baseline data derived from Kaggle.
 * This serves as the 'Anchor' for the real-time simulator.
 */
export async function seedPatients() {
  const existing = await query(`SELECT COUNT(*) AS cnt FROM PATIENTS`);
  if (existing[0].CNT >= 12) return; 

  await query(`DELETE FROM PATIENTS`);

  const patients = [
    ['pt-001', 'Margaret Chen',   1, 74, 97, 15, 118],
    ['pt-002', 'Raj Patel',       2, 68, 98, 13, 125],
    ['pt-003', 'Amara Osei',      3, 80, 96, 16, 130],
    ['pt-004', 'Luca Moretti',    4, 99, 95, 16, 118], // High HR demo case
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
  console.log('[Snowflake] 12-Bed ward seeded successfully.');
}

// ── CLINICAL INTELLIGENCE: Scoring Algorithm ──────────────────────────────────
/**
 * Calculates the 'Concern Score' for each patient.
 * The score is based on the % deviation from THEIR specific baseline.
 * SpO2 carries the most weight (40%) as it is the most critical survival metric.
 */
export async function getPatientDeviationScores() {
  return query(`
    WITH recent AS (
      SELECT
        v.patient_id, p.name, p.bed_number,
        p.hr_baseline, p.spo2_baseline, p.rr_baseline, p.bp_baseline,
        AVG(v.heart_rate)  AS avg_hr,
        AVG(v.spo2)        AS avg_spo2,
        AVG(v.resp_rate)   AS avg_rr,
        AVG(v.bp_systolic) AS avg_bp,
        -- Trend calculation: Is the patient getting better or worse?
        AVG(CASE WHEN v.recorded_at > DATEADD(minute, -5, CURRENT_TIMESTAMP()) THEN v.heart_rate END)
          - AVG(CASE WHEN v.recorded_at BETWEEN DATEADD(minute, -10, CURRENT_TIMESTAMP()) 
                                            AND DATEADD(minute, -5, CURRENT_TIMESTAMP()) 
                THEN v.heart_rate END) AS hr_trend,
        AVG(CASE WHEN v.recorded_at > DATEADD(minute, -5, CURRENT_TIMESTAMP()) THEN v.spo2 END)
          - AVG(CASE WHEN v.recorded_at BETWEEN DATEADD(minute, -10, CURRENT_TIMESTAMP()) 
                                            AND DATEADD(minute, -5, CURRENT_TIMESTAMP()) 
                THEN v.spo2 END) AS spo2_trend
      FROM VITALS_STREAM v
      JOIN PATIENTS p ON v.patient_id = p.patient_id
      WHERE v.recorded_at > DATEADD(minute, -30, CURRENT_TIMESTAMP())
      GROUP BY 1,2,3,4,5,6,7
    )
    SELECT
      patient_id, name, bed_number,
      avg_hr, avg_spo2, avg_rr, avg_bp,
      hr_trend, spo2_trend,
      -- Math: (Current - Baseline) / Baseline * Weights
      ROUND(LEAST(100, GREATEST(0,
        (ABS(avg_hr   - hr_baseline)   / NULLIF(hr_baseline,0))   * 100 * 0.25
      + (ABS(avg_spo2 - spo2_baseline) / NULLIF(spo2_baseline,0)) * 100 * 0.40
      + (ABS(avg_rr   - rr_baseline)   / NULLIF(rr_baseline,0))   * 100 * 0.20
      + (ABS(avg_bp   - bp_baseline)   / NULLIF(bp_baseline,0))   * 100 * 0.15
      -- Penalties for rapid deterioration
      + CASE WHEN spo2_trend < -1 THEN 25 ELSE 0 END
      + CASE WHEN hr_trend   > 5  THEN 15 ELSE 0 END
      ))) AS concern_score
    FROM recent
    ORDER BY concern_score DESC
  `);
  }

/**
 * Returns ALL 12 patients with their latest concern scores and narratives.
 * Falls back to stable defaults if no logs exist yet.
 */
export async function getLatestConcernLogs() {
  const sql = `
    SELECT 
      p.PATIENT_ID, 
      p.NAME, 
      p.BED_NUMBER, 
      COALESCE(cl.CONCERN_SCORE, 0) AS CONCERN_SCORE, 
      COALESCE(cl.NARRATIVE_TEXT, 'No active concerns. Patient vitals within normal range.') AS NARRATIVE_TEXT,
      p.HR_BASELINE AS AVG_HR,
      p.SPO2_BASELINE AS AVG_SPO2,
      p.RR_BASELINE AS AVG_RR,
      p.BP_BASELINE AS AVG_BP
    FROM PATIENTS p
    LEFT JOIN (
      SELECT PATIENT_ID, CONCERN_SCORE, NARRATIVE_TEXT
      FROM CONCERN_LOG
      WHERE GENERATED_AT = (
        SELECT MAX(GENERATED_AT)
        FROM CONCERN_LOG AS sub
        WHERE sub.PATIENT_ID = CONCERN_LOG.PATIENT_ID
      )
    ) cl ON p.PATIENT_ID = cl.PATIENT_ID
    ORDER BY CONCERN_SCORE DESC;
  `;
  
  return await query(sql); 
}

/**
 * Fetches the last 30 minutes of vital signs for a specific patient.
 * Used to populate the trend charts in the PatientDetail view.
 */
export async function getPatientVitalsHistory(patientId) {
  const sql = `
    SELECT 
      recorded_at,
      heart_rate,
      spo2,
      resp_rate,
      bp_systolic
    FROM VITALS_STREAM
    WHERE patient_id = ?
    AND recorded_at > DATEADD(minute, -30, CURRENT_TIMESTAMP())
    ORDER BY recorded_at ASC;
  `;
  
  return await query(sql, [patientId]);
}

// Update Table 3 in bootstrapSchema()
await query(`
  CREATE TABLE IF NOT EXISTS CONCERN_LOG (
    log_id          VARCHAR DEFAULT UUID_STRING() PRIMARY KEY,
    patient_id      VARCHAR REFERENCES PATIENTS(patient_id),
    generated_at    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    concern_score   FLOAT,
    narrative_text  VARCHAR,
    audio_data      TEXT, -- Add this to store the Base64 string
    trajectory_json VARIANT
  )
`);
/**
 * Writes the AI-generated clinical narrative and concern score to the audit log.
 */
export async function writeConcernLog({ patientId, score, narrative, trajectory }) {
  const sql = `
 INSERT INTO CONCERN_LOG (
      PATIENT_ID, 
      GENERATED_AT, 
      CONCERN_SCORE, 
      NARRATIVE_TEXT,
      TRAJECTORY_JSON
    ) VALUES (?, CURRENT_TIMESTAMP(), ?, ?, PARSE_JSON(?))
  `;
  const trajectoryJson = trajectory ? JSON.stringify(trajectory) : null;
  return await query(sql, [patientId, score, narrative, trajectoryJson]);
}
