// dashboard.js - Updated for new visual design

const aiService = new AIService();

function formatTime(ms) {
  if (!ms || ms < 0) return '0m';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getMoodEmoji(mood) {
  const emojis = {
    focused: '🎯',
    calm: '😌',
    frustrated: '😤',
    tired: '😴',
    restless: '😰',
    mixed: '🤔'
  };
  return emojis[mood] || '🤔';
}

// Load and display dashboard data
async function loadDashboard() {
  try {
    const result = await chrome.storage.local.get(['usage', 'emotionProfile', 'aiConfig']);
    const usage = result.usage || {};
    const profile = result.emotionProfile;
    const aiConfig = result.aiConfig || {};

    // Update subtitle
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('dashboardSubtitle').textContent =
      `Your personalized productivity insights for ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // Calculate metrics
    const productiveMs = usage.productive || 0;
    const distractingMs = usage.distracting || 0;
    const otherMs = usage.other || 0;
    const totalMs = productiveMs + distractingMs + otherMs;

    let focusScore = 0;
    if (totalMs > 0) {
      focusScore = Math.round((productiveMs / totalMs) * 100);
    }

    // Update metrics
    document.getElementById('focusScoreMetric').textContent = totalMs > 0 ? `${focusScore}%` : '--';
    document.getElementById('productiveTimeMetric').textContent = formatTime(productiveMs);

    const stressLevel = profile && profile.stress ? Math.round(profile.stress * 100) : 0;
    let stressLabel = 'Low';
    if (stressLevel > 70) stressLabel = 'High';
    else if (stressLevel > 40) stressLabel = 'Medium';
    document.getElementById('stressLevelMetric').textContent = stressLabel;
    document.getElementById('improvementMetric').textContent = '--';

    // Update AI analysis text
    if (profile && profile.insight) {
      const analysisText = `
        <strong>კვირის ანალიზი:</strong> ${profile.insight} ${profile.action ? `<br><br>${profile.action}` : ''}
      `;
      document.getElementById('weeklyAnalysis').innerHTML = analysisText;
    } else {
      document.getElementById('weeklyAnalysis').innerHTML = `
        <div class="loading">დაიწყეთ browsing რომ AI მოგცეთ personalized insights!</div>
      `;
    }

    // Check if AI is configured
    if (aiConfig.enabled && aiConfig.apiKey) {
      console.log('[Dashboard] AI is configured');
    } else {
      console.log('[Dashboard] AI not configured');
    }
  } catch (error) {
    console.error('[Dashboard] Error loading data:', error);
  }
}

// Generate Goals
async function generateGoals() {
  const btn = document.getElementById('generateGoals');
  const goalsList = document.getElementById('goalsList');

  try {
    btn.disabled = true;
    btn.innerHTML = '⏳ Generating...';
    goalsList.innerHTML = '<div class="loading">AI is analyzing your patterns...</div>';

    const result = await chrome.storage.local.get(['usage']);
    const usage = result.usage || {};

    // Calculate focus and stress for AI
    const productiveMs = usage.productive || 0;
    const distractingMs = usage.distracting || 0;
    const totalMs = productiveMs + distractingMs;
    const focusPct = totalMs > 0 ? Math.round((productiveMs / totalMs) * 100) : 0;

    const data = {
      focusPct: focusPct,
      productive: productiveMs,
      distracting: distractingMs,
      stress: 0.3
    };

    const goals = await aiService.generateGoals(data);

    if (goals && goals.length > 0) {
      goalsList.innerHTML = '';
      goals.forEach((goal, index) => {
        const statusIcon = index === 0 ? '✓' : '⏳';
        const goalItem = document.createElement('div');
        goalItem.className = 'goal-item';
        goalItem.innerHTML = `
          <div class="goal-checkbox">${statusIcon}</div>
          <div class="goal-content">
            <div class="goal-text">${goal.goal}</div>
            <div class="goal-progress">Current: ${goal.current} • Target: ${goal.target} • ${goal.timeframe}</div>
          </div>
        `;
        goalsList.appendChild(goalItem);
      });
    } else {
      goalsList.innerHTML = '<div class="loading">Could not generate goals. Please configure AI settings.</div>';
    }
  } catch (error) {
    console.error('[Dashboard] Error generating goals:', error);
    goalsList.innerHTML = `<div class="loading">Error: ${error.message}<br>Please check AI settings.</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🎯 Generate Goals';
  }
}

// Generate Weekly Report
async function generateWeeklyReport() {
  const btn = document.getElementById('generateReport');
  const analysisEl = document.getElementById('weeklyAnalysis');

  try {
    btn.disabled = true;
    btn.innerHTML = '⏳ Generating...';
    analysisEl.innerHTML = '<div class="loading">AI is creating your weekly report...</div>';

    const result = await chrome.storage.local.get(['usage']);
    const usage = result.usage || {};

    const weeklyData = {
      totalTime: (usage.productive || 0) + (usage.distracting || 0) + (usage.other || 0),
      productiveTime: usage.productive || 0,
      distractingTime: usage.distracting || 0,
      tabSwitches: usage.tabSwitches || 0,
      days: []
    };

    const report = await aiService.generateWeeklyReport(weeklyData);

    if (report) {
      analysisEl.innerHTML = `<strong>AI-Generated Report:</strong><br><br>${report.replace(/\n/g, '<br>')}`;
    } else {
      analysisEl.innerHTML = '<div class="loading">Could not generate report. Please configure AI settings.</div>';
    }
  } catch (error) {
    console.error('[Dashboard] Error generating report:', error);
    analysisEl.innerHTML = `<div class="loading">Error: ${error.message}<br>Please check AI settings.</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✨ Generate Weekly Report';
  }
}

// Export report
function exportReport() {
  chrome.storage.local.get(['usage', 'emotionProfile'], (result) => {
    const data = {
      usage: result.usage || {},
      profile: result.emotionProfile || {},
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-time-mentor-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  });
}

// Refresh dashboard
function refreshDashboard() {
  const btn = document.getElementById('refresh');
  btn.disabled = true;
  const prevText = btn.innerHTML;
  btn.innerHTML = '⏳ Refreshing...';

  // Request profile recompute
  chrome.runtime.sendMessage({ type: 'recomputeProfile' }, () => {
    setTimeout(() => {
      loadDashboard();
      btn.disabled = false;
      btn.innerHTML = prevText;
    }, 1000);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Dashboard] Initializing...');

  // Load initial data
  loadDashboard();

  // Event listeners
  document.getElementById('generateGoals').addEventListener('click', generateGoals);
  document.getElementById('generateReport').addEventListener('click', generateWeeklyReport);
  document.getElementById('exportReport').addEventListener('click', exportReport);
  document.getElementById('refresh').addEventListener('click', refreshDashboard);

  document.getElementById('openSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  console.log('[Dashboard] Initialization complete');
});
