// popup.js - Improved version matching dashboard functionality

function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function renderUsage() {
  chrome.storage.local.get(["usage"], (result) => {
    console.log('[Popup] renderUsage - data received:', result);
    const usage = result.usage || {};
    const container = document.getElementById("usage");
    
    if (!container) {
      console.error('[Popup] #usage container not found!');
      return;
    }
    
    container.innerHTML = "";

    // Metadata keys to exclude
    const metaKeys = ['tabSwitches', 'typingKeystrokes', 'idleMs', 'samples'];
    
    // Check if we have category-based tracking
    const hasCategories = typeof usage.productive === 'number' || 
                          typeof usage.distracting === 'number' || 
                          typeof usage.other === 'number';

    if (hasCategories) {
      // Category-based display
      const categories = [
        { name: '✅ Productive', value: usage.productive || 0 },
        { name: '⚠️ Distracting', value: usage.distracting || 0 },
        { name: '📄 Other', value: usage.other || 0 }
      ].filter(c => c.value > 0);

      if (categories.length === 0) {
        container.innerHTML = '<div class="empty">No tracked activity yet. Start browsing!</div>';
        return;
      }

      // Sort by time descending
      categories.sort((a, b) => b.value - a.value);

      categories.forEach(cat => {
        const div = document.createElement("div");
        div.className = "site";
        div.textContent = `${cat.name} — ${formatTime(cat.value)}`;
        container.appendChild(div);
      });
    } else {
      // Domain-based display (fallback)
      const entries = Object.entries(usage).filter(([k, v]) => {
        return typeof v === 'number' && v > 0 && 
               !metaKeys.includes(k) && 
               !['productive', 'distracting', 'other'].includes(k);
      });

      if (entries.length === 0) {
        container.innerHTML = '<div class="empty">No tracked domains yet. Start browsing!</div>';
        return;
      }

      // Sort by time descending
      const sorted = entries.sort((a, b) => b[1] - a[1]);
      
      // Show top 5 domains in popup
      sorted.slice(0, 5).forEach(([domain, time]) => {
        const div = document.createElement("div");
        div.className = "site";
        div.textContent = `${domain} — ${formatTime(time)}`;
        container.appendChild(div);
      });

      // Show "View Dashboard" hint if more domains
      if (sorted.length > 5) {
        const moreDiv = document.createElement("div");
        moreDiv.className = "site more-hint";
        moreDiv.textContent = `+ ${sorted.length - 5} more (view dashboard)`;
        moreDiv.style.color = '#718093';
        moreDiv.style.fontStyle = 'italic';
        container.appendChild(moreDiv);
      }
    }

    // Add activity summary
    const totalActive = (usage.productive || 0) + (usage.distracting || 0) + (usage.other || 0);
    if (totalActive > 0) {
      const summaryDiv = document.createElement("div");
      summaryDiv.className = "usage-summary";
      summaryDiv.innerHTML = `
        <div class="summary-line">Total: ${formatTime(totalActive)}</div>
        <div class="summary-line">Switches: ${usage.tabSwitches || 0} | Keys: ${usage.typingKeystrokes || 0}</div>
      `;
      container.appendChild(summaryDiv);
    }
  });
}

function renderEmotionFromProfile(p) {
  const sumEl = document.getElementById('emotion-summary');
  const insightEl = document.getElementById('emotion-insight');
  const actionEl = document.getElementById('emotion-action');

  if (!sumEl || !insightEl || !actionEl) {
    console.error('[Popup] Emotion elements not found!');
    return;
  }

  if (!p) {
    sumEl.textContent = 'No insight yet — browse a bit to collect data.';
    insightEl.textContent = '';
    actionEl.textContent = '';
    return;
  }

  console.log('[Popup] Rendering emotion profile:', p);
  
  // Format summary with emoji
  const moodEmoji = getMoodEmoji(p.mood);
  sumEl.textContent = `${moodEmoji} ${p.summary || 'Processing...'}`;
  sumEl.style.fontWeight = '500';
  
  insightEl.textContent = `💡 ${p.insight || ''}`;
  actionEl.textContent = `🎯 ${p.action || ''}`;
}

function getMoodEmoji(mood) {
  const emojis = {
    'focused': '🎯',
    'calm': '😌',
    'frustrated': '😤',
    'tired': '😴',
    'restless': '😰',
    'mixed': '🤔'
  };
  return emojis[mood] || '🤔';
}

function renderEmotion() {
  chrome.storage.local.get(['emotionProfile'], (res) => {
    console.log('[Popup] renderEmotion - profile:', res.emotionProfile);
    renderEmotionFromProfile(res.emotionProfile);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Popup] Initializing...');

  // Initial render
  renderUsage();
  renderEmotion();

  // Clear Data button
  const clearBtn = document.getElementById("clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      console.log('[Popup] Clear Data clicked');
      
      if (confirm('Clear all tracking data?')) {
        clearBtn.disabled = true;
        clearBtn.textContent = 'Clearing...';

        chrome.runtime.sendMessage({ type: 'resetUsage' }, (res) => {
          console.log('[Popup] Reset response:', res);
          renderUsage();
          renderEmotion();
          clearBtn.disabled = false;
          clearBtn.textContent = 'Clear Data';
        });
      }
    });
  }

  // Refresh Insight button
  const refreshBtn = document.getElementById("refreshInsight");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      console.log('[Popup] Refresh Insight clicked');
      const prevText = refreshBtn.textContent;
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing...';

      chrome.runtime.sendMessage({ type: 'recomputeProfile' }, (resp) => {
        console.log('[Popup] Recompute response:', resp);
        
        if (resp && resp.ok && resp.profile) {
          renderEmotionFromProfile(resp.profile);
        } else {
          // Fallback: re-fetch from storage
          setTimeout(() => {
            renderEmotion();
          }, 500);
        }
        
        // Also refresh usage to show latest data
        renderUsage();
        
        refreshBtn.disabled = false;
        refreshBtn.textContent = prevText;
      });
    });
  }

  // Dashboard button
  const dashboardBtn = document.getElementById("dashboard");
  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", () => {
      console.log('[Popup] Opening dashboard...');
      chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    });
  }

  console.log('[Popup] All event listeners attached');
});