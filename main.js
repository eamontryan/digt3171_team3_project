type = ['primary', 'info', 'success', 'warning', 'danger'];

demo = {

  initDashboardPageCharts: function() {
    gradientBarChartConfiguration = {
      maintainAspectRatio: false,
      legend: {
        display: false
      },

      tooltips: {
        backgroundColor: '#f5f5f5',
        titleFontColor: '#333',
        bodyFontColor: '#666',
        bodySpacing: 4,
        xPadding: 12,
        mode: "nearest",
        intersect: 0,
        position: "nearest"
      },
      responsive: true,
      scales: {
        yAxes: [{

          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.1)',
            zeroLineColor: "transparent",
          },
          ticks: {
            suggestedMin: 0,
            padding: 20,
            fontColor: "#9e9e9e"
          }
        }],

        xAxes: [{

          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.1)',
            zeroLineColor: "transparent",
          },
          ticks: {
            padding: 20,
            fontColor: "#9e9e9e"
          }
        }]
      }
    };

    // ORANGE GRADIENT
    function createOrangeGradient(ctx) {
      const gradient = ctx.createLinearGradient(0, 230, 0, 50);
      gradient.addColorStop(1, "rgba(249, 99, 59, 0.15)");
      gradient.addColorStop(0.4, "rgba(249, 99, 59, 0.0)");
      gradient.addColorStop(0, "rgba(249, 99, 59, 0)");
      return gradient;
    }

    // -----------------------------
    // 1. ORANGE LINE CHART (Alerts)
    // -----------------------------
    let alertCtx = document.getElementById("alertChart").getContext("2d");
    let alertGradient = createOrangeGradient(alertCtx);

    // Load alerts data and create chart
    loadAlertsChart(alertCtx, alertGradient, gradientBarChartConfiguration);

    // --------------------------------------------------------
    // 2. ORANGE BAR CHART – Vulnerability types
    // --------------------------------------------------------
    let vulCtx = document.getElementById("vulChart").getContext("2d");
    let vulGradient = createOrangeGradient(vulCtx);

    new Chart(vulCtx, {
      type: "bar",
      data: {
        labels: [
          "RCE", "XSS", "SQLi", "CSRF", "LFI", "RFI", "Auth Bypass",
          "Misconfig", "Info Leak", "Deserialization", "DoS", "Other"
        ],
        datasets: [{
          label: "Vulnerabilities",
          backgroundColor: vulGradient,
          borderColor: "#f96332",
          borderWidth: 2,
          data: [12, 9, 7, 5, 4, 3, 6, 10, 8, 2, 11, 9]
        }]
      },
      options: gradientBarChartConfiguration
    });


    // --------------------------------------------------------
    // 3. BLUE BAR CHART - Alerts by Department
    // --------------------------------------------------------
    let mainBarCtx = document.getElementById("mainBarChart").getContext("2d");
    let gradientStroke = createOrangeGradient(mainBarCtx);

    new Chart(mainBarCtx, {
      type: "bar",
      data: {
        labels: ["Finance", "Engineering", "Sales", "IT", "HR"],
        datasets: [{
          label: "Alerts",
          backgroundColor: gradientStroke,
          borderColor: "#f96332",
          borderWidth: 2,
          data: [8, 7, 7, 7, 7]
        }]
      },
      options: gradientBarChartConfiguration
    });

    // --------------------------------------------------------
    // 4. MULTICOLOR PIE CHART #1 - Severity
    // --------------------------------------------------------
    let severityCtx = document.getElementById("severityChart").getContext("2d");

    new Chart(severityCtx, {
      type: "pie",
      data: {
        labels: ["High", "Medium", "Low"],
        datasets: [{
          backgroundColor: [
            "#dc3535b3",
            "#fd7d14a7",
            "#007bff66",
            "#28a7466e"
          ],
          borderColor: "#e47c05ff",
          borderWidth: 2,
          data: [50, 25, 25]
        }]
      },
      options: {
        maintainAspectRatio: false,
        cutoutPercentage: 55,
        legend: { display: false }
      }
    });

    // --------------------------------------------------------
    // 5. B PIE CHART #2 – Status
    // --------------------------------------------------------
    let statusCtx = document.getElementById("statusChart").getContext("2d");

    new Chart(statusCtx, {
      type: "pie",
      data: {
        labels: ["Open", "Pending", "Closed"],
        datasets: [{
          backgroundColor: [
            "rgba(254, 106, 0, 1)",
            "rgba(254, 106, 0, 0.41)",
            "rgba(254, 106, 0, 0.14)"
          ],
          borderColor: "#f96332",
          borderWidth: 2,
          data: [40, 25, 20]
        }]
      },
      options: {
        maintainAspectRatio: false,
        cutoutPercentage: 55,
        legend: { display: false }
      }
    });


    // --------------------------------------------------------
    // 6. ORANGE BAR CHART – Asset Types
    // --------------------------------------------------------
    let assetCtx = document.getElementById("assetChart").getContext("2d");
    let assetGradient = createOrangeGradient(assetCtx);

    new Chart(assetCtx, {
      type: "bar",
      data: {
        labels: ["Workstation", "Server", "Cloud", "Networking"],
        datasets: [{
          label: "Assets",
          backgroundColor: assetGradient,
          borderColor: "#f96332",
          borderWidth: 2,
          data: [2, 1, 2, 1]
        }]
      },
      options: gradientBarChartConfiguration
    });

    // UPDATED: Call the new function to load vulnerability data
    loadVulnerabilityData();
  }
};


// --------------------------------------------------------
// HELPER FUNCTION - GRADIENTS
// --------------------------------------------------------

