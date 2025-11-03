/**
 * Popup.js - Main popup interface for AI Time Mentor
 * Integrates with the new mockup design
 */

function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatTimeShort(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return '< 1m';
}

function getMoodEmoji(mood) {
  const emojis = {
    focused: "🎯",
    calm: "😌",
    frustrated: "😤",
    tired: "😴",
    restless: "😰",
    mixed: "🤔",
    productive: "💪",
    stressed: "😰"
  };
  return emojis[mood] || "🤔";
}

function getMoodLabel(mood) {
  const labels = {
    focused: "Focused",
    calm: "Calm",
    frustrated: "Frustrated",
    tired: "Tired",
    restless: "Restless",
    mixed: "Mixed",
    productive: "Productive",
    stressed: "Stressed"
  };
  return labels[mood] || "Neutral";
}

/**
 * Calculate focus score from usage data
 */
function calculateFocusScore(usage) {
  const totalTime = (usage.productive || 0) + (usage.distracting || 0) + (usage.other || 0);
  if (totalTime === 0) return 0;

  const productiveRatio = (usage.productive || 0) / totalTime;
  const distractingRatio = (usage.distracting || 0) / totalTime;

  // Base score from productive ratio
  let score = productiveRatio * 100;

  // Penalty for too many tab switches (more than 1 per minute of active time)
  const activeMinutes = totalTime / 60000;
  const tabSwitchRate = (usage.tabSwitches || 0) / Math.max(activeMinutes, 1);
  if (tabSwitchRate > 1) {
    score *= Math.max(0.7, 1 - (tabSwitchRate - 1) * 0.05);
  }

  return Math.round(score);
}

/**
 * Calculate stress level
 */
function calculateStressLevel(usage) {
  const tabSwitchRate = (usage.tabSwitches || 0) / Math.max((usage.productive || 0) / 60000, 1);
  const distractingRatio = (usage.distracting || 0) / Math.max(
    (usage.productive || 0) + (usage.distracting || 0) + (usage.other || 0),
    1
  );

  // High tab switches or high distracting time = higher stress
  const stress = Math.min(100, Math.round((tabSwitchRate * 5 + distractingRatio * 50)));
  return stress;
}

/**
 * Render focus stats card
 */
function renderFocusStats(usage) {
  const focusScore = calculateFocusScore(usage);

  // Update focus score
  const focusScoreEl = document.getElementById('focusScore');
  if (focusScoreEl) {
    focusScoreEl.textContent = `${focusScore}%`;
  }

  // Update progress bar
  const progressFillEl = document.getElementById('progressFill');
  if (progressFillEl) {
    progressFillEl.style.width = `${focusScore}%`;
  }

  // Update stat values
  const productiveTimeEl = document.getElementById('productiveTime');
  const distractingTimeEl = document.getElementById('distractingTime');
  const tabSwitchesEl = document.getElementById('tabSwitches');

  if (productiveTimeEl) {
    productiveTimeEl.textContent = formatTimeShort(usage.productive || 0);
  }
  if (distractingTimeEl) {
    distractingTimeEl.textContent = formatTimeShort(usage.distracting || 0);
  }
  if (tabSwitchesEl) {
    tabSwitchesEl.textContent = usage.tabSwitches || 0;
  }
}

/**
 * Render AI insights
 */
function renderAIInsights(profile) {
  const insightTextEl = document.getElementById('insightText');
  const actionSuggestionEl = document.getElementById('actionSuggestion');

  if (!profile) {
    if (insightTextEl) {
      insightTextEl.textContent = 'დააგროვე მეტი მონაცემი AI ანალიზისთვის. დაიწყე ბრაუზინგი!';
    }
    if (actionSuggestionEl) {
      actionSuggestionEl.innerHTML = '<strong>💡 რჩევა:</strong> გააგრძელე სამუშაო რამდენიმე წუთი პერსონალიზებული რეკომენდაციებისთვის!';
    }
    return;
  }

  if (insightTextEl) {
    insightTextEl.textContent = profile.insight || profile.summary || 'ვაანალიზებთ შენს პროდუქტიულობას...';
  }

  if (actionSuggestionEl) {
    const action = profile.action || 'გააგრძელე კარგი მუშაობა!';
    actionSuggestionEl.innerHTML = `<strong>💡 რჩევა:</strong> ${action}`;
  }
}

/**
 * Render mood and stress
 */
function renderMoodAndStress(profile, usage) {
  const mood = profile?.mood || 'focused';
  const stressLevel = calculateStressLevel(usage);

  const moodEmojiEl = document.getElementById('moodEmoji');
  const moodValueEl = document.getElementById('moodValue');
  const stressLevelEl = document.getElementById('stressLevel');

  if (moodEmojiEl) {
    moodEmojiEl.textContent = getMoodEmoji(mood);
  }
  if (moodValueEl) {
    moodValueEl.textContent = getMoodLabel(mood);
  }
  if (stressLevelEl) {
    stressLevelEl.textContent = `${stressLevel}%`;
  }
}

