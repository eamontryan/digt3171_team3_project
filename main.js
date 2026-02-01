type = ['primary', 'info', 'success', 'warning', 'danger'];
let assetTypeChart = null;

// ----------------------------
// GLOBAL STATE (so we can re-sort + re-render without re-fetching)
// ----------------------------
const TABLE_STATE = {
  vuln: {
    rows: [],          // normalized vuln rows
    sortKey: null,
    sortDir: 'asc'     // 'asc' or 'desc'
  },
  asset: {
    rows: [],          // normalized asset rows
    sortKey: null,
    sortDir: 'asc'
  }
};

// ----------------------------
// SEVERITY helpers
// ----------------------------
function severityRank(sev) {
  const s = (sev || '').toLowerCase();
  if (s === 'critical') return 4;
  if (s === 'high') return 3;
  if (s === 'medium') return 2;
  if (s === 'low') return 1;
  return 0;
}

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

function pickHighestSeverity(severities) {
  let best = '';
  let bestRank = 0;
  for (const s of severities) {
    const r = severityRank(s);
    if (r > bestRank) {
      bestRank = r;
      best = s;
    }
  }
  return best || 'N/A';
}

// ----------------------------
// CSV PARSER (simple)
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
// GENERIC SORTER (text / number / severity)
// ----------------------------
function sortRows(rows, key, type, dir) {
  const mult = dir === 'asc' ? 1 : -1;

  return rows.slice().sort((a, b) => {
    const av = a[key];
    const bv = b[key];

    if (type === 'number') {
      const an = Number(av) || 0;
      const bn = Number(bv) || 0;
      return (an - bn) * mult;
    }

    if (type === 'severity') {
      const ar = severityRank(av);
      const br = severityRank(bv);
      return (ar - br) * mult;
    }

    // default: text
    const as = (av || '').toString().toLowerCase();
    const bs = (bv || '').toString().toLowerCase();
    if (as < bs) return -1 * mult;
    if (as > bs) return 1 * mult;
    return 0;
  });
}

// ----------------------------
// RENDER: Vulnerability table from TABLE_STATE.vuln.rows
// ----------------------------
function renderVulnTable() {
  const tbody = document.getElementById('vulnerability-table-body');
  if (!tbody) return;

  let html = '';
  for (const v of TABLE_STATE.vuln.rows) {
    const severityClass = getSeverityClass(v.severity);

    html += `
      <tr class="vuln-row" data-vulnid="${v.vulnId}" data-cve="${v.cve}">
        <td>${v.cve || 'N/A'}</td>
        <td>${v.name || 'Unknown'}</td>
        <td class="${severityClass}">${v.severity || 'N/A'}</td>
        <td class="text-center">${v.alerts || 0}</td>
      </tr>
    `;
  }

  tbody.innerHTML = html;

  // Re-wire modal clicks because we just rebuilt the rows
  wireUpCveModal(TABLE_STATE.vuln.modalData);
}

// ----------------------------
// RENDER: Asset table from TABLE_STATE.asset.rows
// ----------------------------
function renderAssetTable() {
  const tbody = document.getElementById('asset-table-body');
  if (!tbody) return;

  let html = '';
  for (const a of TABLE_STATE.asset.rows) {
    const sevClass = getSeverityClass(a.highestSeverity);

    html += `
      <tr>
        <td>${a.assetId || 'N/A'}</td>
        <td>${a.assetName || 'N/A'}</td>
        <td>${a.assetType || 'N/A'}</td>
        <td class="text-center">${a.alerts || 0}</td>
        <td class="text-center ${sevClass}">${a.highestSeverity || 'N/A'}</td>
      </tr>
    `;
  }

  tbody.innerHTML = html;
}

