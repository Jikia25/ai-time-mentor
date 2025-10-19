// background.js - COMPLETE VERSION (no external imports needed)

// ===== EMOTION TRACKER CODE (inline) =====
function msToMin(ms){ return Math.round(ms/60000); }
function clamp(v,a=0,b=1){ return Math.max(a, Math.min(b, v)); }

const SENTIMENT_LEXICON = {
  good:1, great:1, awesome:1, nice:1, love:1, happy:1, done:1, fixed:1, resolved:1,
  bad:-1, terrible:-1, hate:-1, stuck:-1, frustrat:-1, angry:-1, annoy:-1, fail:-1, issue:-1
};

function sentimentScore(text){
  if(!text||typeof text!=='string') return 0;
  const s = text.toLowerCase().replace(/[^\w\s]/g,' ');
  const tokens = s.split(/\s+/).filter(Boolean);
  if(tokens.length===0) return 0;
  let score = 0;
  tokens.forEach(t => {
    for(const key in SENTIMENT_LEXICON){
      if(t.startsWith(key)){ score += SENTIMENT_LEXICON[key]; break; }
    }
  });
  return score / Math.sqrt(tokens.length);
}

function analyzeAggregates(aggregates){
  aggregates = aggregates || {};
  const productiveMs = aggregates.productive || 0;
  const distractingMs = aggregates.distracting || 0;
  const otherMs = aggregates.other || 0;
  const tabSwitches = aggregates.tabSwitches || 0;
  const typing = aggregates.typingKeystrokes || 0;
  const idleMs = aggregates.idleMs || 0;
  const textSamples = Array.isArray(aggregates.samples) ? aggregates.samples : [];

  const totalActiveMs = productiveMs + distractingMs + otherMs;
  const activeMinutes = Math.max(totalActiveMs / 60000, 1);

  const focusScore = clamp(productiveMs / Math.max(totalActiveMs, 1));
  const switchRate = tabSwitches / activeMinutes;
  const typingIntensity = typing / activeMinutes;
  const idleRatio = clamp(idleMs / Math.max(idleMs + totalActiveMs, 1));
  const sentimentVals = textSamples.map(s => sentimentScore(s));
  const sentimentAvg = sentimentVals.length ? sentimentVals.reduce((a,b)=>a+b,0)/sentimentVals.length : 0;

  let stress = 0;
  stress += clamp((switchRate - 0.5) / 5);
  if(typingIntensity > 120) stress += 0.2;
  if(sentimentAvg < -0.2) stress += 0.25;
  if(idleRatio > 0.4) stress += 0.15;
  stress = clamp(stress);

  let mood = 'mixed';
  if(focusScore > 0.7 && stress < 0.2) mood = 'focused';
  else if(focusScore > 0.5 && stress < 0.4) mood = 'calm';
  else if(stress >= 0.6) mood = 'frustrated';
  else if(idleRatio > 0.5) mood = 'tired';
  else if(switchRate > 1.5) mood = 'restless';
  else mood = 'mixed';

  const focusPct = Math.round(focusScore * 100);
  let summary = `Focus: ${focusPct}% — mood: ${mood}.`;
  let insight = '', action = '';

  if (mood === 'frustrated') {
    insight = `High switching and negative tone detected (stress ${Math.round(stress*100)}%).`;
    action = `Take a 3-minute break. Then try a 25-min Pomodoro.`;
  } else if (mood === 'restless') {
    insight = `Frequent context switches (~${switchRate.toFixed(1)}/min).`;
    action = `Enable Focus Mode for 25 minutes and close distracting tabs.`;
  } else if (mood === 'tired') {
    insight = `High idle time suggests fatigue.`;
    action = `Take a longer break (10–20 min) and hydrate.`;
  } else if (mood === 'focused') {
    insight = `Steady productive time detected — good momentum.`;
    action = `Keep this rhythm: 25/5 Pomodoro.`;
  } else {
    if(sentimentAvg < -0.2){
      insight = `Text tone leans negative — possible frustration.`;
      action = `Write a 2-sentence summary of the blocker; ask a quick sync.`;
    } else if(focusPct < 40){
      insight = `Low focus detected (<40%).`;
      action = `Try a short 5-min break and then a 25-min focus session.`;
    } else {
      insight = `Mixed signals: moderate focus with occasional switches.`;
      action = `Schedule deep work into your peak hours.`;
    }
  }

  return {
    focusScore, focusPct,
    switchRate: parseFloat(switchRate.toFixed(2)),
    typingIntensity: Math.round(typingIntensity),
    idleRatio: parseFloat(idleRatio.toFixed(2)),
    sentimentAvg: parseFloat(sentimentAvg.toFixed(3)),
    stress: parseFloat(stress.toFixed(2)),
    mood, summary, insight, action
  };
}

