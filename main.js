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

    new Chart(alertCtx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [{
          label: "Alerts",
          fill: true,
          backgroundColor: alertGradient,
          borderColor: "#f96332",
          borderWidth: 2,
          pointBackgroundColor: "#f96332",
          pointBorderColor: "rgba(255,255,255,0)",
          pointRadius: 4,
          data: [30, 50, 45, 60, 55, 48, 70, 65, 80, 75, 90, 85]
        }]
      },
      options: gradientBarChartConfiguration
    });

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
    // 3. ORANGE PIE CHART #1 - Severity
    // --------------------------------------------------------
    let severityCtx = document.getElementById("severityChart").getContext("2d");
    let severityGradient = createOrangeGradient(severityCtx);

    new Chart(severityCtx, {
      type: "pie",
      data: {
        labels: ["Critical", "High", "Medium", "Low"],
        datasets: [{
          backgroundColor: [
            "rgba(254, 106, 0, 1)",
            "rgba(254, 106, 0, 0.52)",
            "rgba(254, 106, 0, 0.3)",
            "rgba(254, 106, 0, 0.1)"
          ],
          borderColor: "#f96332",
          borderWidth: 2,
          data: [20, 35, 25, 10]
        }]
      },
      options: {
        maintainAspectRatio: false,
        cutoutPercentage: 55, // hollow donut look
        legend: { display: false }
      }
    });

    // --------------------------------------------------------
    // 4. ORANGE PIE CHART #2 – Status
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

    // --------------------------------------
    // 5. ORANGE BAR CHART – Asset Types
    // --------------------------------------
    let assetCtx = document.getElementById("assetChart").getContext("2d");
    let assetGradient = createOrangeGradient(assetCtx);

    new Chart(assetCtx, {
      type: "bar",
      data: {
        labels: ["Workstation", "Server", "Cloud", "Network"],
        datasets: [{
          label: "Assets",
          backgroundColor: assetGradient,
          borderColor: "#f96332",
          borderWidth: 2,
          data: [14, 9, 7, 11]
        }]
      },
      options: gradientBarChartConfiguration
    });
  },

};