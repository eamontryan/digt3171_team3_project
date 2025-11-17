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

    // --------------------------------------------------------
    // 1. BIG BAR CHART - Alerts by Department
    // --------------------------------------------------------
    let mainBarCtx = document.getElementById("mainBarChart").getContext("2d");
    let gradientStroke = mainBarCtx.createLinearGradient(0, 230, 0, 50);
    gradientStroke.addColorStop(1, 'rgba(29,140,248,0.2)');
    gradientStroke.addColorStop(0.4, 'rgba(29,140,248,0.0)');
    gradientStroke.addColorStop(0, 'rgba(29,140,248,0)');

    new Chart(mainBarCtx, {
      type: "bar",
      data: {
        labels: ["Finance", "Engineering", "Sales", "IT", "HR"],
        datasets: [{
          label: "Alerts",
          backgroundColor: "#007bff",
          borderColor: "#007bff",
          borderWidth: 2,
          data: [8, 7, 7, 7, 7]
        }]
      },
      options: gradientBarChartConfiguration
    });

    // --------------------------------------------------------
    // 2. BLUE PIE CHART #1 - Severity
    // --------------------------------------------------------
    let severityCtx = document.getElementById("severityChart").getContext("2d");

    new Chart(severityCtx, {
      type: "pie",
      data: {
        labels: ["Critical", "High", "Medium", "Low"],
        datasets: [{
          backgroundColor: [
            "#dc3545",
            "#fd7e14",
            "#007bff",
            "#28a745"
          ],
          borderColor: "#27293d",
          borderWidth: 2,
          data: [50, 25, 15, 10]
        }]
      },
      options: {
        maintainAspectRatio: false,
        cutoutPercentage: 55,
        legend: { display: false }
      }
    });

    // --------------------------------------------------------
    // 3. BLUE PIE CHART #2 – Status
    // --------------------------------------------------------
    let statusCtx = document.getElementById("statusChart").getContext("2d");

    new Chart(statusCtx, {
      type: "pie",
      data: {
        labels: ["Open", "Pending", "Closed"],
        datasets: [{
          backgroundColor: [
            "rgba(0, 123, 255, 1)",
            "rgba(0, 123, 255, 0.41)",
            "rgba(0, 123, 255, 0.14)"
          ],
          borderColor: "#007bff",
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
    // 4. ORANGE PIE CHART – Asset Types
    // --------------------------------------------------------
    let assetCtx = document.getElementById("assetChart").getContext("2d");

    new Chart(assetCtx, {
      type: "pie",
      data: {
        labels: ["Workstation", "Server", "Cloud", "Networking"],
        datasets: [{
          backgroundColor: [
            "rgba(254, 106, 0, 1)",
            "rgba(254, 106, 0, 0.6)",
            "rgba(254, 106, 0, 0.4)",
            "rgba(254, 106, 0, 0.2)"
          ],
          borderColor: "#f96332",
          borderWidth: 2,
          data: [2, 1, 2, 1]
        }]
      },
      options: {
        maintainAspectRatio: false,
        cutoutPercentage: 55,
        legend: { display: false }
      }
    });

    // UPDATED: Call the new function to load vulnerability data
    loadVulnerabilityData();
  }
};


// --------------------------------------------------------
// HELPER FUNCTION - GRADIENTS
// --------------------------------------------------------
function createOrangeGradient(ctx) {
  let gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(254, 106, 0, 1)');
  gradient.addColorStop(1, 'rgba(254, 106, 0, 0.2)');
  return gradient;
}

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


// Initialize charts on document ready
$(document).ready(function() {
  demo.initDashboardPageCharts();
});
