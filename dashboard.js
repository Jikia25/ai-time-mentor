// dashboard.js - Fixed and improved version

function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function renderEmotionCard(profile) {
  const container = document.getElementById("emotion-container");
  container.innerHTML = "";

  if (!profile) {
    container.innerHTML = `
      <section class="emotion-card">
        <h2>📊 Emotion & Focus Insight</h2>
        <p class="empty">No emotion profile yet. Browse for 5-10 minutes to generate insights.</p>
      </section>
    `;
    return;
  }

  const stressColor =
    profile.stress < 0.3
      ? "#44bd32"
      : profile.stress < 0.6
      ? "#f39c12"
      : "#e74c3c";
  const focusColor =
    profile.focusPct > 70
      ? "#44bd32"
      : profile.focusPct > 40
      ? "#f39c12"
      : "#e74c3c";

  const html = `
    <section class="emotion-card">
      <h2>🧠 Today's Emotion & Focus Profile</h2>
      
      <div class="profile-summary">
        <p><strong>Summary:</strong> ${profile.summary}</p>
      </div>

      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-label">Focus Score</div>
          <div class="metric-value" style="color: ${focusColor}">${
    profile.focusPct
  }%</div>
          <div class="metric-bar">
            <div class="metric-fill" style="width: ${
              profile.focusPct
            }%; background: ${focusColor}"></div>
          </div>
        </div>

        <div class="metric-box">
          <div class="metric-label">Stress Level</div>
          <div class="metric-value" style="color: ${stressColor}">${Math.round(
    profile.stress * 100
  )}%</div>
          <div class="metric-bar">
            <div class="metric-fill" style="width: ${Math.round(
              profile.stress * 100
            )}%; background: ${stressColor}"></div>
          </div>
        </div>

        <div class="metric-box">
          <div class="metric-label">Mood</div>
          <div class="metric-value mood-badge">${getMoodEmoji(profile.mood)} ${
    profile.mood
  }</div>
        </div>

        <div class="metric-box">
          <div class="metric-label">Switch Rate</div>
          <div class="metric-value">${profile.switchRate}/min</div>
        </div>
      </div>

      <div class="insights-section">
        <div class="insight-box">
          <h3>💡 Insight</h3>
          <p>${profile.insight}</p>
        </div>

        <div class="action-box">
          <h3>🎯 Recommended Action</h3>
          <p>${profile.action}</p>
        </div>
      </div>

      <div class="detailed-stats">
        <p><small>Typing Intensity: ${
          profile.typingIntensity
        } keys/min | Idle Ratio: ${Math.round(
    profile.idleRatio * 100
  )}%</small></p>
      </div>
    </section>
  `;

  container.innerHTML = html;
}

function getMoodEmoji(mood) {
  const emojis = {
    focused: "🎯",
    calm: "😌",
    frustrated: "😤",
    tired: "😴",
    restless: "😰",
    mixed: "🤔",
  };
  return emojis[mood] || "🤔";
}

function renderUsageStats(usage) {
  const container = document.getElementById("usage-container");
  container.innerHTML = "<h2>⏱️ Time Breakdown</h2>";

  if (!usage || Object.keys(usage).length === 0) {
    container.innerHTML +=
      '<p class="empty">No usage data yet. Start browsing to track activity.</p>';
    return;
  }

  const metaKeys = ["tabSwitches", "typingKeystrokes", "idleMs", "samples"];
  const hasCategories =
    typeof usage.productive === "number" ||
    typeof usage.distracting === "number" ||
    typeof usage.other === "number";

  let entries = [];
  let total = 1;

  if (hasCategories) {
    // Category-based tracking
    if (usage.productive > 0)
      entries.push(["✅ Productive Time", usage.productive, "#44bd32"]);
    if (usage.distracting > 0)
      entries.push(["⚠️ Distracting Time", usage.distracting, "#e74c3c"]);
    if (usage.other > 0)
      entries.push(["📄 Other Time", usage.other, "#95a5a6"]);
    total =
      (usage.productive || 0) + (usage.distracting || 0) + (usage.other || 0) ||
      1;
  } else {
    // Domain-based tracking
    const domainEntries = Object.entries(usage).filter(([k, v]) => {
      return (
        typeof v === "number" &&
        v > 0 &&
        !metaKeys.includes(k) &&
        !["productive", "distracting", "other"].includes(k)
      );
    });

    entries = domainEntries.map(([k, v]) => [k, v, "#3498db"]);
    total = entries.reduce((sum, [_, time]) => sum + time, 0) || 1;
  }

  if (entries.length === 0) {
    container.innerHTML += '<p class="empty">No usage data available yet.</p>';
    return;
  }

  // Sort by time descending
  entries.sort((a, b) => b[1] - a[1]);

  // Show top 10
  entries.slice(0, 10).forEach(([name, time, color]) => {
    const percent = ((time / total) * 100).toFixed(1);
    const div = document.createElement("div");
    div.className = "stat-card";
    div.innerHTML = `
      <div class="stat-header">
        <strong>${name}</strong>
        <span>${formatTime(time)} (${percent}%)</span>
      </div>
      <div class="bar">
        <div class="fill" style="width:${percent}%; background: ${color}"></div>
      </div>
    `;
    container.appendChild(div);
  });

  // Activity summary
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "activity-summary";
  summaryDiv.innerHTML = `
    <h3>📈 Activity Summary</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">Total Active Time</div>
        <div class="summary-value">${formatTime(total)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Tab Switches</div>
        <div class="summary-value">${usage.tabSwitches || 0}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Keystrokes</div>
        <div class="summary-value">${usage.typingKeystrokes || 0}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Idle Time</div>
        <div class="summary-value">${formatTime(usage.idleMs || 0)}</div>
      </div>
    </div>
  `;
  container.appendChild(summaryDiv);
}

