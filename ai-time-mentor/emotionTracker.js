// emotionTracker.js
// Simple heuristic emotion & focus tracker for AI Time Mentor (MVP).

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

// expose for importScripts context
this.analyzeAggregates = analyzeAggregates;
