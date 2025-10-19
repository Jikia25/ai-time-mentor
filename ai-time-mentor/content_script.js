// content_script.js (paste as-is)
(function () {
  let keystrokeCountSinceFlush = 0;
  const KEY_THROTTLE_MS = 1500;
  const FLUSH_INTERVAL_MS = 5000;
  let lastKeystrokeSent = 0;
  let lastFlush = Date.now();

  function isEditable(target) {
    if (!target) return false;
    const tag = (target && target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (target && target.isContentEditable) return true;
    return false;
  }

  function sendKeystrokeIncrement() {
    chrome.runtime.sendMessage({ type: 'keystroke' });
  }
  function sendTabSwitch() {
    chrome.runtime.sendMessage({ type: 'tabSwitch' });
  }

  function periodicFlush() {
    const now = Date.now();
    if (now - lastFlush < FLUSH_INTERVAL_MS) return;
    for (let i = 0; i < keystrokeCountSinceFlush; i++) sendKeystrokeIncrement();
    keystrokeCountSinceFlush = 0;
    lastFlush = now;
  }

  document.addEventListener('keydown', (e) => {
    try {
      const target = e.target || e.srcElement;
      if (isEditable(target)) {
        const now = Date.now();
        if (now - lastKeystrokeSent > KEY_THROTTLE_MS) {
          sendKeystrokeIncrement();
          lastKeystrokeSent = now;
        } else {
          keystrokeCountSinceFlush++;
        }
      }

      if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';
        if (text && text.length > 0) {
          const maxLen = 800;
          const sample = text.length > maxLen ? text.slice(0, maxLen) : text;
          chrome.runtime.sendMessage({ type: 'addSampleText', text: sample }, ()=>{});
        }
      }
    } catch (err) { console.warn('[TM content_script] keydown error', err); }
  }, true);

  document.addEventListener('visibilitychange', () => {
    try { if (document.visibilityState === 'hidden') sendTabSwitch(); } catch(e){}
  });

  setInterval(() => { periodicFlush(); }, FLUSH_INTERVAL_MS);

  window.addEventListener('beforeunload', () => { try { periodicFlush(); } catch(e){} });
})();