console.log('[TM] Emotion tracker functions loaded inline - analyzeAggregates available:', typeof analyzeAggregates);

// ===== TRACKING LOGIC =====
const PRODUCTIVE_DOMAINS = ['github.com','stackoverflow.com','gitlab.com','docs.google.com','notion.so','jira','trello.com'];
const DISTRACTING_DOMAINS = ['youtube.com','facebook.com','twitter.com','instagram.com','tiktok.com','reddit.com'];

let current = null;

function domainFromUrl(url){
  try { return new URL(url).hostname.replace(/^www\./,''); } catch(e){ return ''; }
}
function classify(domain){
  if(!domain) return 'other';
  if(PRODUCTIVE_DOMAINS.some(d=>domain.includes(d))) return 'productive';
  if(DISTRACTING_DOMAINS.some(d=>domain.includes(d))) return 'distracting';
  return 'other';
}

async function saveDuration(category, ms){
  return new Promise((resolve) => {
    chrome.storage.local.get(['usage'], (res) => {
      const usage = res.usage || {};
      usage[category] = (usage[category] || 0) + ms;
      chrome.storage.local.set({ usage }, () => resolve());
    });
  });
}

async function startTracking(tabId, url){
  await stopCurrent();
  const domain = domainFromUrl(url);
  current = { tabId, url, domain, startTs: Date.now(), category: classify(domain) };
  console.log('[TM] startTracking', domain, current.category);
}

async function stopCurrent(reason = ''){
  if(!current) return;
  const now = Date.now();
  const duration = now - current.startTs;
  await saveDuration(current.category, duration);
  console.log('[TM] stopCurrent', current.domain, current.category, 'ms=', duration, 'reason=', reason);
  current = null;
  recomputeEmotionProfile();
}

function recomputeEmotionProfile(){
  chrome.storage.local.get(['usage','consentText'], (res) => {
    const usageRaw = res.usage || {};
    const hasCategoryKeys = (typeof usageRaw.productive === 'number') || (typeof usageRaw.distracting === 'number');

    const normalized = {
      productive: 0,
      distracting: 0,
      other: 0,
      tabSwitches: usageRaw.tabSwitches || 0,
      typingKeystrokes: usageRaw.typingKeystrokes || 0,
      idleMs: usageRaw.idleMs || 0,
      samples: Array.isArray(usageRaw.samples) ? usageRaw.samples.slice() : []
    };

    if(hasCategoryKeys){
      normalized.productive = usageRaw.productive || 0;
      normalized.distracting = usageRaw.distracting || 0;
      normalized.other = usageRaw.other || 0;
    } else {
      for(const key in usageRaw){
        if(!usageRaw.hasOwnProperty(key)) continue;
        if(['tabSwitches','typingKeystrokes','idleMs','samples','productive','distracting','other'].includes(key)) continue;
        const val = Number(usageRaw[key]) || 0;
        const k = String(key).toLowerCase();
        if (PRODUCTIVE_DOMAINS.some(d => k.includes(d))) normalized.productive += val;
        else if (DISTRACTING_DOMAINS.some(d => k.includes(d))) normalized.distracting += val;
        else normalized.other += val;
      }
    }

    if(!res.consentText) normalized.samples = [];

    try {
      const profile = analyzeAggregates(normalized);
      chrome.storage.local.set({ emotionProfile: profile }, () => {
        console.log('[TM] ✅ emotionProfile updated successfully:', profile);
      });
    } catch(e){
      console.error('[TM] ❌ analyzeAggregates error', e);
    }
  });
}

