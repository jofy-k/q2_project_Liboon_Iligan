// -------------------------------
// Config + data setup
// -------------------------------
let config = {};
let seedLogs = [];

// Load config and logs
async function loadConfigAndLogs() {
  try {
    const [configRes, logsRes] = await Promise.all([
      fetch("config.json"),
      fetch("logs.json"),
    ]);
    config = await configRes.json();
    seedLogs = await logsRes.json();
    populateBarangayOptions();
  } catch (err) {
    console.error("Error loading config/logs:", err);
  }
}

function populateBarangayOptions() {
  const select = document.getElementById("modalBarangay");
  if (!select || !config.barangayDistrictMap) return;
  Object.keys(config.barangayDistrictMap).forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    select.appendChild(opt);
  });
}

// -------------------------------
// Leaderboard
// -------------------------------
function renderLeaderboard(allLogs) {
  const leaderboardList = document.getElementById("leaderboardList");
  if (!leaderboardList || !config.barangayDistrictMap) return;

  // Aggregate barangay totals
  const totals = {};
  allLogs.forEach((log) => {
    if (!totals[log.barangay]) {
      totals[log.barangay] = { weight: 0, points: 0 };
    }
    totals[log.barangay].weight += Number(log.weight);
    totals[log.barangay].points += Number(log.points);
  });

  // Sort by points
  const sorted = Object.entries(totals).sort(
    (a, b) => b[1].points - a[1].points
  );

  // Render list
  leaderboardList.innerHTML = "";
  sorted.forEach(([barangay, stats], i) => {
    const li = document.createElement("li");
    const rank = i + 1;
    let rankClass = "low";
    if (rank <= 3) rankClass = "top";
    else if (rank <= 10) rankClass = "mid";

    li.innerHTML = `
      <div class="rank ${rankClass}">${rank}</div>
      <div class="barangay">${barangay}</div>
      <div class="weight">${stats.weight.toFixed(2)}t</div>
      <div class="points">${stats.points}</div>
    `;
    leaderboardList.appendChild(li);
  });
}

// -------------------------------
// Form handling (Add Log Modal)
// -------------------------------
function setupForm() {
  const form = document.getElementById("modalTrashLogForm");
  const barangaySelect = document.getElementById("modalBarangay");
  const districtInput = document.getElementById("modalDistrict");
  const weightInput = document.getElementById("modalWeight");
  const pointsInput = document.getElementById("modalPoints");

  if (!form) return;

  // Auto-fill district when barangay selected
  barangaySelect.addEventListener("change", () => {
    const b = barangaySelect.value;
    districtInput.value = config.barangayDistrictMap[b] || "";
  });

  // Auto-calc points (example: 100 points per ton)
  weightInput.addEventListener("input", () => {
    const weight = parseFloat(weightInput.value) || 0;
    pointsInput.value = Math.round(weight * 100);
  });

  // Save log
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const newLog = {
      barangay: barangaySelect.value,
      district: districtInput.value,
      weight: parseFloat(weightInput.value),
      points: parseInt(pointsInput.value),
      date: form.modalDate.value,
    };

    // Save to localStorage
    const localLogs = JSON.parse(localStorage.getItem("trashLogs") || "[]");
    localLogs.push(newLog);
    localStorage.setItem("trashLogs", JSON.stringify(localLogs));

    // Re-render
    const allLogs = [...seedLogs, ...localLogs];
    renderLeaderboard(allLogs);
    renderGraphs(allLogs, config);
    renderStats(allLogs, config);

    // Close modal
    document.querySelector(".modal-close").click();
    form.reset();
  });
}

// -------------------------------
// Stats
// -------------------------------
function renderStats(allLogs, config) {
  const barangayCount = Object.keys(config.barangayDistrictMap).length;
  const totalBarangays = document.getElementById("stat-barangays");
  const totalTons = document.getElementById("stat-tons");
  const totalPoints = document.getElementById("stat-points");
  const participation = document.getElementById("stat-participation");

  const uniqueActive = new Set(allLogs.map((log) => log.barangay)).size;
  const totalWeight = allLogs.reduce((s, l) => s + Number(l.weight), 0);
  const points = allLogs.reduce((s, l) => s + Number(l.points), 0);
  const rate = ((uniqueActive / barangayCount) * 100).toFixed(1);

  if (totalBarangays) totalBarangays.textContent = barangayCount;
  if (totalTons) totalTons.textContent = `${totalWeight.toFixed(1)}t`;
  if (totalPoints) totalPoints.textContent = points;
  if (participation) participation.textContent = `${rate}%`;

  // Circular progress
  const circle = document.querySelector(".participation-progress");
  const percentText = document.querySelector(".participation-percent");
  if (circle && percentText) {
    const r = 45;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (rate / 100) * circumference;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = offset;
    percentText.textContent = `${rate}%`;
  }

  const activeEl = document.getElementById("active-barangays");
  const inactiveEl = document.getElementById("inactive-barangays");
  if (activeEl) activeEl.textContent = uniqueActive;
  if (inactiveEl) inactiveEl.textContent = barangayCount - uniqueActive;
}

// -------------------------------
// Graphs (placeholder)
// -------------------------------
function renderGraphs(allLogs, config) {
  const container = document.getElementById("districtParticipation");
  if (!container) return;

  container.innerHTML = "";
  const districtTotals = {};

  allLogs.forEach((log) => {
    const district = log.district;
    if (!districtTotals[district]) {
      districtTotals[district] = { weight: 0 };
    }
    districtTotals[district].weight += Number(log.weight);
  });

  Object.entries(districtTotals).forEach(([district, stats]) => {
    const bar = document.createElement("div");
    bar.className = "district-bar";
    bar.innerHTML = `
      <span class="district-name">${district}</span>
      <div class="bar"><div class="fill" style="width: ${stats.weight * 10}px"></div></div>
      <span class="value">${stats.weight.toFixed(1)}t</span>
    `;
    container.appendChild(bar);
  });
}

// -------------------------------
// Init
// -------------------------------
loadConfigAndLogs().then(() => {
  setupForm();
  const localLogs = JSON.parse(localStorage.getItem("trashLogs") || "[]");
  const allLogs = [...seedLogs, ...localLogs];
  renderLeaderboard(allLogs);
  renderGraphs(allLogs, config);
  renderStats(allLogs, config);
});