// ----------------------------
// SORT BUTTON WIRING (works for both tables)
// ----------------------------
function wireUpSortButtons() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const tableName = btn.getAttribute('data-table'); // "vuln" or "asset"
      const key = btn.getAttribute('data-key');         // normalized key
      const type = btn.getAttribute('data-type');       // text/number/severity
      
      // ------------------------------------
      // STATIC TABLE: High Risk Users
      // ------------------------------------
      if (tableName === 'users') {
        const col = Number(btn.getAttribute('data-col')); // column index
        const sortType = type || 'string';
        sortUsersTable(col, sortType);
        return; // IMPORTANT: stop here, do NOT continue
      }

      const state = TABLE_STATE[tableName];
      if (!state) return;

      // toggle direction if clicking same key again
      if (state.sortKey === key) {
        state.sortDir = (state.sortDir === 'asc') ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = 'asc';
      }

      // update arrow UI on buttons (optional)
      document.querySelectorAll(`.sort-btn[data-table="${tableName}"]`).forEach(b => {
        b.classList.remove('is-asc', 'is-desc');
      });
      btn.classList.add(state.sortDir === 'asc' ? 'is-asc' : 'is-desc');

      // sort + render correct table
      state.rows = sortRows(state.rows, key, type, state.sortDir);

      if (tableName === 'vuln') renderVulnTable();
      if (tableName === 'asset') renderAssetTable();
    });
  });
}