// Event listeners
chrome.tabs.onActivated.addListener(async (info) => {
  try { 
    const tab = await chrome.tabs.get(info.tabId); 
    if(tab && tab.url) await startTracking(tab.id, tab.url); 
  } catch(e){ console.warn('[TM] onActivated', e); }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if(changeInfo.status === 'complete' && tab.active && tab.url) {
    await startTracking(tabId, tab.url);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if(windowId === chrome.windows.WINDOW_ID_NONE){
    await stopCurrent('window-lost-focus');
  } else {
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId });
      if(tabs && tabs[0] && tabs[0].url) await startTracking(tabs[0].id, tabs[0].url);
    } catch(e){ console.warn('[TM] windows.onFocusChanged', e); }
  }
});

chrome.alarms.create('tm_heartbeat', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if(alarm.name === 'tm_heartbeat' && current){
    const chunk = 60 * 1000;
    await saveDuration(current.category, chunk);
    current.startTs = Date.now();
    console.log('[TM] heartbeat flush for', current.domain);
    recomputeEmotionProfile();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(!msg) return;

  if(msg.type === 'keystroke'){
    chrome.storage.local.get(['usage'], (res) => {
      const usage = res.usage || {};
      usage.typingKeystrokes = (usage.typingKeystrokes || 0) + 1;
      chrome.storage.local.set({ usage });
    });
  } else if(msg.type === 'tabSwitch'){
    chrome.storage.local.get(['usage'], (res) => {
      const usage = res.usage || {};
      usage.tabSwitches = (usage.tabSwitches || 0) + 1;
      chrome.storage.local.set({ usage });
    });
  } else if(msg.type === 'getAggregates'){
    chrome.storage.local.get(['usage','emotionProfile'], (res) => sendResponse(res));
    return true;
  } else if(msg.type === 'resetUsage'){
    chrome.storage.local.set({ usage: {}, emotionProfile: null }, () => sendResponse({ ok:true }));
    return true;
  } else if(msg.type === 'addSampleText' && typeof msg.text === 'string'){
    chrome.storage.local.get(['consentText','usage'], (res) => {
      if(!res.consentText) { sendResponse({ ok:false, reason:'no-consent' }); return; }
      const usage = res.usage || {};
      usage.samples = usage.samples || [];
      usage.samples.push(msg.text);
      if(usage.samples.length > 10) usage.samples.shift();
      chrome.storage.local.set({ usage }, () => { 
        recomputeEmotionProfile(); 
        sendResponse({ ok:true }); 
      });
    });
    return true;
  } else if(msg.type === 'recomputeProfile'){
    try {
      recomputeEmotionProfile();
      setTimeout(() => {
        chrome.storage.local.get(['emotionProfile'], (res) => {
          console.log('[TM] Sending profile to popup:', res.emotionProfile);
          sendResponse({ ok: true, profile: res.emotionProfile || null });
        });
      }, 500);
      return true;
    } catch(e){
      console.error('[TM] recomputeProfile error:', e);
      sendResponse({ ok:false, error: String(e) });
      return false;
    }
  }
});

if(chrome.idle && chrome.idle.setDetectionInterval){
  try { chrome.idle.setDetectionInterval(15); } catch(e){}
  chrome.idle.onStateChanged.addListener((state) => {
    if(state === 'idle' || state === 'locked'){
      chrome.storage.local.get(['usage'], (res) => {
        const usage = res.usage || {};
        usage.idleMs = (usage.idleMs || 0) + 15000;
        chrome.storage.local.set({ usage });
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TM] 🚀 Extension installed/updated');
  chrome.storage.local.get(['usage'], (res) => {
    if(!res.usage) {
      chrome.storage.local.set({ usage: {} }, () => {
        console.log('[TM] Initialized empty usage storage');
      });
    }
  });
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[TM] 🔄 Browser/extension started');
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if(tabs && tabs[0] && tabs[0].url) await startTracking(tabs[0].id, tabs[0].url);
  } catch(e){
    console.warn('[TM] startup tracking error', e);
  }
});