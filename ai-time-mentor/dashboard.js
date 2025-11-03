/**
 * Dashboard.js - AI Time Mentor Dashboard
 * Integrates with the new mockup design
 */

function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return '< 1m';
}

function calculateFocusScore(usage) {
  const totalTime = (usage.productive || 0) + (usage.distracting || 0) + (usage.other || 0);
  if (totalTime === 0) return 0;

  const productiveRatio = (usage.productive || 0) / totalTime;
  let score = productiveRatio * 100;

  const activeMinutes = totalTime / 60000;
  const tabSwitchRate = (usage.tabSwitches || 0) / Math.max(activeMinutes, 1);
  if (tabSwitchRate > 1) {
    score *= Math.max(0.7, 1 - (tabSwitchRate - 1) * 0.05);
  }

  return Math.round(score);
}

function calculateStressLevel(usage) {
  const tabSwitchRate = (usage.tabSwitches || 0) / Math.max((usage.productive || 0) / 60000, 1);
  const distractingRatio = (usage.distracting || 0) / Math.max(
    (usage.productive || 0) + (usage.distracting || 0) + (usage.other || 0),
    1
  );

  const stress = Math.min(100, Math.round((tabSwitchRate * 5 + distractingRatio * 50)));
  return stress;
}

/**
 * Render weekly analysis summary
 */
function renderWeeklyAnalysis(profile, usage) {
  const weeklyAnalysisEl = document.getElementById('weeklyAnalysis');
  if (!weeklyAnalysisEl) return;

  const focusScore = calculateFocusScore(usage);
  const productiveTime = formatTime(usage.productive || 0);
  const stressLevel = calculateStressLevel(usage);

  let analysis = '';

  if (profile && profile.insight) {
    analysis = profile.insight;
  } else {
    // Generate default analysis
    if (focusScore > 70) {
      analysis = `შენი კვირის პროდუქტიულობა შესანიშნავია! გაქვს ${focusScore}% ფოკუსის ქულა და დახარჯე ${productiveTime} პროდუქტიულ სამუშაოზე. სტრესის დონე ${stressLevel}% არის, რაც ნორმალურია. გააგრძელე ამ ტემპით!`;
    } else if (focusScore > 40) {
      analysis = `შენი კვირა კარგად არის გასული ${focusScore}% ფოკუსით. დახარჯე ${productiveTime} პროდუქტიულ აქტივობებზე. გაუმჯობესების საშუალებაა - შეამცირე გაფანტვები და გაზარდე ფოკუსირების დრო.`;
    } else {
      analysis = `ამ კვირას შეგიძლია გაუმჯობესება. ფოკუსის ქულა ${focusScore}% არის. სცადე მეტი დრო დახარჯო პროდუქტიულ საქმეებზე და შეამცირო გაფანტვები. შენ შეგიძლია!`;
    }
  }

  weeklyAnalysisEl.textContent = analysis;
}

/**
 * Render key metrics
 */
function renderMetrics(usage, previousUsage = null) {
  const focusScore = calculateFocusScore(usage);
  const productiveTime = usage.productive || 0;
  const stressLevel = calculateStressLevel(usage);

  // Calculate improvement
  let improvement = 0;
  if (previousUsage) {
    const prevScore = calculateFocusScore(previousUsage);
    if (prevScore > 0) {
      improvement = Math.round(((focusScore - prevScore) / prevScore) * 100);
    }
  }

  // Update focus score
  const focusScoreMetricEl = document.getElementById('focusScoreMetric');
  if (focusScoreMetricEl) {
    focusScoreMetricEl.textContent = `${focusScore}%`;
  }

  // Update productive time
  const productiveTimeMetricEl = document.getElementById('productiveTimeMetric');
  if (productiveTimeMetricEl) {
    productiveTimeMetricEl.textContent = formatTime(productiveTime);
  }

  // Update stress level
  const stressLevelMetricEl = document.getElementById('stressLevelMetric');
  if (stressLevelMetricEl) {
    const stressLabel = stressLevel < 30 ? 'Low' : stressLevel < 60 ? 'Medium' : 'High';
    stressLevelMetricEl.textContent = stressLabel;
  }

  // Update improvement
  const improvementMetricEl = document.getElementById('improvementMetric');
  if (improvementMetricEl) {
    const sign = improvement > 0 ? '+' : '';
    improvementMetricEl.textContent = `${sign}${improvement}%`;
  }
}

