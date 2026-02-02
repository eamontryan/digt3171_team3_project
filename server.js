const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Path to alerts.csv
const ALERTS_CSV_PATH = path.join(__dirname, 'alerts.csv');
const USER_BEHAVIORS_CSV_PATH = path.join(__dirname, 'user_behaviors.csv');
const USERS_CSV_PATH = path.join(__dirname, 'users.csv');

// Function to parse CSV
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }

  return data;
}

// Function to get the last alert from CSV
function getLastAlert() {
  const content = fs.readFileSync(ALERTS_CSV_PATH, 'utf-8');
  const alerts = parseCSV(content);
  return alerts[alerts.length - 1];
}

// Function to get CVE from VulnID
function getCVEFromVulnID(vulnID) {
  try {
    const vulnContent = fs.readFileSync(path.join(__dirname, 'vulnerabilities.csv'), 'utf-8');
    const vulns = parseCSV(vulnContent);
    const vuln = vulns.find(v => v.VulnID === vulnID);
    return vuln ? vuln.CVE : vulnID;
  } catch (error) {
    console.error('Error reading vulnerabilities.csv:', error);
    return vulnID;
  }
}

// Function to send email alert
async function sendAlertEmail(alertData, recipientEmail) {
  const cve = getCVEFromVulnID(alertData.VulnID);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: `New Alert in SOC: ${alertData.AlertID}`,
    html: `
      <h2>New Security Alert</h2>
      <table border="1" cellpadding="10" cellspacing="0">
        <tr><th>Alert ID</th><td>${alertData.AlertID}</td></tr>
        <tr><th>Date</th><td>${alertData.Date}</td></tr>
        <tr><th>Severity</th><td>${alertData.Severity}</td></tr>
        <tr><th>Status</th><td>${alertData.Status}</td></tr>
        <tr><th>Asset ID</th><td>${alertData.AssetID}</td></tr>
        <tr><th>User ID</th><td>${alertData.UserID}</td></tr>
        <tr><th>CVE</th><td>${cve}</td></tr>
        <tr><th>Alert Source</th><td>${alertData.AlertSource}</td></tr>
      </table>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipientEmail} for alert ${alertData.AlertID}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Function to write CSV
function writeCSV(filePath, data, headers) {
  const headerLine = headers.join(',');
  const lines = [headerLine];
  data.forEach(row => {
    const values = headers.map(header => row[header]);
    lines.push(values.join(','));
  });
  fs.writeFileSync(filePath, lines.join('\n'));
}

// Function to calculate risk score
function calculateRiskScore(user, alerts, behaviors) {
  let score = 0;

  // 1. Alert based score (LOWERED WEIGHTS)
  const userAlerts = alerts.filter(a => a.UserID === user.UserID);
  userAlerts.forEach(alert => {
    switch (alert.Severity) {
      case 'Critical': score += 10; break;
      case 'High': score += 5; break;
      case 'Medium': score += 2; break;
      case 'Low': score += 1; break;
    }
  });

  // 2. Training based score (LOWERED WEIGHT)
  if (user.SecurityTrainingCompleted === 'False') {
    score += 10;
  }

  // 3. Behavior based score (LOWERED WEIGHT: 50% of impact)
  const userBehaviors = behaviors.filter(b => b.UserID === user.UserID);
  userBehaviors.forEach(b => {
    score += Math.floor((parseInt(b.RiskImpact) || 0) / 2);
  });

  // Cap at 100
  return Math.min(score, 100);
}

// Function to recalculate ALL user scores on startup
function recalculateAllUserRiskScores() {
  try {
    console.log('Recalculating all user risk scores...');
    if (!fs.existsSync(USERS_CSV_PATH)) return;

    const usersContent = fs.readFileSync(USERS_CSV_PATH, 'utf-8');
    const users = parseCSV(usersContent);

    let alerts = [];
    if (fs.existsSync(ALERTS_CSV_PATH)) {
      const alertsContent = fs.readFileSync(ALERTS_CSV_PATH, 'utf-8');
      alerts = parseCSV(alertsContent);
    }

    let behaviors = [];
    if (fs.existsSync(USER_BEHAVIORS_CSV_PATH)) {
      const behaviorsContent = fs.readFileSync(USER_BEHAVIORS_CSV_PATH, 'utf-8');
      behaviors = parseCSV(behaviorsContent);
    }

    users.forEach(user => {
      user.RiskScore = calculateRiskScore(user, alerts, behaviors);
    });

    if (users.length > 0) {
      const headers = Object.keys(users[0]);
      writeCSV(USERS_CSV_PATH, users, headers);
      console.log('Risk scores updated successfully.');
    }
  } catch (error) {
    console.error('Error recalculating risk scores:', error);
  }
}

// Function to update user risk score
function updateUserRiskScore(userId) {
  try {
    const usersContent = fs.readFileSync(USERS_CSV_PATH, 'utf-8');
    const users = parseCSV(usersContent);

    const alertsContent = fs.readFileSync(ALERTS_CSV_PATH, 'utf-8');
    const alerts = parseCSV(alertsContent);

    let behaviors = [];
    try {
      if (fs.existsSync(USER_BEHAVIORS_CSV_PATH)) {
        const behaviorsContent = fs.readFileSync(USER_BEHAVIORS_CSV_PATH, 'utf-8');
        behaviors = parseCSV(behaviorsContent);
      }
    } catch (e) {
      console.warn('Could not read user_behaviors.csv, assuming empty', e);
    }

    const userIndex = users.findIndex(u => u.UserID === userId);
    if (userIndex !== -1) {
      const newScore = calculateRiskScore(users[userIndex], alerts, behaviors);
      users[userIndex].RiskScore = newScore;

      // Write back to users.csv
      if (users.length > 0) {
        const headers = Object.keys(users[0]);
        writeCSV(USERS_CSV_PATH, users, headers);
      }
      return newScore;
    }
    return null;
  } catch (error) {
    console.error('Error updating risk score:', error);
    return null;
  }
}

// Status check endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', server: 'node-backend' });
});

// API endpoint to log user behavior
// Helper to generate next Alert ID
function generateNextAlertID() {
  try {
    const content = fs.readFileSync(ALERTS_CSV_PATH, 'utf-8');
    const alerts = parseCSV(content);
    const lastAlertNum = alerts.length > 0 ? parseInt(alerts[alerts.length - 1].AlertID.split('-')[1]) : 0;
    const newAlertNum = lastAlertNum + 1;
    return `ALERT-${String(newAlertNum).padStart(3, '0')}`;
  } catch (e) {
    return 'ALERT-001';
  }
}

// API endpoint to log user behavior
app.post('/api/log-behavior', (req, res) => {
  console.log('Received log-behavior request body:', req.body);
  const { userId, behaviorType, riskImpact } = req.body;

  if (!userId || !behaviorType) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const risk = parseInt(riskImpact) || 0;
    let severity = 'Low';
    if (risk >= 20) severity = 'Critical';
    else if (risk >= 10) severity = 'High';
    else if (risk >= 5) severity = 'Medium';

    const alertID = generateNextAlertID();
    const today = new Date();
    const date = today.toISOString().split('T')[0];
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // Assign random asset for simulation context
    const assetIDs = ['AST-001', 'AST-002', 'AST-003', 'AST-004', 'AST-005'];
    const assetID = assetIDs[Math.floor(Math.random() * assetIDs.length)];

    // CSV Format: AlertID,Date,Month,Severity,Status,AssetID,UserID,VulnID,AlertSource
    const newRow = `${alertID},${date},${month},${severity},Open,${assetID},${userId},VULN-000,UserBehaviour\n`;

    fs.appendFileSync(ALERTS_CSV_PATH, newRow);

    const newScore = updateUserRiskScore(userId);

    res.json({ success: true, newRiskScore: newScore });
  } catch (error) {
    console.error('Error logging behavior:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to trigger alert simulation
app.post('/api/simulate-alert', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  try {
    // Read current alerts to determine next alert ID
    const content = fs.readFileSync(ALERTS_CSV_PATH, 'utf-8');
    const alerts = parseCSV(content);
    const lastAlertNum = alerts.length > 0 ? parseInt(alerts[alerts.length - 1].AlertID.split('-')[1]) : 0;
    const newAlertNum = lastAlertNum + 1;
    const newAlertID = `ALERT-${String(newAlertNum).padStart(3, '0')}`;

    // Generate random alert data
    const severities = ['Critical', 'High', 'Medium', 'Low'];
    const statuses = ['Open', 'Pending', 'Closed'];
    const sources = ['Vulnerability', 'UserBehaviour'];
    const assetIDs = ['AST-001', 'AST-002', 'AST-003', 'AST-004', 'AST-005', 'AST-006'];
    const userIDs = ['U001', 'U002', 'U003', 'U004', 'U005'];
    const vulnIDs = ['VULN-001', 'VULN-002', 'VULN-003', 'VULN-004', 'VULN-005', 'VULN-006', 'VULN-007', 'VULN-008', 'VULN-009', 'VULN-010', 'VULN-011', 'VULN-012'];

    const today = new Date();
    const date = today.toISOString().split('T')[0];
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const newAlert = {
      AlertID: newAlertID,
      Date: date,
      Month: month,
      Severity: severities[Math.floor(Math.random() * severities.length)],
      Status: statuses[Math.floor(Math.random() * statuses.length)],
      AssetID: assetIDs[Math.floor(Math.random() * assetIDs.length)],
      UserID: userIDs[Math.floor(Math.random() * userIDs.length)],
      VulnID: vulnIDs[Math.floor(Math.random() * vulnIDs.length)],
      AlertSource: sources[Math.floor(Math.random() * sources.length)]
    };

    // Append to CSV
    const newRow = `${newAlert.AlertID},${newAlert.Date},${newAlert.Month},${newAlert.Severity},${newAlert.Status},${newAlert.AssetID},${newAlert.UserID},${newAlert.VulnID},${newAlert.AlertSource}\n`;
    fs.appendFileSync(ALERTS_CSV_PATH, newRow);

    // Send email
    const emailResult = await sendAlertEmail(newAlert, email);

    res.json({
      success: emailResult.success,
      alert: newAlert,
      message: emailResult.success ? 'Alert created and email sent successfully' : 'Alert created but email failed'
    });
  } catch (error) {
    console.error('Error simulating alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// File watcher for alerts.csv
let lastAlertCount = 0;

// Initialize last alert count
try {
  const content = fs.readFileSync(ALERTS_CSV_PATH, 'utf-8');
  const alerts = parseCSV(content);
  lastAlertCount = alerts.length;
} catch (error) {
  console.error('Error reading initial alerts:', error);
}

// Watch for changes in alerts.csv
const watcher = chokidar.watch(ALERTS_CSV_PATH, {
  persistent: true,
  ignoreInitial: true
});

watcher.on('change', async () => {
  try {
    const content = fs.readFileSync(ALERTS_CSV_PATH, 'utf-8');
    const alerts = parseCSV(content);

    if (alerts.length > lastAlertCount) {
      // New alert(s) added
      const newAlerts = alerts.slice(lastAlertCount);

      for (const alert of newAlerts) {
        // Send to configured email (you can set this in environment variable)
        const defaultEmail = process.env.ALERT_EMAIL;
        if (defaultEmail) {
          await sendAlertEmail(alert, defaultEmail);
        }
      }

      lastAlertCount = alerts.length;
    }
  } catch (error) {
    console.error('Error processing alerts file change:', error);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Alert email server running on port ${PORT}`);
  console.log('Watching alerts.csv for changes...');
  recalculateAllUserRiskScores();
});
