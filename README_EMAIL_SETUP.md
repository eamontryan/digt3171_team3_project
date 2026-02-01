# Email Alert System Setup

This document explains how to set up and use the email alert system for the Security Posture Dashboard.

## Features

1. **Automatic Email Alerts**: Whenever a new alert is added to `alerts.csv`, an email is automatically sent to the configured email address
2. **Alert Simulation**: Users can simulate real-time alerting through the dashboard UI with a custom email recipient

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `nodemailer` - Email sending
- `cors` - Cross-origin resource sharing
- `chokidar` - File watching
- `dotenv` - Environment variable management

### 2. Configure Email Settings

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and configure your email settings:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ALERT_EMAIL=your-email@gmail.com
PORT=3000
```

**For Gmail users:**
1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Name the app (e.g Security Posture Dashboard)
   - Copy the 16-character password
   - Use this as your `EMAIL_PASS` (no spaces)

**For other email providers:**
- Update the `service` field in `server.js` or use SMTP settings

### 3. Start the Backend Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on port 3000 and begin watching `alerts.csv` for changes.

### 4. Open the Dashboard

In a new terminal run:

```
python -m http.server 8000
```
Open `http://localhost:8000/dashboard.html` in your browser. You should see an "Alert Simulation" button in the navbar.

## Usage

### Automatic Email Alerts

Whenever a new row is added to `alerts.csv`, the system will:
1. Detect the change automatically
2. Parse the new alert data
3. Send an email to the address specified in `ALERT_EMAIL` in your `.env` file

The email will have:
- Subject: `New Alert in SOC: [AlertID]`
- Body: Table with all alert details (AlertID, Date, Severity, Status, etc.)

### Manual Alert Simulation

1. Click the "Alert Simulation" button in the dashboard navbar
2. Enter your email address in the modal popup
3. Click "Trigger Alert"
4. A new alert will be created in `alerts.csv` with random data
5. An email will be sent to the provided email address

## Troubleshooting

### Email Not Sending

1. **Check your credentials**: Make sure `EMAIL_USER` and `EMAIL_PASS` are correct in `.env`
2. **Gmail App Password**: If using Gmail, ensure you're using an App Password, not your regular password
3. **Server running**: Make sure the backend server is running (`npm start`)
4. **Firewall/Network**: Check if your network allows SMTP connections

### Modal Not Appearing

1. Make sure the backend server is running
2. Check browser console for JavaScript errors
3. Ensure port 3000 is not blocked

### File Watcher Not Working

1. The file watcher triggers on `alerts.csv` changes
2. Make sure the server has read permissions for the file
3. Try restarting the server after modifying `alerts.csv`
```