function createBlueGradient(ctx) {
  let gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(0, 123, 255, 1)');
  gradient.addColorStop(1, 'rgba(0, 123, 255, 0.2)');
  return gradient;
}


// --------------------------------------------------------
// NEW HELPER FUNCTION - CSV PARSER
// Simple parser for CSV data
// --------------------------------------------------------
function parseCSV(text) {
  // Split into lines, removing any empty lines
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Get headers from the first line
  const headers = lines[0].split(',').map(header => header.trim());
  const data = [];

  // Process each subsequent line
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const entry = {};
    for (let j = 0; j < headers.length; j++) {
      // Trim whitespace from the value
      entry[headers[j]] = values[j] ? values[j].trim() : '';
    }
    data.push(entry);
  }
  return data;
}

// --------------------------------------------------------
// NEW HELPER FUNCTION - SEVERITY CLASS
// Returns a CSS class based on the severity level for color-coding
// --------------------------------------------------------
function getSeverityClass(severity) {
  if (!severity) return '';
  switch (severity.toLowerCase()) {
    case 'critical': return 'text-danger'; // Uses 'danger' class (red)
    case 'high': return 'text-warning'; // Uses 'warning' class (orange)
    case 'medium': return 'text-info'; // Uses 'info' class (blue)
    case 'low': return 'text-success'; // Uses 'success' class (green)
    default: return '';
  }
}

// --------------------------------------------------------
// NEW FUNCTION - LOAD ALERTS CHART
// Fetches data from alerts.csv and creates the chart
// --------------------------------------------------------
async function loadAlertsChart(ctx, gradient, chartConfig) {
  try {
    const response = await fetch('alerts.csv');
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const csvText = await response.text();
    const data = parseCSV(csvText);

    // Count alerts per month
    const monthlyCounts = {};
    for (const alert of data) {
      const month = alert.Month;
      if (month) {
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      }
    }

    // Create array for all 12 months
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const alertData = months.map(month => monthlyCounts[month] || 0);

    new Chart(ctx, {
      type: "line",
      data: {
        labels: monthLabels,
        datasets: [{
          label: "Alerts",
          fill: true,
          backgroundColor: gradient,
          borderColor: "#f96332",
          borderWidth: 2,
          pointBackgroundColor: "#f96332",
          pointBorderColor: "rgba(255,255,255,0)",
          pointRadius: 4,
          data: alertData
        }]
      },
      options: chartConfig
    });

  } catch (error) {
    console.error('Error loading alerts data:', error);
    // Fallback to default data
    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [{
          label: "Alerts",
          fill: true,
          backgroundColor: gradient,
          borderColor: "#f96332",
          borderWidth: 2,
          pointBackgroundColor: "#f96332",
          pointBorderColor: "rgba(255,255,255,0)",
          pointRadius: 4,
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }]
      },
      options: chartConfig
    });
  }
}

// --------------------------------------------------------
// NEW FUNCTION - LOAD VULNERABILITY DATA
// Fetches data from vulnerabilities.csv and populates the table
// --------------------------------------------------------
async function loadVulnerabilityData() {
  try {
    const response = await fetch('vulnerabilities.csv');
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const csvText = await response.text();
    const data = parseCSV(csvText);
    
    const tableBody = document.getElementById('vulnerability-table-body');
    if (!tableBody) {
      console.error('Vulnerability table body not found!');
      return;
    }

    let tableHtml = '';
    for (const vuln of data) {
      // Get a color-coded class for the severity
      const severityClass = getSeverityClass(vuln.Severity);
      
      // Build the HTML table row
      tableHtml += `
        <tr>
          <td>${vuln.CVE || 'N/A'}</td>
          <td>${vuln.Name || 'Unknown'}</td>
          <td class="${severityClass}">${vuln.Severity || 'N/A'}</td>
          <td class="text-center">${vuln['#Alerts'] || 0}</td>
        </tr>
      `;
    }
    // Set the table body's HTML to the newly created rows
    tableBody.innerHTML = tableHtml;

  } catch (error) {
    console.error('Error loading vulnerability data:', error);
    const tableBody = document.getElementById('vulnerability-table-body');
    if (tableBody) {
      // Display an error message in the table if fetching fails
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading data.</td></tr>';
    }
  }
}


// --------------------------------------------------------
// ALERT SIMULATION MODAL FUNCTIONALITY
// --------------------------------------------------------

// Modal functionality
const modal = document.getElementById('alertSimulationModal');
const btn = document.getElementById('alertSimulationBtn');
const span = document.getElementsByClassName('close')[0];
const triggerAlertBtn = document.getElementById('triggerAlertBtn');
const alertMessage = document.getElementById('alertMessage');
const alertEmailInput = document.getElementById('alertEmail');

// Open modal
if (btn) {
  btn.onclick = function() {
    modal.style.display = 'block';
    alertMessage.className = 'alert-message';
    alertMessage.textContent = '';
    alertEmailInput.value = '';
  }
}

// Close modal
if (span) {
  span.onclick = function() {
    modal.style.display = 'none';
  }
}

// Close modal when clicking outside
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = 'none';
  }
}

// Trigger alert
if (triggerAlertBtn) {
  triggerAlertBtn.onclick = async function() {
    const email = alertEmailInput.value.trim();

    if (!email) {
      alertMessage.className = 'alert-message error';
      alertMessage.textContent = 'Please enter a valid email address.';
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alertMessage.className = 'alert-message error';
      alertMessage.textContent = 'Please enter a valid email address.';
      return;
    }

    // Disable button during request
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

        // Close modal after 3 seconds
        setTimeout(() => {
          modal.style.display = 'none';
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
  }
}

// Initialize charts on document ready
$(document).ready(function() {
  demo.initDashboardPageCharts();
});
