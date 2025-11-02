function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function loadConsentToggle() {
  chrome.storage.local.get(["consentText"], (res) => {
    const checked = !!res.consentText;
    const cb = document.getElementById("consentSamples");
    if (cb) cb.checked = checked;
  });
}

function saveConsent(checked) {
  const val = checked ? new Date().toISOString() : null;
  chrome.storage.local.set({ consentText: val }, () => {
    console.log("[Popup] consentText set ->", val);
  });
}

function renderUsage() {
  chrome.storage.local.get(["usage"], (result) => {
    const usage = result.usage || {};
    const container = document.getElementById("usage");

    if (!container) return;
    container.innerHTML = "";

    const metaKeys = [
      "tabSwitches",
      "typingKeystrokes",
      "idleMs",
      "samples",
      "mediaEvents",
    ];
    const hasCategories =
      typeof usage.productive === "number" ||
      typeof usage.distracting === "number" ||
      typeof usage.other === "number";

    if (hasCategories) {
      const categories = [
        { name: "✅ Productive", value: usage.productive || 0 },
        { name: "⚠️ Distracting", value: usage.distracting || 0 },
        { name: "📄 Other", value: usage.other || 0 },
      ].filter((c) => c.value > 0);

      if (categories.length === 0) {
        container.innerHTML =
          '<div class="empty">No tracked activity yet. Start browsing!</div>';
        return;
      }

      categories.sort((a, b) => b.value - a.value);

      categories.forEach((cat) => {
        const div = document.createElement("div");
        div.className = "site";
        div.textContent = `${cat.name} — ${formatTime(cat.value)}`;
        container.appendChild(div);
      });
    } else {
      const entries = Object.entries(usage).filter(([k, v]) => {
        return (
          typeof v === "number" &&
          v > 0 &&
          !metaKeys.includes(k) &&
          !["productive", "distracting", "other"].includes(k)
        );
      });

      if (entries.length === 0) {
        container.innerHTML =
          '<div class="empty">No tracked domains yet. Start browsing!</div>';
        return;
      }

      const sorted = entries.sort((a, b) => b[1] - a[1]);
      sorted.slice(0, 5).forEach(([domain, time]) => {
        const div = document.createElement("div");
        div.className = "site";
        div.textContent = `${domain} — ${formatTime(time)}`;
        container.appendChild(div);
      });

      if (sorted.length > 5) {
        const moreDiv = document.createElement("div");
        moreDiv.className = "site more-hint";
        moreDiv.textContent = `+ ${sorted.length - 5} more (view dashboard)`;
        moreDiv.style.color = "#718093";
        moreDiv.style.fontStyle = "italic";
        container.appendChild(moreDiv);
      }
    }

    // Show media stats if present
    if (usage.mediaPlays) {
      const div = document.createElement("div");
      div.className = "site";
      div.textContent = `🎬 Media plays: ${usage.mediaPlays} — ${formatTime(
        usage.mediaPlayMs || 0
      )}`;
      container.appendChild(div);
    }

    const totalActive =
      (usage.productive || 0) + (usage.distracting || 0) + (usage.other || 0);
    if (totalActive > 0) {
      const summaryDiv = document.createElement("div");
      summaryDiv.className = "usage-summary";
      summaryDiv.innerHTML = `
        <div class="summary-line">Total: ${formatTime(totalActive)}</div>
        <div class="summary-line">Switches: ${usage.tabSwitches || 0} | Keys: ${
        usage.typingKeystrokes || 0
      }</div>
      `;
      container.appendChild(summaryDiv);
    }
  });
}

