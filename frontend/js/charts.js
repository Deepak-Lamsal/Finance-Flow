// All Chart.js code lives here. dashboard.js calls updateCharts().

let trendChart = null;
let categoryChart = null;

// Colours used by the doughnut
const CATEGORY_COLORS = [
  "#10b981", "#14b8a6", "#34d399", "#059669",
  "#2dd4bf", "#6ee7b7", "#0d9488", "#a7f3d0",
];

// Chart defaults for the dark theme
Chart.defaults.color = "#8a9396";
Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';

function monthLabel(key) {
  // "2026-11" -> "Nov"
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}

function drawTrendChart(data) {
  const canvas = document.getElementById("trend-chart");
  if (trendChart) trendChart.destroy(); // remove the old chart before redrawing

  trendChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: data.months.map(monthLabel),
      datasets: [
        {
          label: "Income",
          data: data.income,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.25)",
          fill: true,
          tension: 0.4,
          pointRadius: 3,
        },
        {
           label: "Expenses",
          data: data.expenses,
          borderColor: "#f87171",
          backgroundColor: "rgba(248, 113, 113, 0.18)",
          fill: true,
          tension: 0.4,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#23282a" } },
      },
    },
  });
}

function drawCategoryChart(data) {
  const canvas = document.getElementById("category-chart");
  if (categoryChart) categoryChart.destroy();

  // No expenses this month: draw a single grey ring instead of an empty box
  const hasData = data.categories.length > 0;

  categoryChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: hasData ? data.categories : ["No expenses yet"],
      datasets: [
        {
          data: hasData ? data.category_totals : [1],
          backgroundColor: hasData ? CATEGORY_COLORS : ["#23282a"],
          borderColor: "#121516",
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true } },
        tooltip: { enabled: hasData },
      },
    },
  });
}

async function updateCharts() {
  try {
    const data = await getChartData();
    drawTrendChart(data);
    drawCategoryChart(data);
  } catch (error) {
    console.error(error);
  }
}