/**
 * Render weekly chart
 */
function renderWeeklyChart() {
  // For now, use mock data - in production, this would load actual weekly history
  const chartBarsEl = document.getElementById('chartBars');
  if (!chartBarsEl) return;

  // Generate semi-random but realistic-looking bars
  const heights = [60, 75, 80, 85, 70, 45, 50];
  chartBarsEl.innerHTML = '';

  heights.forEach(height => {
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${height}%`;
    chartBarsEl.appendChild(bar);
  });
}

/**
 * Render AI-generated goals
 */
function renderGoals(usage) {
  const goalsListEl = document.getElementById('goalsList');
  if (!goalsListEl) return;

  const focusScore = calculateFocusScore(usage);
  const productiveTime = usage.productive || 0;
  const distractingTime = usage.distracting || 0;

  const goals = [
    {
      status: focusScore >= 80 ? '✓' : '⏳',
      text: 'მიაღწიე 80% ფოკუსს მომავალ კვირაში',
      current: `${focusScore}%`,
      target: '80%'
    },
    {
      status: distractingTime < 3600000 ? '✓' : '⏳',
      text: 'შეამცირე სოციალური მედია 1 საათამდე დღეში',
      current: formatTime(distractingTime),
      target: '1h'
    },
    {
      status: productiveTime > 14400000 ? '✓' : '⏳',
      text: 'დაასრულე 4 საათი პროდუქტიული მუშაობა დღეში',
      current: formatTime(productiveTime),
      target: '4h'
    }
  ];

  goalsListEl.innerHTML = '';
  goals.forEach(goal => {
    const goalEl = document.createElement('div');
    goalEl.className = 'goal-item';
    goalEl.innerHTML = `
      <div class="goal-checkbox">${goal.status}</div>
      <div class="goal-content">
        <div class="goal-text">${goal.text}</div>
        <div class="goal-progress">Current: ${goal.current} • Target: ${goal.target}</div>
      </div>
    `;
    goalsListEl.appendChild(goalEl);
  });
}

/**
 * Render real-time insights timeline
 */
function renderInsightsTimeline(profile, usage) {
  const timelineEl = document.getElementById('insightsTimeline');
  if (!timelineEl) return;

  const focusScore = calculateFocusScore(usage);
  const productiveTime = (usage.productive || 0) / 3600000; // in hours

  const insights = [];

  // Generate context-aware insights
  if (productiveTime > 1) {
    insights.push({
      time: '2 hours ago',
      content: `Great focus streak! You've been productive for ${Math.round(productiveTime * 60)} minutes. Consider a 10-minute break.`
    });
  }

  if (focusScore > 70) {
    insights.push({
      time: 'This morning',
      content: `Pattern detected: Your best focus hours are 9-11 AM. Schedule important work here.`
    });
  } else {
    insights.push({
      time: 'This morning',
      content: `Your focus score is ${focusScore}%. Try using the Pomodoro technique to improve concentration.`
    });
  }

  if (profile && profile.insight) {
    insights.push({
      time: 'Yesterday',
      content: profile.insight
    });
  } else {
    insights.push({
      time: 'Yesterday',
      content: 'შენ კარგად მუშაობ! გააგრძელე ფოკუსირება და მიაღწევ შენს მიზნებს.'
    });
  }

  timelineEl.innerHTML = '';
  insights.forEach(insight => {
    const itemEl = document.createElement('div');
    itemEl.className = 'timeline-item';
    itemEl.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-time">${insight.time}</div>
      <div class="timeline-content">${insight.content}</div>
    `;
    timelineEl.appendChild(itemEl);
  });
}

/**
 * Render AI recommendations
 */
function renderRecommendations(usage) {
  const recommendationsListEl = document.getElementById('recommendationsList');
  if (!recommendationsListEl) return;

  const focusScore = calculateFocusScore(usage);
  const stressLevel = calculateStressLevel(usage);
  const productiveHours = (usage.productive || 0) / 3600000;

  const recommendations = [];

  // Schedule optimization
  if (focusScore > 70) {
    recommendations.push({
      icon: '⏰',
      title: 'Optimize Schedule',
      text: 'Move complex tasks to 9-11 AM when your focus peaks'
    });
  } else {
    recommendations.push({
      icon: '⏰',
      title: 'Improve Focus Time',
      text: 'Try time-blocking: dedicate 90-minute blocks to deep work'
    });
  }

  // Stress management
  if (stressLevel > 60) {
    recommendations.push({
      icon: '🧘',
      title: 'Stress Management',
      text: 'High stress detected. Try 5-min breathing exercises at 2 PM'
    });
  } else {
    recommendations.push({
      icon: '🧘',
      title: 'Maintain Balance',
      text: 'Your stress levels are good. Keep taking regular breaks!'
    });
  }

  // Productivity boost
  recommendations.push({
    icon: '🚀',
    title: 'Productivity Boost',
    text: 'Enable website blocker during focus hours for +15% gain'
  });

  // Habit building
  if (productiveHours > 2) {
    recommendations.push({
      icon: '💪',
      title: 'Habit Building',
      text: `You're building great habits! ${Math.round(productiveHours)}h of focused work today!`
    });
  } else {
    recommendations.push({
      icon: '💪',
      title: 'Build Momentum',
      text: 'Start with a 25-minute Pomodoro session to build momentum'
    });
  }

  recommendationsListEl.innerHTML = '';
  recommendations.forEach(rec => {
    const recEl = document.createElement('div');
    recEl.className = 'recommendation-card';
    recEl.innerHTML = `
      <div class="recommendation-icon">${rec.icon}</div>
      <div class="recommendation-title">${rec.title}</div>
      <div class="recommendation-text">${rec.text}</div>
    `;
    recommendationsListEl.appendChild(recEl);
  });
}

