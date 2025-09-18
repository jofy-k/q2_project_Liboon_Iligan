"use strict";

console.log("script.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  let config = {
    pointsPerPound: 1,
    progressMaxPoints: 6000,
    barangayDistrictMap: {}
  };
  let seedLogs = [];

  /* ---------------------------
     Load Config + Logs from JSON
     --------------------------- */
  async function loadConfigAndLogs() {
    try {
      const res = await fetch("./../data.json");
      if (res.ok) {
        const data = await res.json();
        if (data.config) config = data.config;
        if (data.logs) seedLogs = data.logs;
      }
    } catch (err) {
      console.warn("Could not load data.json", err);
    }
  }

  /* ---------------------------
     Setup Form (log.html)
     --------------------------- */
  function setupForm() {
    const barangaySelect = document.getElementById("barangay");
    const districtInput = document.getElementById("district");
    const trashLogForm = document.getElementById("trashLogForm");
    const weightInput = document.getElementById("weight");
    const pointsInput = document.getElementById("points");

    if (barangaySelect && config.barangayDistrictMap) {
      if (barangaySelect.querySelectorAll("option").length <= 1) {
        Object.entries(config.barangayDistrictMap).forEach(([district, barangays]) => {
          barangays.forEach(barangay => {
            const option = document.createElement("option");
            option.value = barangay;
            option.textContent = `${barangay} (${district})`;
            option.dataset.district = district;
            barangaySelect.appendChild(option);
          });
        });
      }

      barangaySelect.addEventListener("change", () => {
        const selected = barangaySelect.options[barangaySelect.selectedIndex];
        districtInput.value = selected?.dataset.district || "";
      });
    }

    if (weightInput && pointsInput) {
      weightInput.addEventListener("input", () => {
        const tons = parseFloat(weightInput.value) || 0;
        const pounds = tons * 2000;
        pointsInput.value = Math.round(pounds * config.pointsPerPound);
      });
    }

    if (trashLogForm) {
      trashLogForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const barangay = barangaySelect?.value || "";
        const district = districtInput?.value || "";
        const tons = parseFloat(weightInput?.value) || 0;
        const pounds = tons * 2000;
        const points = Math.round(pounds * config.pointsPerPound);
        const date = document.getElementById("date")?.value || "";

        const newLog = { barangay, district, tons, points, date };

        const logs = JSON.parse(localStorage.getItem("trashLogs") || "[]");
        logs.push(newLog);
        localStorage.setItem("trashLogs", JSON.stringify(logs));

        alert(`Saved log for ${barangay} (${district})`);

        trashLogForm.reset();
        if (districtInput) districtInput.value = "";
        if (pointsInput) pointsInput.value = "";
      });
    }
  }

  /* ---------------------------
     Render Leaderboard (index.html)
     --------------------------- */
  function renderLeaderboard(allLogs) {
    const leaderboardList = document.getElementById("leaderboardList");
    const filterContainer = document.querySelector(".filter-tabs");

    if (!leaderboardList) return;

    const logMap = {};
    allLogs.forEach(log => logMap[log.barangay] = log);

    leaderboardList.innerHTML = "";

    const items = Array.from(leaderboardList.querySelectorAll(".leaderboard-item"));
    items.sort((a,b)=> parseFloat(b.querySelector(".points").textContent) - parseFloat(a.querySelector(".points").textContent));
    items.forEach((item, i) => {
      const rankDiv = item.querySelector(".rank");
      rankDiv.textContent = i+1;
      rankDiv.classList.remove("top-1","top-2","top-3");
      if(i===0) rankDiv.classList.add("top-1");
      else if(i===1) rankDiv.classList.add("top-2");
      else if(i===2) rankDiv.classList.add("top-3");
    });
    Object.entries(config.barangayDistrictMap).forEach(([district, barangays]) => {
      barangays.forEach(barangay => {
        const log = logMap[barangay] || {
          barangay,
          district,
          tons: 0,
          points: 0,
          date: ""
        };

        const li = document.createElement("li");
        li.className = "leaderboard-item";
        li.dataset.district = district; // ✅ keep proper case
        li.innerHTML = `
          <div class="rank">–</div>
          <div class="barangay-info">
            <h3>${log.barangay}</h3>
            <div class="district">${district} District</div>
            <div class="progress-bar">
              <span class="progress-fill" style="--p:${Math.min((log.points / config.progressMaxPoints) * 100, 100)}%"></span>
            </div>
          </div>
          <div class="metrics">
            <div class="weight">${log.tons}t</div>
            <div class="points">${log.points} pts</div>
          </div>
        `;
        leaderboardList.appendChild(li);
      });
    });

    const now = new Date();
    const isRecent = (dateStr) => {
      if (!dateStr) return false;
      const logDate = new Date(dateStr);
      const diffDays = (now - logDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 7; // last 7 days
    };


    li.innerHTML = `
      <div class="rank ${rankClass}">${rank}</div>
      <div class="barangay-info">
        <h3>${item.barangay} ${isRecent(item.date) ? '<span class="badge-new">🔥 NEW</span>' : ''}</h3>
        <div class="district">${item.district} District</div>
        <div class="progress-bar" data-percent="${progressPercent.toFixed(0)}">
          <span class="progress-fill" style="--p:${progressPercent}%"></span>
        </div>
      </div>
      <div class="metrics">
        <div class="weight">${item.tons.toFixed(1)}t</div>
        <div class="points">${item.points.toLocaleString()} pts</div>
      </div>
    `;

    li.classList.add("appear");
    setTimeout(() => li.classList.remove("appear"), 600);

    buildDistrictTabs(filterContainer);
    initLeaderboardControls();
  }

/* ---------------------------
   Enhanced Graph Rendering Functions
   --------------------------- */

function renderGraphs(allLogs, config) {
  renderBarChart(allLogs, config);
  renderDonutChart(allLogs, config);
  renderLineChart(allLogs, config);
}

// Add tooltip functionality for chart points
function addChartTooltips() {
  document.querySelectorAll('.points circle').forEach(circle => {
    circle.addEventListener('mouseenter', (e) => {
      const value = e.target.getAttribute('data-value') || e.target.getAttribute('title');
      if (value) {
        e.target.setAttribute('title', value);
      }
    });
  });
}

function renderBarChart(allLogs, config) {
  const barContainer = document.querySelector(".bar-chart svg g");
  if (!barContainer) return;

  // Calculate actual district totals
  const districtTotals = {};
  allLogs.forEach(log => {
    if (log.district && log.tons) {
      districtTotals[log.district] = (districtTotals[log.district] || 0) + log.tons;
    }
  });

  // Clear existing content
  barContainer.innerHTML = "";

  const districts = Object.keys(districtTotals).sort();
  const maxTons = Math.max(...Object.values(districtTotals), 1);
  const chartHeight = 120;
  const barWidth = 48;
  const barSpacing = 72;

  // Color gradients for different districts
  const colors = [
    "url(#g1)", // Green gradient
    "url(#g2)", // Blue gradient
    "#059669",  // Dark green
    "#22d3ee",  // Cyan
    "#94a3b8"   // Gray
  ];

  districts.forEach((district, i) => {
    const tons = districtTotals[district];
    const height = (tons / maxTons) * chartHeight;
    const x = i * barSpacing;
    const y = chartHeight - height;
    const color = colors[i % colors.length];

    barContainer.innerHTML += `
      <rect x="${x}" width="${barWidth}" y="${y}" height="${height}" rx="6" fill="${color}"></rect>
      <text x="${x + barWidth/2}" y="${chartHeight + 16}" text-anchor="middle" class="svg-label">${district}</text>
      <text x="${x + barWidth/2}" y="${y - 4}" text-anchor="middle" class="value-label">${tons.toFixed(1)}t</text>
    `;
  });
}

function renderDonutChart(allLogs, config) {
  const donut = document.querySelector(".donut-segment");
  const donutText = document.querySelector(".donut-text");
  
  if (!donut || !donutText || !config.barangayDistrictMap) return;

  // Calculate actual participation rate
  const allBarangays = Object.values(config.barangayDistrictMap).flat();
  const uniqueLogged = new Set(allLogs.map(l => l.barangay).filter(Boolean));
  const participationRate = allBarangays.length > 0 
    ? Math.round((uniqueLogged.size / allBarangays.length) * 100)
    : 0;

  // Update donut chart
  donut.setAttribute("stroke-dasharray", `${participationRate} ${100 - participationRate}`);
  donutText.textContent = participationRate + "%";

  // Update the description text
  const pieInfo = document.querySelector(".pie-info .pie-sub");
  if (pieInfo) {
    if (participationRate >= 80) {
      pieInfo.textContent = "High engagement — excellent progress";
    } else if (participationRate >= 60) {
      pieInfo.textContent = "Good participation — room for growth";
    } else if (participationRate >= 40) {
      pieInfo.textContent = "Moderate engagement — needs improvement";
    } else {
      pieInfo.textContent = "Low participation — focus on outreach";
    }
  }
}

function renderLineChart(allLogs, config) {
  const linePath = document.querySelector(".line");
  const areaPath = document.querySelector(".area");
  const pointsGroup = document.querySelector(".points");
  const gridGroup = document.querySelector(".grid");
  
  if (!linePath || !areaPath || !pointsGroup) return;

  // Group logs by month and calculate totals
  const monthTotals = {};
  allLogs.forEach(log => {
    if (!log.date || !log.tons) return;
    const month = log.date.slice(0, 7); // YYYY-MM format
    monthTotals[month] = (monthTotals[month] || 0) + log.tons;
  });

  const months = Object.keys(monthTotals).sort();
  
  // If no data, show a flat line
  if (months.length === 0) {
    linePath.setAttribute("d", "M0 64 L320 64");
    areaPath.setAttribute("d", "M0 128 L0 64 L320 64 L320 128 Z");
    pointsGroup.innerHTML = '<circle cx="160" cy="64" r="3.5" data-value="0t"></circle>';
    return;
  }

  const maxTons = Math.max(...Object.values(monthTotals), 1);
  const chartWidth = 320;
  const chartHeight = 128;
  
  // Create data points
  let lineD = "";
  let areaD = `M0 ${chartHeight} `;
  let pointsHtml = "";
  
  months.forEach((month, i) => {
    const tons = monthTotals[month];
    const x = months.length > 1 ? (i / (months.length - 1)) * chartWidth : chartWidth / 2;
    const y = chartHeight - (tons / maxTons) * chartHeight;
    
    if (i === 0) {
      lineD = `M${x} ${y}`;
      areaD += `L${x} ${y}`;
    } else {
      lineD += ` L${x} ${y}`;
      areaD += ` L${x} ${y}`;
    }
    
    // Format month for display (e.g., "2025-09" -> "Sep")
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = parseInt(month.split('-')[1]) - 1;
    const monthLabel = monthNames[monthIndex] || month.slice(-2);
    
    pointsHtml += `<circle cx="${x}" cy="${y}" r="3.5" data-value="${tons.toFixed(1)}t" title="${monthLabel}: ${tons.toFixed(1)}t"></circle>`;
  });

  areaD += ` L${chartWidth} ${chartHeight} L0 ${chartHeight} Z`;

  linePath.setAttribute("d", lineD);
  areaPath.setAttribute("d", areaD);
  pointsGroup.innerHTML = pointsHtml;

  // Update month labels in grid if available
  if (gridGroup && months.length >= 2) {
    const monthLabels = gridGroup.querySelectorAll('.svg-label');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    months.slice(0, monthLabels.length).forEach((month, i) => {
      if (monthLabels[i]) {
        const monthIndex = parseInt(month.split('-')[1]) - 1;
        monthLabels[i].textContent = monthNames[monthIndex] || month.slice(-2);
      }
    });
  }

  // Update the total in graph stat
  const graphStat = document.querySelector(".graph-stat strong");
  if (graphStat) {
    const totalTons = Object.values(monthTotals).reduce((sum, tons) => sum + tons, 0);
    graphStat.textContent = `${totalTons.toFixed(1)}t`;
  }
}

function renderStats(allLogs, config) {
  const statBarangays = document.getElementById("stat-barangays");
  const statTons = document.getElementById("stat-tons");
  const statPoints = document.getElementById("stat-points");
  const statParticipation = document.getElementById("stat-participation");

  if (!config.barangayDistrictMap) return;

  const totalBarangays = Object.values(config.barangayDistrictMap).flat().length;
  const totalTons = allLogs.reduce((sum, log) => sum + (log.tons || 0), 0);
  const totalPoints = allLogs.reduce((sum, log) => sum + (log.points || 0), 0);
  const uniqueLogged = new Set(allLogs.map(l => l.barangay).filter(Boolean));
  const participationRate = totalBarangays > 0
    ? Math.round((uniqueLogged.size / totalBarangays) * 100)
    : 0;

  if (statBarangays) statBarangays.textContent = totalBarangays;
  if (statTons) statTons.textContent = totalTons.toFixed(1) + "t";
  if (statPoints) statPoints.textContent = totalPoints.toLocaleString();
  if (statParticipation) statParticipation.textContent = participationRate + "%";
}

// Enhanced leaderboard rendering with proper sorting
function renderLeaderboard(allLogs) {
  const leaderboardList = document.getElementById("leaderboardList");
  const filterContainer = document.querySelector(".filter-tabs");

  if (!leaderboardList || !config.barangayDistrictMap) return;

  // Aggregate logs by barangay (sum up multiple entries)
  const barangayTotals = {};
  allLogs.forEach(log => {
    if (!log.barangay) return;
    
    if (!barangayTotals[log.barangay]) {
      barangayTotals[log.barangay] = {
        barangay: log.barangay,
        district: log.district,
        tons: 0,
        points: 0,
        date: log.date
      };
    }
    
    barangayTotals[log.barangay].tons += (log.tons || 0);
    barangayTotals[log.barangay].points += (log.points || 0);
    
    // Keep the most recent date
    if (log.date && (!barangayTotals[log.barangay].date || log.date > barangayTotals[log.barangay].date)) {
      barangayTotals[log.barangay].date = log.date;
    }
  });

  leaderboardList.innerHTML = "";

  // Create array of all barangays with their data
  const allItems = [];
  Object.entries(config.barangayDistrictMap).forEach(([district, barangays]) => {
    barangays.forEach(barangay => {
      const data = barangayTotals[barangay] || {
        barangay,
        district,
        tons: 0,
        points: 0,
        date: ""
      };
      allItems.push(data);
    });
  });

  // Sort by points (descending)
  allItems.sort((a, b) => (b.points || 0) - (a.points || 0));

  // Render sorted items
  allItems.forEach((item, index) => {
    const rank = index + 1;
    const progressPercent = config.progressMaxPoints > 0 
      ? Math.min((item.points / config.progressMaxPoints) * 100, 100)
      : 0;

    const li = document.createElement("li");
    li.className = "leaderboard-item";
    li.dataset.district = item.district;
    
    let rankClass = "";
    if (rank === 1) rankClass = "top-1";
    else if (rank === 2) rankClass = "top-2";
    else if (rank === 3) rankClass = "top-3";

    li.innerHTML = `
      <div class="rank ${rankClass}">${rank}</div>
      <div class="barangay-info">
        <h3>${item.barangay}</h3>
        <div class="district">${item.district} District</div>
        <div class="progress-bar" data-percent="${progressPercent.toFixed(0)}">
          <span class="progress-fill" style="--p:${progressPercent}%"></span>
        </div>
      </div>
      <div class="metrics">
        <div class="weight">${item.tons.toFixed(1)}t</div>
        <div class="points">${item.points.toLocaleString()} pts</div>
      </div>
    `;
    leaderboardList.appendChild(li);
  });

  buildDistrictTabs(filterContainer);
  initLeaderboardControls();
}

  /* ---------------------------
     Build District Tabs
     --------------------------- */
  function buildDistrictTabs(container) {
    if (!container) return;
    const districts = Object.keys(config.barangayDistrictMap).sort();
    container.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.className = "filter-btn active";
    allBtn.textContent = "All Districts";
    container.appendChild(allBtn);
    districts.forEach(d => {
      const btn = document.createElement("button");
      btn.className = "filter-btn";
      btn.textContent = d;
      container.appendChild(btn);
    });
  }

  /* ---------------------------
     Search + Filter Controls
     --------------------------- */
  function initLeaderboardControls() {
    const searchInput = document.querySelector(".search-box input");
    const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
    const leaderboardItems = Array.from(document.querySelectorAll(".leaderboard-item"));
    const loadMoreBtn = document.querySelector(".btn-secondary");

    if (searchInput) {
      searchInput.disabled = false;
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        leaderboardItems.forEach(item => {
          const name = item.querySelector("h3")?.textContent?.toLowerCase() ?? "";
          const district = (item.dataset.district || "").toLowerCase();
          item.style.display = (name.includes(q) || district.includes(q)) ? "" : "none";
        });
      });
    }

    if (filterButtons.length && leaderboardItems.length) {
      filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
          filterButtons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const filter = btn.textContent.trim().toLowerCase();
          leaderboardItems.forEach(item => {
            const district = (item.dataset.district || "").toLowerCase();
            item.style.display =
              (filter === "all districts" || district === filter) ? "" : "none";
          });
        });
      });
    }

    if (loadMoreBtn && leaderboardItems.length > 5) {
      loadMoreBtn.disabled = false;
      const hidden = leaderboardItems.slice(5);
      hidden.forEach(i => i.style.display = "none");
      loadMoreBtn.addEventListener("click", () => {
        hidden.forEach(i => i.style.display = "");
        loadMoreBtn.style.display = "none";
      });
    }
  }

  /* ---------------------------
     Run Everything
     --------------------------- */
  loadConfigAndLogs().then(() => {
      setupForm();

      const localLogs = JSON.parse(localStorage.getItem("trashLogs") || "[]");
      const allLogs = [...seedLogs, ...localLogs];

      renderLeaderboard(allLogs);
      renderGraphs(allLogs, config);
      renderStats(allLogs, config);
      addChartTooltips(); // Add this line for better interactivity
  });


  // document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById('addLogModal');
    const modalForm = document.getElementById('modalTrashLogForm');
    const modalBarangaySelect = document.getElementById('modalBarangay');
    const modalDistrictInput = document.getElementById('modalDistrict');
    const modalWeightInput = document.getElementById('modalWeight');
    const modalPointsInput = document.getElementById('modalPoints');
    const modalCloseBtn = document.querySelector('.modal-close');
    const modalCancelBtn = document.querySelector('.modal-cancel');

    // Function to open modal
    function openModal() {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('modalDate').value = today;
      
      // Focus first input
      setTimeout(() => modalBarangaySelect.focus(), 100);
    }

    // Function to close modal
    function closeModal() {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      modalForm.reset();
      modalDistrictInput.value = '';
      modalPointsInput.value = '';
    }

    // Event listeners for opening modal
    document.addEventListener('click', (e) => {
      if (e.target.textContent === 'Add Log' && e.target.classList.contains('filter-btn')) {
        e.preventDefault();
        openModal();
      }
    });

    // Event listeners for closing modal
    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking overlay
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });

    // Populate modal barangay dropdown
    function setupModalForm() {
      if (modalBarangaySelect && config.barangayDistrictMap) {
        // Clear existing options except the first one
        modalBarangaySelect.innerHTML = '<option value="">Select Barangay</option>';
        
        Object.entries(config.barangayDistrictMap).forEach(([district, barangays]) => {
          barangays.forEach(barangay => {
            const option = document.createElement("option");
            option.value = barangay;
            option.textContent = `${barangay} (${district})`;
            option.dataset.district = district;
            modalBarangaySelect.appendChild(option);
          });
        });
      }

      // Handle barangay selection
      if (modalBarangaySelect && modalDistrictInput) {
        modalBarangaySelect.addEventListener("change", () => {
          const selected = modalBarangaySelect.options[modalBarangaySelect.selectedIndex];
          modalDistrictInput.value = selected?.dataset.district || "";
        });
      }

      // Handle weight input for points calculation
      if (modalWeightInput && modalPointsInput) {
        modalWeightInput.addEventListener("input", () => {
          const tons = parseFloat(modalWeightInput.value) || 0;
          const pounds = tons * 2000;
          modalPointsInput.value = Math.round(pounds * config.pointsPerPound);
        });
      }

      // Handle form submission
      if (modalForm) {
        modalForm.addEventListener("submit", (e) => {
          e.preventDefault();

          const barangay = modalBarangaySelect?.value || "";
          const district = modalDistrictInput?.value || "";
          const tons = parseFloat(modalWeightInput?.value) || 0;
          const pounds = tons * 2000;
          const points = Math.round(pounds * config.pointsPerPound);
          const date = document.getElementById("modalDate")?.value || "";

          if (!barangay || !district || !tons || !date) {
            alert("Please fill in all fields.");
            return;
          }

          const newLog = { barangay, district, tons, points, date };

          // Save to localStorage
          const logs = JSON.parse(localStorage.getItem("trashLogs") || "[]");
          logs.push(newLog);
          localStorage.setItem("trashLogs", JSON.stringify(logs));

          // Update the display immediately
          const localLogs = JSON.parse(localStorage.getItem("trashLogs") || "[]");
          const allLogs = [...seedLogs, ...localLogs];
          
          renderLeaderboard(allLogs);
          renderGraphs(allLogs, config);
          renderStats(allLogs, config);

          alert(`Successfully saved log for ${barangay} (${district})`);
          closeModal();
        });
      }
    }

    // Call setupModalForm after config is loaded
    const originalLoadConfig = loadConfigAndLogs;
    if (typeof loadConfigAndLogs === 'function') {
      loadConfigAndLogs().then(() => {
        setupModalForm();
        setupForm();
        
        const localLogs = JSON.parse(localStorage.getItem("trashLogs") || "[]");
        const allLogs = [...seedLogs, ...localLogs];
        
        renderLeaderboard(allLogs);
        renderGraphs(allLogs, config);
        renderStats(allLogs, config);
      });
    }
  // });
