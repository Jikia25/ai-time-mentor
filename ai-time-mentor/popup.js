// popup.js - Updated for new visual design

function formatTime(ms) {
  if (!ms || ms < 0) return '0m';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 5) return `${minutes}m`;
  return `${minutes}m`;
}

function getMoodEmoji(mood) {
  const emojis = {
    focused: '🎯',
    calm: '😌',
    frustrated: '😤',
    tired: '😴',
    restless: '😰',
    mixed: '🤔',
    stressed: '😓'
  };
  return emojis[mood] || '🎯';
}

function getCategoryIcon(category) {
  if (category.includes('productive')) return 'productive';
  if (category.includes('distracting')) return 'distracting';
  return 'neutral';
}

function loadData() {
  chrome.storage.local.get(['usage', 'emotionProfile', 'profileSource'], (result) => {
    const usage = result.usage || {};
    const profile = result.emotionProfile;

    // Calculate totals
    const productiveMs = usage.productive || 0;
    const distractingMs = usage.distracting || 0;
    const otherMs = usage.other || 0;
    const totalMs = productiveMs + distractingMs + otherMs;

    // Calculate focus score
    let focusScore = 0;
    if (totalMs > 0) {
      focusScore = Math.round((productiveMs / totalMs) * 100);
    }

    // Update Focus Score
    const focusScoreEl = document.getElementById('focusScore');
    const progressFillEl = document.getElementById('progressFill');
    if (focusScoreEl && progressFillEl) {
      focusScoreEl.textContent = totalMs > 0 ? `${focusScore}%` : '--';
      progressFillEl.style.width = `${focusScore}%`;
    }

    // Update Stats
    document.getElementById('productiveTime').textContent = formatTime(productiveMs);
    document.getElementById('distractingTime').textContent = formatTime(distractingMs);
    document.getElementById('tabSwitches').textContent = usage.tabSwitches || 0;

    // Update AI Insights
    if (profile) {
      const insightText = document.getElementById('insightText');
      const actionSuggestion = document.getElementById('actionSuggestion');

      if (insightText) {
        insightText.textContent = profile.insight || 'მიმდინარეობს ანალიზი...';
      }

      if (actionSuggestion) {
        actionSuggestion.innerHTML = `<strong>💡 რჩევა:</strong> ${profile.action || 'გააგრძელე კარგი მუშაობა!'}`;
      }

      // Update Mood
      const moodEmoji = document.getElementById('moodEmoji');
      const moodValue = document.getElementById('moodValue');
      if (moodEmoji && moodValue && profile.mood) {
        moodEmoji.textContent = getMoodEmoji(profile.mood);
        moodValue.textContent = profile.mood.charAt(0).toUpperCase() + profile.mood.slice(1);
      }

      // Update Stress
      const stressValue = document.getElementById('stressValue');
      if (stressValue) {
        const stressPercent = profile.stress ? Math.round(profile.stress * 100) : 0;
        stressValue.textContent = `${stressPercent}%`;
      }
    }

    // Update Top Sites
    renderTopSites(usage);
  });
}

function renderTopSites(usage) {
  const container = document.getElementById('topSites');
  if (!container) return;

  const metaKeys = ['tabSwitches', 'typingKeystrokes', 'idleMs', 'samples', 'mediaEvents',
                    'productive', 'distracting', 'other', 'mediaPlays', 'mediaPlayMs'];

  const entries = Object.entries(usage).filter(([k, v]) => {
    return typeof v === 'number' && v > 0 && !metaKeys.includes(k);
  });

  if (entries.length === 0) {
    container.innerHTML = '<div class="empty">Browse websites to see activity</div>';
    return;
  }

  // Sort by time and get top 4
  const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 4);

  container.innerHTML = '';
  sorted.forEach(([domain, time]) => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';

    // Determine category (simplified)
    const iconClass = domain.includes('github') || domain.includes('docs.google') ?
                      'productive' : (domain.includes('youtube') ? 'distracting' : 'neutral');

    const iconText = iconClass === 'productive' ? '✓' : (iconClass === 'distracting' ? '!' : '•');

    siteItem.innerHTML = `
      <div class="site-name">
        <span class="site-icon ${iconClass}">${iconText}</span>
        ${domain}
      </div>
      <span class="site-time">${formatTime(time)}</span>
    `;
    container.appendChild(siteItem);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Popup] Initializing new design...');

  // Load initial data
  loadData();

  // Refresh button
  const refreshBtn = document.getElementById('refreshInsight');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      console.log('[Popup] Refresh Insight clicked');
      const prevText = refreshBtn.innerHTML;
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '⏳ Loading...';

      chrome.runtime.sendMessage({ type: 'recomputeProfile' }, (resp) => {
        console.log('[Popup] Recompute response:', resp);

        setTimeout(() => {
          loadData();
          refreshBtn.disabled = false;
          refreshBtn.innerHTML = prevText;
        }, 500);
      });
    });
  }

  // Dashboard button
  const dashboardBtn = document.getElementById('dashboard');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      console.log('[Popup] Opening dashboard...');
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    });
  }

  // Settings button
  const settingsBtn = document.getElementById('settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      console.log('[Popup] Opening AI settings...');
      chrome.runtime.openOptionsPage();
    });
  }

  // Clear button
  const clearBtn = document.getElementById('clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      console.log('[Popup] Clear Data clicked');

      if (confirm('Clear all tracking data?')) {
        clearBtn.disabled = true;
        const prevText = clearBtn.innerHTML;
        clearBtn.innerHTML = '⏳ Clearing...';

        chrome.runtime.sendMessage({ type: 'resetUsage' }, (res) => {
          console.log('[Popup] Reset response:', res);
          loadData();
          clearBtn.disabled = false;
          clearBtn.innerHTML = prevText;
        });
      }
    });
  }

  console.log('[Popup] All event listeners attached');
});