function renderEmotionFromProfile(p) {
  const sumEl = document.getElementById("emotion-summary");
  const insightEl = document.getElementById("emotion-insight");
  const actionEl = document.getElementById("emotion-action");

  if (!sumEl || !insightEl || !actionEl) return;

  if (!p) {
    sumEl.textContent = "No insight yet — browse a bit to collect data.";
    insightEl.textContent = "";
    actionEl.textContent = "";
    return;
  }

  const moodEmoji = getMoodEmoji(p.mood);
  sumEl.textContent = `${moodEmoji} ${p.summary || "Processing..."}`;
  sumEl.style.fontWeight = "500";

  insightEl.textContent = `💡 ${p.insight || ""}`;
  actionEl.textContent = `🎯 ${p.action || ""}`;
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

// Read emotionProfile and profileSource and show badge if AI-assisted
function renderEmotion() {
  chrome.storage.local.get(["emotionProfile", "profileSource"], (res) => {
    renderEmotionFromProfile(res.emotionProfile);

    // manage AI badge
    const existing = document.getElementById("aiBadge");
    if (existing) existing.remove();
    const header = document.querySelector(".container h1");
    if (!header) return;
    if (res.profileSource === "ai") {
      const span = document.createElement("span");
      span.id = "aiBadge";
      span.textContent = "AI-assisted";
      span.style.marginLeft = "10px";
      span.style.fontSize = "12px";
      span.style.background = "#5040c8ff";
      span.style.color = "white";
      span.style.padding = "4px 8px";
      span.style.borderRadius = "6px";
      header.appendChild(span);
    } else if (res.profileSource === "local") {
      // optionally show 'Local' small badge or nothing
      const span = document.createElement("span");
      span.id = "aiBadge";
      span.textContent = "Local calc";
      span.style.marginLeft = "10px";
      span.style.fontSize = "12px";
      span.style.background = "#95a5a6";
      span.style.color = "white";
      span.style.padding = "4px 8px";
      span.style.borderRadius = "6px";
      header.appendChild(span);
    }
  });
}

// --- Reminders list UI and actions ---
function renderRemindersList() {
  chrome.storage.local.get(["reminders"], (res) => {
    const list = res.reminders || [];
    const container = document.getElementById("remindersList");
    if (!container) return;
    container.innerHTML = "";
    if (list.length === 0) {
      container.textContent = "No scheduled reminders";
      return;
    }
    list
      .sort((a, b) => a.when - b.when)
      .forEach((r) => {
        const el = document.createElement("div");
        el.className = "site";
        const when = new Date(r.when).toLocaleTimeString();
        el.innerHTML = `<strong>${r.title}</strong> — ${when}<div style="font-size:12px; color:#666">${r.message}</div>`;
        const btnS = document.createElement("button");
        btnS.textContent = "Snooze 5m";
        btnS.style.marginRight = "6px";
        const btnD = document.createElement("button");
        btnD.textContent = "Dismiss";
        btnS.addEventListener("click", () => {
          chrome.runtime.sendMessage(
            { type: "snoozeReminder", id: r.id },
            () => {
              renderRemindersList();
            }
          );
        });
        btnD.addEventListener("click", () => {
          chrome.runtime.sendMessage(
            { type: "dismissReminder", id: r.id },
            () => {
              renderRemindersList();
            }
          );
        });
        el.appendChild(document.createElement("br"));
        el.appendChild(btnS);
        el.appendChild(btnD);
        container.appendChild(el);
      });
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("[Popup] Initializing...");

  loadConsentToggle();

  renderUsage();
  renderEmotion();
  renderRemindersList();

  const consentCb = document.getElementById("consentSamples");
  if (consentCb) {
    consentCb.addEventListener("change", (e) => saveConsent(e.target.checked));
  }

  const clearBtn = document.getElementById("clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      console.log("[Popup] Clear Data clicked");

      if (confirm("Clear all tracking data?")) {
        clearBtn.disabled = true;
        clearBtn.textContent = "Clearing...";

        chrome.runtime.sendMessage({ type: "resetUsage" }, (res) => {
          console.log("[Popup] Reset response:", res);
          renderUsage();
          renderEmotion();
          renderRemindersList();
          clearBtn.disabled = false;
          clearBtn.textContent = "Clear Data";
        });
      }
    });
  }

  const refreshBtn = document.getElementById("refreshInsight");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      console.log("[Popup] Refresh Insight clicked");
      const prevText = refreshBtn.textContent;
      refreshBtn.disabled = true;
      refreshBtn.textContent = "Refreshing...";

      chrome.runtime.sendMessage({ type: "recomputeProfile" }, (resp) => {
        console.log("[Popup] Recompute response:", resp);

        if (resp && resp.ok && resp.profile) {
          renderEmotionFromProfile(resp.profile);
        } else {
          setTimeout(() => {
            renderEmotion();
          }, 500);
        }

        // Also refresh usage and reminders
        renderUsage();
        renderRemindersList();

        refreshBtn.disabled = false;
        refreshBtn.textContent = prevText;
      });
    });
  }

  const dashboardBtn = document.getElementById("dashboard");
  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", () => {
      console.log("[Popup] Opening dashboard...");
      chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    });
  }

  const settingsBtn = document.getElementById("settings");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      console.log("[Popup] Opening AI settings...");
      chrome.runtime.openOptionsPage();
    });
  }

  console.log("[Popup] All event listeners attached");
});