function renderEnhancedParticipation(allLogs, config) {
  if (!config.barangayDistrictMap) return;

  const allBarangays = Object.values(config.barangayDistrictMap).flat();
  const uniqueLogged = new Set(allLogs.map(l => l.barangay).filter(Boolean));
  const participationRate = allBarangays.length > 0 
    ? Math.round((uniqueLogged.size / allBarangays.length) * 100)
    : 0;

  // Update circular progress
  const progressCircle = document.querySelector('.participation-progress');
  const percentText = document.querySelector('.participation-percent');
  const activeCount = document.getElementById('active-barangays');
  const inactiveCount = document.getElementById('inactive-barangays');

  if (progressCircle && percentText) {
    const circumference = 283; // 2 * π * 45
    const offset = circumference - (participationRate / 100) * circumference;
    
    setTimeout(() => {
      progressCircle.style.strokeDashoffset = offset;
      percentText.textContent = participationRate + '%';
    }, 300);
  }

  if (activeCount && inactiveCount) {
    activeCount.textContent = uniqueLogged.size;
    inactiveCount.textContent = allBarangays.length - uniqueLogged.size;
  }

  // Update status indicators
  const indicators = document.querySelectorAll('.indicator');
  indicators.forEach(indicator => indicator.classList.remove('current'));
  
  if (participationRate >= 80) {
    document.querySelector('.indicator.excellent')?.classList.add('current');
  } else if (participationRate >= 60) {
    document.querySelector('.indicator.good')?.classList.add('current');
  } else {
    document.querySelector('.indicator.needs-improvement')?.classList.add('current');
  }

  // Render district breakdown
  renderDistrictParticipation(allLogs, config);
  
  // Render recent activity
  renderRecentActivity(allLogs);
}