/**
 * Render smart reminder
 */
function renderSmartReminder(usage) {
  const reminderTextEl = document.getElementById('reminderText');
  const reminderTimeEl = document.getElementById('reminderTime');

  // Calculate next break time (every 50 minutes of productive work)
  const productiveMinutes = (usage.productive || 0) / 60000;
  const minutesSinceBreak = productiveMinutes % 50;
  const minutesToBreak = Math.round(50 - minutesSinceBreak);

  if (reminderTextEl && reminderTimeEl) {
    if (minutesToBreak <= 5) {
      reminderTextEl.textContent = 'დროა 5-წუთიანი შესვენებისთვის! წყალი დალიე და გაიხარე 🌿';
      reminderTimeEl.textContent = `Break time now!`;
    } else {
      reminderTextEl.textContent = 'უახლოვდები შესვენების დროს. გააგრძელე ფოკუსირება! 💪';
      reminderTimeEl.textContent = `Next break in ${minutesToBreak} minutes`;
    }
  }
}

/**
 * Render top sites list
 */
function renderTopSites(usage) {
  const topSitesListEl = document.getElementById('topSitesList');
  if (!topSitesListEl) return;

  topSitesListEl.innerHTML = '';

  // Get all site entries
  const metaKeys = ['tabSwitches', 'typingKeystrokes', 'idleMs', 'samples', 'mediaEvents', 'productive', 'distracting', 'other'];
  const siteEntries = Object.entries(usage)
    .filter(([key, value]) => !metaKeys.includes(key) && typeof value === 'number' && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (siteEntries.length === 0) {
    topSitesListEl.innerHTML = `
      <div class="site-item">
        <div class="site-name">
          <span class="site-icon neutral">•</span>
          No activity yet
        </div>
        <span class="site-time">--</span>
      </div>
    `;
    return;
  }

  // Categorize sites (simple heuristic)
  const productiveSites = ['github.com', 'stackoverflow.com', 'docs.google.com', 'drive.google.com', 'notion.so', 'figma.com'];
  const distractingSites = ['youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 'reddit.com', 'tiktok.com'];

  siteEntries.forEach(([site, time]) => {
    let category = 'neutral';
    if (productiveSites.some(ps => site.includes(ps))) {
      category = 'productive';
    } else if (distractingSites.some(ds => site.includes(ds))) {
      category = 'distracting';
    }

    const icon = category === 'productive' ? '✓' : (category === 'distracting' ? '!' : '•');

    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    siteItem.innerHTML = `
      <div class="site-name">
        <span class="site-icon ${category}">${icon}</span>
        ${site}
      </div>
      <span class="site-time">${formatTimeShort(time)}</span>
    `;
    topSitesListEl.appendChild(siteItem);
  });
}

/**
 * Main render function - updates all UI elements
 */
function renderAll() {
  chrome.storage.local.get(['usage', 'emotionProfile'], (result) => {
    const usage = result.usage || {};
    const profile = result.emotionProfile;

    renderFocusStats(usage);
    renderAIInsights(profile);
    renderMoodAndStress(profile, usage);
    renderSmartReminder(usage);
    renderTopSites(usage);
  });
}

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Popup] Initializing new mockup UI...');

  // Initial render
  renderAll();

  // Dashboard button
  const dashboardBtn = document.getElementById('dashboard');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      console.log('[Popup] Opening dashboard...');
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    });
  }

  // Refresh Insight button (AI Report)
  const refreshInsightBtn = document.getElementById('refreshInsight');
  if (refreshInsightBtn) {
    refreshInsightBtn.addEventListener('click', () => {
      console.log('[Popup] Refresh Insight clicked');

      refreshInsightBtn.disabled = true;
      refreshInsightBtn.textContent = '⏳ Analyzing...';

      chrome.runtime.sendMessage({ type: 'recomputeProfile' }, (response) => {
        console.log('[Popup] Recompute response:', response);

        // Wait a bit for the profile to be saved
        setTimeout(() => {
          renderAll();
        }, 500);

        refreshInsightBtn.disabled = false;
        refreshInsightBtn.textContent = '✨ AI Report';
      });
    });
  }

  // Settings button
  const settingsBtn = document.getElementById('settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      console.log('[Popup] Opening settings...');
      chrome.runtime.openOptionsPage();
    });
  }

  // Clear/Goals button (repurposed as clear for now)
  const clearBtn = document.getElementById('clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      console.log('[Popup] Clear Data clicked');

      if (confirm('Clear all tracking data?')) {
        clearBtn.disabled = true;
        clearBtn.textContent = '🔄 Clearing...';

        chrome.runtime.sendMessage({ type: 'resetUsage' }, (response) => {
          console.log('[Popup] Reset response:', response);
          renderAll();
          clearBtn.disabled = false;
          clearBtn.textContent = '🎯 Goals';
        });
      }
    });
  }

  console.log('[Popup] All event listeners attached');
});