// ----------------------------
// CHARTS (your existing demo init)
// ----------------------------
demo = {
  initDashboardPageCharts: function() {
    gradientBarChartConfiguration = {
      maintainAspectRatio: false,
      legend: { display: false },
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
          ticks: { suggestedMin: 0, padding: 20, fontColor: "#9e9e9e" }
        }],
        xAxes: [{
          gridLines: {
            drawBorder: false,
            color: 'rgba(29,140,248,0.1)',
            zeroLineColor: "transparent",
          },
          ticks: { padding: 20, fontColor: "#9e9e9e" }
        }]
      }
    };

    function createOrangeGradient(ctx) {
      const gradient = ctx.createLinearGradient(0, 230, 0, 50);
      gradient.addColorStop(1, "rgba(249, 99, 59, 0.15)");
      gradient.addColorStop(0.4, "rgba(249, 99, 59, 0.0)");
      gradient.addColorStop(0, "rgba(249, 99, 59, 0)");
      return gradient;
    }

    // 1) Alerts line chart
    let alertCtx = document.getElementById("alertChart").getContext("2d");
    let alertGradient = createOrangeGradient(alertCtx);

    // Load alerts data and create chart
    loadAlertsChart(alertCtx, alertGradient, gradientBarChartConfiguration);

    // 2) Vuln type bar chart
    let vulCtx = document.getElementById("vulChart").getContext("2d");
    let vulGradient = createOrangeGradient(vulCtx);

    new Chart(vulCtx, {
      type: "bar",
      data: {
        labels: ["RCE","XSS","SQLi","CSRF","LFI","RFI","Auth Bypass","Misconfig","Info Leak","Deserialization","DoS","Other"],
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

    // 3) Alerts by department
    let mainBarCtx = document.getElementById("mainBarChart").getContext("2d");
    let gradientStroke = createOrangeGradient(mainBarCtx);

    new Chart(mainBarCtx, {
      type: "bar",
      data: {
        labels: ["Finance","Engineering","Sales","IT","HR"],
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

    // 4) Severity pie
    let severityCtx = document.getElementById("severityChart").getContext("2d");
    new Chart(severityCtx, {
      type: "pie",
      data: {
        labels: ["High","Medium","Low"],
        datasets: [{
          backgroundColor: ["#dc3535b3","#fd7d14a7","#007bff66","#28a7466e"],
          borderColor: "#e47c05ff",
          borderWidth: 2,
          data: [50,25,25]
        }]
      },
      options: { maintainAspectRatio: false, cutoutPercentage: 55, legend: { display: false } }
    });

    // 5) Status pie
    let statusCtx = document.getElementById("statusChart").getContext("2d");
    new Chart(statusCtx, {
      type: "pie",
      data: {
        labels: ["Open","Pending","Closed"],
        datasets: [{
          backgroundColor: ["rgba(254, 106, 0, 1)","rgba(254, 106, 0, 0.41)","rgba(254, 106, 0, 0.14)"],
          borderColor: "#f96332",
          borderWidth: 2,
          data: [40,25,20]
        }]
      },
      options: { maintainAspectRatio: false, cutoutPercentage: 55, legend: { display: false } }
    });

    // 6) Asset types chart (will be updated from real data)
    let assetCtx = document.getElementById("assetChart").getContext("2d");
    let assetGradient = createOrangeGradient(assetCtx);

    assetTypeChart = new Chart(assetCtx, {
      type: "bar",
      data: {
        labels: ["Workstation","Server","Cloud","Networking"],
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

    // Load tables + wire sorting
    loadVulnerabilityData();
    loadAssetInventory();
    wireUpSortButtons();
  }
};

// ----------------------------
// Update Asset Type chart based on alerts grouped by asset type
// ----------------------------
function updateAssetTypeChartFromData(assets, alerts) {
  if (!assetTypeChart) return;

  const idToType = new Map();
  for (const a of assets) idToType.set((a.AssetID || '').trim(), (a.AssetType || 'Unknown').trim());

  const counts = new Map();
  for (const al of alerts) {
    const t = idToType.get((al.AssetID || '').trim()) || 'Unknown';
    counts.set(t, (counts.get(t) || 0) + 1);
  }

  const labels = Array.from(counts.keys());
  const data = labels.map(l => counts.get(l));

  assetTypeChart.data.labels = labels;
  assetTypeChart.data.datasets[0].data = data;
  assetTypeChart.update();
}

// ----------------------------
// LOAD ASSET INVENTORY
// ----------------------------
async function loadAssetInventory() {
  try {
    const [assetsRes, alertsRes] = await Promise.all([
      fetch('assets.csv'),
      fetch('alerts.csv')
    ]);

    if (!assetsRes.ok) throw new Error("assets.csv not found");
    if (!alertsRes.ok) throw new Error("alerts.csv not found");

    const assets = parseCSV(await assetsRes.text());
    const alerts = parseCSV(await alertsRes.text());

    // Count alerts per asset + collect severity values per asset
    const assetToStats = new Map();

    for (const a of alerts) {
      const assetId = (a.AssetID || '').trim();
      if (!assetId) continue;

      if (!assetToStats.has(assetId)) assetToStats.set(assetId, { count: 0, severities: [] });

      const entry = assetToStats.get(assetId);
      entry.count += 1;
      entry.severities.push(a.Severity);
    }

    // Normalize assets into rows we can sort/re-render
    TABLE_STATE.asset.rows = assets.map(asset => {
      const id = (asset.AssetID || '').trim();
      const stats = assetToStats.get(id) || { count: 0, severities: [] };

      return {
        assetId: asset.AssetID || 'N/A',
        assetName: asset.AssetName || 'N/A',
        assetType: asset.AssetType || 'N/A',
        alerts: stats.count,
        highestSeverity: pickHighestSeverity(stats.severities)
      };
    });

    renderAssetTable();
    updateAssetTypeChartFromData(assets, alerts);

  } catch (err) {
    console.error('Error loading asset inventory:', err);
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

// ----------------------------
// LOAD VULNERABILITIES
// ----------------------------
async function loadVulnerabilityData() {
  try {
    const [vulnRes, cveStatsRes, alertsRes, assetsRes] = await Promise.all([
      fetch('vulnerabilities.csv'),
      fetch('cve_stats.csv'),
      fetch('alerts.csv'),
      fetch('assets.csv')
    ]);

    if (!vulnRes.ok) throw new Error("vulnerabilities.csv not found");
    if (!cveStatsRes.ok) throw new Error("cve_stats.csv not found");
    if (!alertsRes.ok) throw new Error("alerts.csv not found");
    if (!assetsRes.ok) throw new Error("assets.csv not found");

    const vulns = parseCSV(await vulnRes.text());
    const cveStats = parseCSV(await cveStatsRes.text());
    const alerts = parseCSV(await alertsRes.text());
    const assets = parseCSV(await assetsRes.text());

    // Index cve_stats by CVE
    const cveToStats = new Map();
    for (const row of cveStats) cveToStats.set((row.CVE || '').trim(), row);

    // Index assets by AssetID
    const assetById = new Map();
    for (const a of assets) assetById.set((a.AssetID || '').trim(), a);

    // Group alerts by VulnID
    const alertsByVuln = new Map();
    for (const a of alerts) {
      const id = (a.VulnID || '').trim();
      if (!id) continue;
      if (!alertsByVuln.has(id)) alertsByVuln.set(id, []);
      alertsByVuln.get(id).push(a);
    }

    // Normalize vuln rows for sorting/re-render
    TABLE_STATE.vuln.rows = vulns.map(v => ({
      vulnId: (v.VulnID || '').trim(),
      cve: v.CVE || 'N/A',
      name: v.Name || 'Unknown',
      severity: v.Severity || 'N/A',
      alerts: Number(v['#Alerts'] || 0)
    }));

    // store modal data so re-render can re-wire clicks
    TABLE_STATE.vuln.modalData = {
      vulns,
      cveToStats,
      alertsByVuln,
      assetById
    };

    renderVulnTable();

  } catch (error) {
    console.error('Error loading vulnerability data:', error);
  }
}

// ----------------------------
// CVE MODAL (unchanged behaviour, just called after every re-render)
// ----------------------------
function wireUpCveModal({ vulns, cveToStats, alertsByVuln, assetById }) {
  const modal = document.getElementById('cve-modal');
  const title = document.getElementById('cve-modal-title');
  const content = document.getElementById('cve-modal-content');
  const closeBtn = document.getElementById('cve-modal-close');

  if (!modal || !title || !content || !closeBtn) return;

  function open() {
    modal.classList.remove('modal-hidden');
    modal.classList.add('modal-visible');
  }

  function close() {
    modal.classList.add('modal-hidden');
    modal.classList.remove('modal-visible');
  }

  closeBtn.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  const vulnById = new Map();
  for (const v of vulns) vulnById.set((v.VulnID || '').trim(), v);

  document.querySelectorAll('.vuln-row').forEach(row => {
    row.addEventListener('click', () => {
      const vulnId = (row.getAttribute('data-vulnid') || '').trim();
      const v = vulnById.get(vulnId);
      if (!v) return;

      const stats = cveToStats.get((v.CVE || '').trim()) || {};
      const relatedAlerts = alertsByVuln.get(vulnId) || [];

      const impacted = new Map();
      for (const a of relatedAlerts) {
        const id = (a.AssetID || '').trim();
        impacted.set(id, (impacted.get(id) || 0) + 1);
      }

      const impactedList = Array.from(impacted.entries()).map(([assetId, count]) => {
        const asset = assetById.get(assetId) || {};
        return `<li><b>${assetId}</b> — ${asset.AssetName || 'Unknown'} (${asset.AssetType || 'Unknown'}) — ${count} alert(s)</li>`;
      }).join('');

      title.textContent = `${v.CVE} — Details`;

      content.innerHTML = `
        <p><b>Name:</b> ${v.Name || 'N/A'}</p>
        <p><b>Severity:</b> ${v.Severity || 'N/A'}</p>

        <hr style="margin:12px 0; opacity:0.2;" />

        <p><b>CVSS:</b> ${stats.CVSS || 'N/A'}</p>
        <p><b>Exploitability:</b> ${stats.ExploitabilityScore || 'N/A'}</p>
        <p><b>Attack Vector:</b> ${stats.AttackVector || 'N/A'}</p>
        <p><b>Published:</b> ${stats.PublishedDate || 'N/A'}</p>
        <p><b>Description:</b> ${stats.Description || 'N/A'}</p>

        <hr style="margin:12px 0; opacity:0.2;" />

        <p><b>Impacted assets:</b></p>
        <ul>
          ${impactedList || '<li>None found</li>'}
        </ul>
      `;

      open();
    });
  });
}

// ------------------------------
// High Risk Users table sorting
// (sorts the existing static rows)
// ------------------------------
const usersSortState = {}; // key: "colIndex" -> true/false (asc/desc)

function parseBool(val) {
  const v = (val || '').trim().toLowerCase();
  return v === 'true' ? 1 : 0; // True > False (change if you want opposite)
}

function sortUsersTable(colIndex, type) {
  const table = document.getElementById('users-table');
  if (!table) return;

  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  // Toggle asc/desc for this column
  usersSortState[colIndex] = !usersSortState[colIndex];
  const asc = usersSortState[colIndex];

  rows.sort((r1, r2) => {
    const aText = r1.children[colIndex]?.textContent.trim() ?? '';
    const bText = r2.children[colIndex]?.textContent.trim() ?? '';

    let cmp = 0;

    if (type === 'number') {
      const a = Number(aText) || 0;
      const b = Number(bText) || 0;
      cmp = a - b;
    } else if (type === 'bool') {
      const a = parseBool(aText);
      const b = parseBool(bText);
      cmp = a - b;
    } else {
      // string
      cmp = aText.localeCompare(bText);
    }

    return asc ? cmp : -cmp;
  });

  // Re-attach in new order
  tbody.innerHTML = '';
  rows.forEach(r => tbody.appendChild(r));
}

// Initialize charts on document ready
$(document).ready(function() {
  demo.initDashboardPageCharts();
});
