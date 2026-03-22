const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
const AUTH_USERS_CSV_PATH = path.join(__dirname, 'auth_users.csv');
const RISK_ADJUSTMENTS_CSV_PATH = path.join(__dirname, 'risk_adjustments.csv');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

// Function to parse CSV
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].trim() : '';
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
function calculateRiskScore(user, alerts, behaviors, adjustments = []) {
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

  // 4. Manual risk adjustments
  const userAdjustments = adjustments.filter(a => a.UserID === user.UserID);
  userAdjustments.forEach(adj => {
    score += parseInt(adj.AdjustmentValue) || 0;
  });

  // Cap at 100, floor at 0
  return Math.max(0, Math.min(score, 100));
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

    let adjustments = [];
    if (fs.existsSync(RISK_ADJUSTMENTS_CSV_PATH)) {
      const adjustmentsContent = fs.readFileSync(RISK_ADJUSTMENTS_CSV_PATH, 'utf-8');
      adjustments = parseCSV(adjustmentsContent);
    }

    users.forEach(user => {
      user.RiskScore = calculateRiskScore(user, alerts, behaviors, adjustments);
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

    let adjustments = [];
    try {
      if (fs.existsSync(RISK_ADJUSTMENTS_CSV_PATH)) {
        const adjustmentsContent = fs.readFileSync(RISK_ADJUSTMENTS_CSV_PATH, 'utf-8');
        adjustments = parseCSV(adjustmentsContent);
      }
    } catch (e) {
      console.warn('Could not read risk_adjustments.csv, assuming empty', e);
    }

    const userIndex = users.findIndex(u => u.UserID === userId);
    if (userIndex !== -1) {
      const newScore = calculateRiskScore(users[userIndex], alerts, behaviors, adjustments);
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

// API endpoint to get user detail with risk breakdown
app.get('/api/user-detail/:userId', (req, res) => {
  const { userId } = req.params;

  try {
    const usersContent = fs.readFileSync(USERS_CSV_PATH, 'utf-8');
    const users = parseCSV(usersContent);
    const user = users.find(u => u.UserID === userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const alertsContent = fs.readFileSync(ALERTS_CSV_PATH, 'utf-8');
    const allAlerts = parseCSV(alertsContent);
    const userAlerts = allAlerts.filter(a => a.UserID === userId);

    // Load vulnerabilities and assets for enrichment
    let vulns = [];
    try {
      vulns = parseCSV(fs.readFileSync(path.join(__dirname, 'vulnerabilities.csv'), 'utf-8'));
    } catch (e) {}
    const vulnById = new Map();
    for (const v of vulns) vulnById.set(v.VulnID, v);

    let assets = [];
    try {
      assets = parseCSV(fs.readFileSync(path.join(__dirname, 'assets.csv'), 'utf-8'));
    } catch (e) {}
    const assetById = new Map();
    for (const a of assets) assetById.set(a.AssetID, a);

    // Enrich alerts
    const enrichedAlerts = userAlerts.map(a => {
      const vuln = vulnById.get(a.VulnID) || {};
      const asset = assetById.get(a.AssetID) || {};
      return {
        AlertID: a.AlertID,
        Date: a.Date,
        Severity: a.Severity,
        Status: a.Status,
        AlertSource: a.AlertSource,
        VulnName: vuln.Name || a.VulnID || 'N/A',
        CVE: vuln.CVE || 'N/A',
        AssetName: asset.AssetName || a.AssetID || 'N/A'
      };
    });

    // Compute breakdown
    let criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0;
    userAlerts.forEach(a => {
      switch (a.Severity) {
        case 'Critical': criticalCount++; break;
        case 'High': highCount++; break;
        case 'Medium': mediumCount++; break;
        case 'Low': lowCount++; break;
      }
    });

    const trainingPenalty = user.SecurityTrainingCompleted === 'False' ? 10 : 0;

    let behaviorImpact = 0;
    try {
      if (fs.existsSync(USER_BEHAVIORS_CSV_PATH)) {
        const behaviors = parseCSV(fs.readFileSync(USER_BEHAVIORS_CSV_PATH, 'utf-8'));
        const userBehaviors = behaviors.filter(b => b.UserID === userId);
        userBehaviors.forEach(b => {
          behaviorImpact += Math.floor((parseInt(b.RiskImpact) || 0) / 2);
        });
      }
    } catch (e) {}

    let adjustments = [];
    let manualAdjustment = 0;
    try {
      if (fs.existsSync(RISK_ADJUSTMENTS_CSV_PATH)) {
        const allAdjustments = parseCSV(fs.readFileSync(RISK_ADJUSTMENTS_CSV_PATH, 'utf-8'));
        adjustments = allAdjustments.filter(a => a.UserID === userId);
        adjustments.forEach(a => {
          manualAdjustment += parseInt(a.AdjustmentValue) || 0;
        });
      }
    } catch (e) {}

    const calculatedTotal = (criticalCount * 10) + (highCount * 5) + (mediumCount * 2) + (lowCount * 1) + trainingPenalty + behaviorImpact + manualAdjustment;
    const finalScore = Math.max(0, Math.min(calculatedTotal, 100));

    res.json({
      user: {
        UserID: user.UserID,
        User: user.User,
        Department: user.Department,
        SecurityTrainingCompleted: user.SecurityTrainingCompleted,
        RiskScore: finalScore
      },
      breakdown: {
        criticalAlerts: { count: criticalCount, points: criticalCount * 10 },
        highAlerts: { count: highCount, points: highCount * 5 },
        mediumAlerts: { count: mediumCount, points: mediumCount * 2 },
        lowAlerts: { count: lowCount, points: lowCount * 1 },
        trainingPenalty,
        behaviorImpact,
        manualAdjustment,
        calculatedTotal,
        finalScore
      },
      alerts: enrichedAlerts,
      adjustments
    });
  } catch (error) {
    console.error('Error getting user detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to add manual risk adjustment
app.post('/api/risk-adjustment', (req, res) => {
  const { userId, adjustmentValue, comment } = req.body;

  if (!userId || adjustmentValue === undefined || !comment) {
    return res.status(400).json({ success: false, error: 'Missing required fields: userId, adjustmentValue, comment' });
  }

  const numValue = parseInt(adjustmentValue);
  if (isNaN(numValue) || numValue === 0) {
    return res.status(400).json({ success: false, error: 'adjustmentValue must be a non-zero number' });
  }

  // Verify user exists
  const usersContent = fs.readFileSync(USERS_CSV_PATH, 'utf-8');
  const users = parseCSV(usersContent);
  if (!users.find(u => u.UserID === userId)) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  try {
    // Initialize file if it doesn't exist
    if (!fs.existsSync(RISK_ADJUSTMENTS_CSV_PATH)) {
      fs.writeFileSync(RISK_ADJUSTMENTS_CSV_PATH, 'AdjustmentID,UserID,AdjustmentValue,Comment,Timestamp,AdjustedBy\n');
    }

    // Generate next adjustment ID
    const existingContent = fs.readFileSync(RISK_ADJUSTMENTS_CSV_PATH, 'utf-8');
    const existing = parseCSV(existingContent);
    const nextNum = existing.length + 1;
    const adjustmentId = `ADJ-${String(nextNum).padStart(3, '0')}`;

    // Sanitize comment: remove commas and newlines to prevent CSV corruption
    const sanitizedComment = comment.replace(/[,\n\r]/g, ' ').trim();

    const timestamp = new Date().toISOString();
    const adjustedBy = 'admin';

    const newRow = `${adjustmentId},${userId},${numValue},${sanitizedComment},${timestamp},${adjustedBy}\n`;
    fs.appendFileSync(RISK_ADJUSTMENTS_CSV_PATH, newRow);

    // Recalculate user risk score
    const newScore = updateUserRiskScore(userId);

    res.json({ success: true, newRiskScore: newScore, adjustmentId });
  } catch (error) {
    console.error('Error adding risk adjustment:', error);
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

// Authentication API Endpoints
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Missing username or password' });
  }

  let users = [];
  if (fs.existsSync(AUTH_USERS_CSV_PATH)) {
    const content = fs.readFileSync(AUTH_USERS_CSV_PATH, 'utf-8');
    // Ensure the file is not empty before parsing
    if (content.trim()) {
      users = parseCSV(content);
    }
  } else {
    fs.writeFileSync(AUTH_USERS_CSV_PATH, "Username,PasswordHash,CreatedAt\n");
  }

  if (users.some(u => u.Username === username)) {
    return res.status(400).json({ success: false, error: 'Username already exists' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const date = new Date().toISOString();
    const newRow = `${username},${hash},${date}\n`;
    
    fs.appendFileSync(AUTH_USERS_CSV_PATH, newRow);
    
    res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Missing username or password' });
  }

  if (!fs.existsSync(AUTH_USERS_CSV_PATH)) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const content = fs.readFileSync(AUTH_USERS_CSV_PATH, 'utf-8');
  const users = parseCSV(content);
  
  const user = users.find(u => u.Username === username);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.PasswordHash);
  if (!isMatch) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username: user.Username }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({ success: true, token });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Alert email server running on port ${PORT}`);
  console.log('Watching alerts.csv for changes...');
  recalculateAllUserRiskScores();
});