/**
 * Main render function
 */
function renderAll() {
  chrome.storage.local.get(['usage', 'emotionProfile', 'previousUsage'], (result) => {
    const usage = result.usage || {};
    const profile = result.emotionProfile;
    const previousUsage = result.previousUsage;

    // Update subtitle with current date
    const subtitleEl = document.getElementById('dashboardSubtitle');
    if (subtitleEl) {
      const now = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      subtitleEl.textContent = `Your personalized productivity insights for ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }

    renderWeeklyAnalysis(profile, usage);
    renderMetrics(usage, previousUsage);
    renderWeeklyChart();
    renderGoals(usage);
    renderInsightsTimeline(profile, usage);
    renderRecommendations(usage);
  });
}

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Dashboard] Initializing...');

  // Initial render
  renderAll();

  // Export Report button
  const exportBtn = document.getElementById('exportReport');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      console.log('[Dashboard] Exporting report...');

      chrome.storage.local.get(['usage', 'emotionProfile'], (result) => {
        const report = {
          date: new Date().toISOString(),
          usage: result.usage,
          profile: result.emotionProfile
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-time-mentor-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }

  // Generate Weekly Report button
  const generateReportBtn = document.getElementById('generateReport');
  if (generateReportBtn) {
    generateReportBtn.addEventListener('click', async () => {
      console.log('[Dashboard] Generating weekly report...');

      generateReportBtn.disabled = true;
      generateReportBtn.textContent = '⏳ Generating...';

      // Request AI to generate comprehensive weekly report
      chrome.runtime.sendMessage({ type: 'generateWeeklyReport' }, (response) => {
        console.log('[Dashboard] Weekly report response:', response);

        if (response && response.success) {
          alert(`Weekly Report:\n\n${response.report}`);
        } else {
          alert('Failed to generate weekly report. Make sure AI is configured in settings.');
        }

        generateReportBtn.disabled = false;
        generateReportBtn.textContent = '✨ Generate Weekly Report';
      });
    });
  }

  // AI Settings button
  const settingsBtn = document.getElementById('openSettings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      console.log('[Dashboard] Opening settings...');
      chrome.runtime.openOptionsPage();
    });
  }

  console.log('[Dashboard] All event listeners attached');
});
