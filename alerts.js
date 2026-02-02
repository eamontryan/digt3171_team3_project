// ----------------------------
// CSV PARSER
// ----------------------------
function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const entry = {};
    for (let j = 0; j < headers.length; j++) {
      entry[headers[j]] = values[j] ? values[j].trim() : '';
    }
    data.push(entry);
  }
  return data;
}

// ----------------------------
// SEVERITY HELPER
// ----------------------------
function getSeverityClass(severity) {
  if (!severity) return '';
  switch (severity.toLowerCase()) {
    case 'critical': return 'text-danger';
    case 'high': return 'text-warning';
    case 'medium': return 'text-info';
    case 'low': return 'text-success';
    default: return '';
  }
}

// ----------------------------
// GET CVE FROM VULN ID
// ----------------------------
async function getCVEFromVulnID(vulnID, vulnMap) {
  return vulnMap.get(vulnID) || vulnID;
}

// ----------------------------
// GLOBAL STATE
// ----------------------------
let allAlerts = [];
let vulnMap = new Map();

// ----------------------------
// LOAD VULNERABILITIES
// ----------------------------
async function loadVulnerabilities() {
  try {
    const response = await fetch('vulnerabilities.csv');
    if (!response.ok) throw new Error('vulnerabilities.csv not found');

    const vulns = parseCSV(await response.text());

    for (const vuln of vulns) {
      vulnMap.set(vuln.VulnID, vuln.CVE);
    }
  } catch (error) {
    console.error('Error loading vulnerabilities:', error);
  }
}

// ----------------------------
// LOAD ALERTS TABLE
// ----------------------------
async function loadAlertsTable() {
  try {
    const response = await fetch('alerts.csv');
    if (!response.ok) throw new Error('alerts.csv not found');

    allAlerts = parseCSV(await response.text());

    // Load vulnerabilities first
    await loadVulnerabilities();

    renderAlertsTable(allAlerts);
  } catch (error) {
    console.error('Error loading alerts:', error);
  }
}

// ----------------------------
// RENDER ALERTS TABLE
// ----------------------------
function renderAlertsTable(alerts) {
  const tbody = document.getElementById('alerts-table-body');
  const noResults = document.getElementById('noResults');
  const alertCount = document.getElementById('alertCount');

  if (!tbody) return;

  // Update count
  if (alertCount) {
    alertCount.textContent = `(${alerts.length})`;
  }

  if (alerts.length === 0) {
    tbody.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }

  noResults.style.display = 'none';

  let html = '';
  for (const alert of alerts) {
    const severityClass = getSeverityClass(alert.Severity);
    const cve = vulnMap.get(alert.VulnID) || alert.VulnID;

    html += `
      <tr>
        <td>${alert.AlertID || 'N/A'}</td>
        <td>${alert.Date || 'N/A'}</td>
        <td class="${severityClass}">${alert.Severity || 'N/A'}</td>
        <td>${alert.Status || 'N/A'}</td>
        <td>${alert.AssetID || 'N/A'}</td>
        <td>${alert.UserID || 'N/A'}</td>
        <td>${cve}</td>
        <td>${alert.AlertSource || 'N/A'}</td>
      </tr>
    `;
  }

  tbody.innerHTML = html;
}

// ----------------------------
// SEARCH FUNCTIONALITY
// ----------------------------
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchField = document.getElementById('searchField');
  const clearBtn = document.getElementById('clearSearch');

  if (!searchInput || !searchField) return;

  function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const field = searchField.value;

    if (!searchTerm) {
      renderAlertsTable(allAlerts);
      return;
    }

    const filtered = allAlerts.filter(alert => {
      const value = (alert[field] || '').toLowerCase();
      return value.includes(searchTerm);
    });

    renderAlertsTable(filtered);
  }

  searchInput.addEventListener('input', performSearch);
  searchField.addEventListener('change', performSearch);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      renderAlertsTable(allAlerts);
    });
  }
}

// ----------------------------
// ALERT SIMULATION MODAL
// ----------------------------
function setupAlertSimulationModal() {
  const modal = document.getElementById('alertSimulationModal');
  const btn = document.getElementById('alertSimulationBtn');
  const closeBtn = document.getElementById('alertModalClose');
  const triggerAlertBtn = document.getElementById('triggerAlertBtn');
  const alertMessage = document.getElementById('alertMessage');
  const alertEmailInput = document.getElementById('alertEmail');

  if (!modal || !btn) return;

  function openModal() {
    modal.classList.remove('modal-hidden');
    modal.classList.add('modal-visible');
    alertMessage.className = 'alert-message';
    alertMessage.textContent = '';
    alertEmailInput.value = '';
  }

  function closeModal() {
    modal.classList.add('modal-hidden');
    modal.classList.remove('modal-visible');
  }

  btn.onclick = openModal;
  if (closeBtn) closeBtn.onclick = closeModal;

  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  if (triggerAlertBtn) {
    triggerAlertBtn.onclick = async function() {
      const email = alertEmailInput.value.trim();

      if (!email) {
        alertMessage.className = 'alert-message error';
        alertMessage.textContent = 'Please enter a valid email address.';
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alertMessage.className = 'alert-message error';
        alertMessage.textContent = 'Please enter a valid email address.';
        return;
      }

      triggerAlertBtn.disabled = true;
      triggerAlertBtn.textContent = 'Creating Alert...';
      alertMessage.className = 'alert-message';
      alertMessage.textContent = '';

      try {
        const response = await fetch('http://localhost:3000/api/simulate-alert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: email })
        });

        const data = await response.json();

        if (data.success) {
          alertMessage.className = 'alert-message success';
          alertMessage.textContent = `Alert ${data.alert.AlertID} created successfully! Check your email.`;
          alertEmailInput.value = '';

          // Reload alerts table
          await loadAlertsTable();

          setTimeout(() => {
            closeModal();
          }, 3000);
        } else {
          alertMessage.className = 'alert-message error';
          alertMessage.textContent = `Error: ${data.error || 'Failed to create alert'}`;
        }
      } catch (error) {
        console.error('Error:', error);
        alertMessage.className = 'alert-message error';
        alertMessage.textContent = 'Error connecting to server. Make sure the backend is running on port 3000.';
      } finally {
        triggerAlertBtn.disabled = false;
        triggerAlertBtn.textContent = 'Trigger Alert';
      }
    };
  }
}

// ----------------------------
// INITIALIZE
// ----------------------------
$(document).ready(function() {
  loadAlertsTable();
  setupSearch();
  setupAlertSimulationModal();
});