function renderDistrictParticipation(allLogs, config) {
  const container = document.getElementById('districtParticipation');
  if (!container) return;

  const districtStats = {};
  
  // Calculate participation by district
  Object.entries(config.barangayDistrictMap).forEach(([district, barangays]) => {
    const activeInDistrict = barangays.filter(barangay => 
      allLogs.some(log => log.barangay === barangay)
    ).length;
    
    districtStats[district] = {
      total: barangays.length,
      active: activeInDistrict,
      percentage: barangays.length > 0 ? Math.round((activeInDistrict / barangays.length) * 100) : 0
    };
  });

  container.innerHTML = '';
  
  Object.entries(districtStats)
    .sort(([,a], [,b]) => b.percentage - a.percentage)
    .forEach(([district, stats]) => {
      const barEl = document.createElement('div');
      barEl.className = 'district-bar';
      barEl.innerHTML = `
        <span class="district-name">${district}</span>
        <div class="district-progress">
          <div class="district-fill" style="--width: ${stats.percentage}%"></div>
        </div>
        <span class="district-percentage">${stats.percentage}%</span>
      `;
      container.appendChild(barEl);
      
      // Animate the fill
      setTimeout(() => {
        const fill = barEl.querySelector('.district-fill');
        fill.style.width = stats.percentage + '%';
      }, 500);
    });
}

function renderRecentActivity(allLogs) {
  const container = document.getElementById('recentActivity');
  if (!container) return;

  // Get recent logs (last 5)
  const recentLogs = allLogs
    .filter(log => log.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  container.innerHTML = '';
  
  if (recentLogs.length === 0) {
    container.innerHTML = `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <span class="activity-text">No recent activity</span>
      </div>
    `;
    return;
  }

  recentLogs.forEach((log, index) => {
    const isNew = index < 2; // Mark first 2 as new
    const date = new Date(log.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    const activityEl = document.createElement('div');
    activityEl.className = `activity-item ${isNew ? 'new' : ''}`;
    activityEl.innerHTML = `
      <div class="activity-dot"></div>
      <span class="activity-text">${log.barangay} logged ${log.tons}t (${date})</span>
    `;
    container.appendChild(activityEl);
  });
}

// Update your main rendering function to include the enhanced participation
function renderGraphs(allLogs, config) {
  renderBarChart(allLogs, config);
  renderEnhancedParticipation(allLogs, config); // Replace old donut chart
  renderLineChart(allLogs, config);
}


});