function refreshDashboard() {
  console.log("[Dashboard] Refreshing data...");

  chrome.storage.local.get(["emotionProfile", "usage"], (res) => {
    console.log("[Dashboard] Data received:", res);

    renderEmotionCard(res.emotionProfile);
    renderUsageStats(res.usage || {});
  });
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Dashboard] Initializing...");

  refreshDashboard();

  // Refresh button
  const refreshBtn = document.getElementById("refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      console.log("[Dashboard] Manual refresh triggered");
      refreshBtn.disabled = true;
      refreshBtn.textContent = "🔄 Refreshing...";

      // Request recompute
      chrome.runtime.sendMessage({ type: "recomputeProfile" }, (resp) => {
        console.log("[Dashboard] Recompute response:", resp);
        setTimeout(() => {
          refreshDashboard();
          refreshBtn.disabled = false;
          refreshBtn.textContent = "🔄 Refresh Data";
        }, 500);
      });
    });
  }

  // Back button
  const backBtn = document.getElementById("back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.close();
    });
  }

  // Clear button
  const clearBtn = document.getElementById("clearData");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all tracking data?")) {
        chrome.runtime.sendMessage({ type: "resetUsage" }, () => {
          refreshDashboard();
        });
      }
    });
  }

  // AI Features
  checkAIStatus();

  // Generate Goals button
  const goalsBtn = document.getElementById("generateGoals");
  if (goalsBtn) {
    goalsBtn.addEventListener("click", async () => {
      const output = document.getElementById("ai-output");
      output.innerHTML = '<div style="text-align: center; padding: 20px;">⏳ Generating personalized goals...</div>';
      goalsBtn.disabled = true;

      chrome.runtime.sendMessage({ type: "generateGoals" }, (response) => {
        goalsBtn.disabled = false;
        if (response && response.ok && response.goals) {
          displayGoals(response.goals);
        } else {
          output.innerHTML = `<div class="error">❌ Error: ${response?.error || 'Failed to generate goals'}</div>`;
        }
      });
    });
  }

  // Generate Report button
  const reportBtn = document.getElementById("generateReport");
  if (reportBtn) {
    reportBtn.addEventListener("click", async () => {
      const output = document.getElementById("ai-output");
      output.innerHTML = '<div style="text-align: center; padding: 20px;">⏳ Generating weekly report...</div>';
      reportBtn.disabled = true;

      // Gather weekly data
      chrome.storage.local.get(["usage", "emotionProfile"], (res) => {
        const weeklyData = {
          usage: res.usage || {},
          profile: res.emotionProfile || {}
        };

        chrome.runtime.sendMessage(
          { type: "generateWeeklyReport", data: weeklyData },
          (response) => {
            reportBtn.disabled = false;
            if (response && response.ok && response.report) {
              displayReport(response.report);
            } else {
              output.innerHTML = `<div class="error">❌ Error: ${response?.error || 'Failed to generate report'}</div>`;
            }
          }
        );
      });
    });
  }

  // Open Settings button
  const settingsBtn = document.getElementById("openSettings");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }
});

// Check AI configuration status
function checkAIStatus() {
  chrome.storage.local.get(["aiConfig"], (res) => {
    const statusDiv = document.getElementById("ai-status");
    const config = res.aiConfig;

    if (config && config.enabled && config.apiKey) {
      statusDiv.innerHTML = `
        <div style="padding: 10px; background: #d4edda; border-radius: 8px; color: #155724; font-size: 14px;">
          ✅ AI Configured: ${config.provider} (${config.model})
        </div>
      `;
    } else {
      statusDiv.innerHTML = `
        <div style="padding: 10px; background: #fff3cd; border-radius: 8px; color: #856404; font-size: 14px;">
          ⚠️ AI not configured. Click "AI Settings" to set up.
        </div>
      `;
    }
  });
}

// Display generated goals
function displayGoals(goals) {
  const output = document.getElementById("ai-output");

  if (!goals || goals.length === 0) {
    output.innerHTML = '<div class="error">No goals generated</div>';
    return;
  }

  let html = '<div class="goals-container" style="background: #f8f9fc; padding: 20px; border-radius: 12px;">';
  html += '<h3 style="margin: 0 0 15px 0; color: #2c3e50;">🎯 Your Personalized Goals</h3>';

  goals.forEach((goal, index) => {
    html += `
      <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 12px; border-left: 4px solid #667eea;">
        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 8px;">${index + 1}. ${goal.goal}</div>
        <div style="font-size: 13px; color: #7f8c8d;">
          <div>📍 Current: <strong>${goal.current}</strong></div>
          <div>🎯 Target: <strong>${goal.target}</strong></div>
          <div>⏰ Timeframe: <strong>${goal.timeframe}</strong></div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  output.innerHTML = html;
}

// Display weekly report
function displayReport(report) {
  const output = document.getElementById("ai-output");

  const html = `
    <div class="report-container" style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 20px; border-radius: 12px;">
      <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📊 Weekly Report</h3>
      <div style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 10px; line-height: 1.8; color: #2c3e50; white-space: pre-wrap;">
        ${report}
      </div>
    </div>
  `;

  output.innerHTML = html;
}
