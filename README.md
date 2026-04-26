                                                    # VitaLens 🏥

<div align="center">

### *Timely clinical signals for the shift that needs them most.*


![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs)
![Snowflake](https://img.shields.io/badge/Snowflake-Cortex-29B5E8?style=for-the-badge&logo=snowflake)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-TTS-000000?style=for-the-badge)


</div>

---

## Project Introduction

**VitaLens** is a clinical AI monitoring dashboard built specifically for the night shift — powered by **Snowflake Cortex**, **Node.js**, and **ElevenLabs Text to Speech**. When the ward is quiet and the lights are low, VitaLens keeps watching. It checks every patient's vitals against clinically accepted thresholds, scores deviations, ranks the ward by urgency, and delivers a timely, spoken **signal** so the right patient gets attention before things escalate.


---

## 📝 Project Overview & Features

The night shift runs on fewer staff and longer stretches between check-ins. VitaLens is built for exactly that window — continuously monitoring every patient on the ward and surfacing the ones that need attention, ranked clearly, with a plain-English explanation of why.

Each patient's heart rate, respiratory rate, SpO2, and systolic blood pressure are checked against standard clinical ranges sourced from **NHS, WHO, and AHA guidelines** on every update cycle. Deviations are scored and ranked across the whole ward. Snowflake Cortex then generates a calm, specific narrative per patient — and ElevenLabs delivers it as a spoken alert so the nurse gets the right information at the right time, without hunting for it.

### ✨ Key Features

| | Feature | Description |
|---|---|---|
| 🛏️ | **12-Patient Dashboard** | Live patient cards showing name, HR, RR, SpO2, and systolic BP — updated every 15 minutes |
| 📊 | **Threshold Checking** | Vitals checked against NHS/WHO/AHA ranges: HR (60–100 bpm), RR (12–20 breaths/min), SpO2 (≥95%), Systolic BP (90–120 mmHg) |
| 🔢 | **Deviation Scoring & Ranking** | Patients scored by how far vitals sit outside normal ranges and ranked by urgency |
| 🧠 | **AI Narrative Generation** | Snowflake Cortex produces a calm, specific observation per patient — which thresholds are breached and by how much |
| 🔊 | **Spoken Nurse Alert** | ElevenLabs delivers the top concern as a natural, 30–60 second spoken brief |
| 🎨 | **Color-Coded Cards** | Each patient card shifts from green to deep red based on concern level |
| 🗂️ | **Audit Trail** | Every concern timestamped and logged with full reasoning inside Snowflake |
| ✅ | **Acknowledge & Escalate** | Nurses mark concerns reviewed or escalate directly from the dashboard |

### Concern Score Reference

| Score | Status | Color |
|---|---|---|
| 0–25 | Stable | 🟢 Green |
| 26–50 | Monitor | 🩵 blue |
| 51–75 | Watch | 🟡 yellow |
| 76–100 | Critical | 🔴 Red |

---

## ⛏️ Tech Stack, APIs & Resources

### Core Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Database + AI** | Snowflake + Cortex | Data storage, deviation scoring, and LLM narrative generation in one place — patient data never leaves the warehouse |
| **Audio** | ElevenLabs TTS | Converts the AI narrative into a natural spoken nurse alert |
| **Backend** | Node.js + Express | API server, Snowflake polling, ElevenLabs integration |
| **Frontend** | React | Patient card dashboard and detail panel |

### APIs & Clinical References

- 🔵 [Snowflake Cortex LLM Functions](https://docs.snowflake.com/en/user-guide/snowflake-cortex/llm-functions)
- 🎙️ [ElevenLabs API](https://docs.elevenlabs.io/)
- 🏥 [NHS Clinical Vital Signs Guidelines](https://www.nhs.uk)
- 🌍 [WHO Patient Safety Standards](https://www.who.int/teams/integrated-health-services/patient-safety)
- ❤️ [AHA Cardiovascular Health Guidelines](https://www.heart.org)

---

## 🧑‍💻 Getting Started

### Prerequisites

- ✅ Node.js v18+
- ✅ Snowflake account with Cortex enabled
- ✅ ElevenLabs API key

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/vitalens.git
cd vitalens

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
```


```bash
# 4. Bootstrap the Snowflake schema
npm run setup-db

# 5. Seed synthetic patient data
npm run seed

# 6. Start the server
npm run start

# 7. Open http://localhost:3000
```

### Using the Dashboard

1. The dashboard loads with **12 patient cards**, each showing name, HR, RR, SpO2, and systolic BP
2. Cards are **color-coded by concern level** — read the whole ward at a glance
3. Hit **Start Simulation** to begin the monitoring loop
4. Hit **Play Alert** to hear the spoken brief for the highest-concern patient
5. Click any **patient card** to open the detail panel — deviation score, AI narrative, and suggested next action
6. Hit **Acknowledge** to log the review or **Escalate** to flag for immediate attention


---

## 🔥 Conclusion & License

Thank you for checking out **VitaLens**! 🎉

The night shift deserves better tools, ones that are timely, calm, and genuinely useful when it matters most. If this resonates with you, give us a ⭐ on GitHub.



> ⚠️ VitaLens is a prototype built for demonstration purposes. It is not a certified medical device and should not be used for real clinical decision making.

---

<div align="center">

**Built with 💛 at BearHacks · 2026**

*Tasnia · Insha · Hiba*

</div>
