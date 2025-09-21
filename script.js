// ============================
// Global Variables
// ============================
let config = {};
let seedLogs = [];

// ============================
// Load Config + Logs from config.json
// ============================
async function loadConfigAndLogs() {
  try {
    const response = await fetch("data.json");
    const data = await response.json();

    config = data.config || {};
    seedLogs = data.logs || [];

    console.log("Loaded config:", data);
    console.log("Loaded seed logs:", seedLogs);
  } catch (error) {
    console.error("Error loading data.json:", error);
  }
}

// ============================
// Form Setup
// ============================
function setupForm() {
  const form = document.getElementById("logForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const barangay = form.barangay.value;
    const district = form.district.value;
    const tons = parseFloat(form.tons.value);
    const points = tons * (config.pointsPerPound || 1) * 2000; // adjust multiplier as needed
    const date = form.date.value;

    const log = {
      barangay,
      district,
      tons,
      points,
      date,
      disposalArea: form.disposalArea.value,
      disposalCategory: form.disposalCategory.value,
      wasteTypes: form.wasteTypes.value.split(",").map(w => w.trim()),
      transportMethod: form.transportMethod.value,
      certificationNumber: form.certificationNumber.value
    };

    const localLogs = JSON.parse(localStorage.getItem("trashLogs") || "[]");
    localLogs.push(log);
    localStorage.setItem("trashLogs", JSON.stringify(localLogs));

    const allLogs = [...seedLogs, ...localLogs];
    renderLeaderboard(allLogs);
    renderGraphs(allLogs, config);
    renderStats(allLogs, config);

    form.reset();
  });
}

// ============================
// Leaderboard
// ============================
function renderLeaderboard(allLogs) {
  const leaderboardList = document.getElementById("leaderboardList");
  const filterContainer = document.querySelector(".filter-tabs");

  if (!leaderboardList || !config.barangayDistrictMap) return;

  // Aggregate totals
  const totals = {};
  allLogs.forEach((log) => {
    if (!totals[log.barangay]) {
      totals[log.barangay] = { tons: 0, points: 0, district: log.district };
    }
    totals[log.barangay].tons += log.tons;
    totals[log.barangay].points += log.points;
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1].points - a[1].points);

  // Render
  leaderboardList.innerHTML = "";
  sorted.forEach(([barangay, data], index) => {
    const li = document.createElement("li");
    const rank = index + 1;
    const rankClass = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";

    li.innerHTML = `
      <div class="rank ${rankClass}">${rank}</div>
      <div class="barangay">${barangay} <span class="district">(${data.district})</span></div>
      <div class="points">${data.points.toLocaleString()} pts</div>
      <div class="tons">${data.tons.toFixed(2)} tons</div>
    `;
    leaderboardList.appendChild(li);
  });
}

// ============================
// Graphs
// ============================
function renderGraphs(allLogs, config) {
  // Placeholder for Chart.js / graph rendering logic
  console.log("Render graphs with:", allLogs, config);
}

function addChartTooltips() {
  // Placeholder if you’re adding custom tooltips
}

// ============================
// Stats
// ============================
function renderStats(allLogs, config) {
  const totalPoints = allLogs.reduce((sum, l) => sum + l.points, 0);
  const totalTons = allLogs.reduce((sum, l) => sum + l.tons, 0);

  const pointsEl = document.getElementById("totalPoints");
  const tonsEl = document.getElementById("totalTons");

  if (pointsEl) pointsEl.textContent = totalPoints.toLocaleString();
  if (tonsEl) tonsEl.textContent = totalTons.toFixed(2);
}

// ============================
// Initialize
// ============================
loadConfigAndLogs().then(() => {
  setupForm();

  const localLogs = JSON.parse(localStorage.getItem("trashLogs") || "[]");
  const allLogs = [...seedLogs, ...localLogs];

  renderLeaderboard(allLogs);
  renderGraphs(allLogs, config);
  renderStats(allLogs, config);
  addChartTooltips();
});
