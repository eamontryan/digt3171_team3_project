# Security Posture Dashboard

A dynamic, data-driven **Security Posture Dashboard** designed to monitor alerts, vulnerabilities, assets, and user risk using live CSV-based data sources. The project simulates real-world security monitoring, prioritization, and alerting workflows commonly used in modern security teams.

**Course:** DIGT 3171  
**Team:** Sienna Markham, Mahjabin Mollah, Eamon Ryan  
**Repository:** https://github.com/eamontryan/digt3171_team3_project

---

## 📌 Project Overview

The Security Posture Dashboard transforms static security data into an interactive monitoring system. It provides visibility into:

- User risk levels based on historical behavior  
- Asset exposure and severity prioritization  
- Vulnerability impact and CVE metadata  
- Simulated real-time alerting and notifications  

The system is intentionally lightweight and transparent, using CSV files as data sources to model how security data flows through a SOC dashboard.

---

## 🚀 Key Features

### 🔐 User Risk Scoring
- Dynamic risk scoring engine that recalculates scores on server startup to prevent data drift.
- Risk scores are derived from alert history and categorized using standardized severity buckets (Low, Medium, High, Critical).
- Scoring logic is calibrated to prevent users from reaching maximum risk too quickly, producing more realistic results.
- Clicking any user opens a detail modal with a full risk breakdown, associated alerts, and the ability to submit manual risk score adjustments with justification comments.

### 🖥️ Asset Tracking & Analysis
- Asset inventory dynamically aggregates:
  - Total alert counts per asset
  - Highest observed severity per asset
- Enables prioritization of critical infrastructure based on real alert data.

### 📊 Dynamic Dashboards
- All charts and tables update automatically based on CSV data.
- No hardcoded values in the UI.
- Reflects changes immediately when data is updated.

### 🧾 CVE Detail Expansion
- Vulnerability table rows are interactive.
- Clicking a CVE opens a modal displaying extended metadata from `cve_stats.csv`, including:
  - CVSS score
  - Exploitability
  - Attack vector
  - Affected assets
  - Description and publication date

### 🚨 Simulated Real-Time Alerts
- Backend monitors `alerts.csv` for newly created alerts.
- Automatically sends an email notification when a new alert is detected.
- Includes an **Alert Simulation** feature allowing users to trigger test alerts and verify notifications.

### 📈 Advanced Analytics
- A dedicated **Analytics** section provides deeper insight into security posture through four visualizations:
  - **Department vs Severity Heatmap** — A color-coded matrix showing alert counts across each department and severity level, highlighting organizational risk hotspots.
  - **Severity Over Time** — A stacked area chart tracking how Critical, High, Medium, and Low alerts trend month-over-month, revealing whether the threat landscape is escalating.
  - **Vulnerability Risk Matrix** — A bubble chart plotting each CVE by Exploitability Score vs CVSS Score, with bubble size representing alert count. Helps prioritize remediation by visualizing which vulnerabilities are both high-impact and highly exploitable.
  - **Asset Risk Profile Radar** — A radar chart comparing asset types (Server, Cloud, Networking, Workstation) across five normalized dimensions: alert volume, severity level, vulnerability diversity, user exposure, and critical alert rate.

### 🔀 Sortable Tables
- Vulnerability and Asset tables support sorting by:
  - Alphabetical order
  - Numeric values
  - Severity ranking (Critical → Low or Low → Critical)
- Improves usability and supports faster security analysis.

---

## 🧠 Design Notes

- Backend logic and UI labels are kept consistent to avoid misleading outputs.
- Derived data (like risk scores) is recalculated on startup to reduce drift.
- Dense security data is made readable using colour coding, sorting, and modal detail views.
- Real-time behavior is simulated via file monitoring and controlled data updates.

---

## 🗺️ Future Improvements

Planned enhancements include:
- Expanded alert management views
- UI/UX refinement
- Full testing and documentation pass
