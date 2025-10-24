// content_script.js - SIMPLE VERSION
(function() {
  // Chrome API შემოწმება
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('[TM] Chrome runtime API not available');
    return;
  }

  // Keystroke throttling
  let lastKeystrokeTime = 0;
  const KEYSTROKE_THROTTLE = 2000; // 2 წამში ერთხელ მაქსიმუმ

  document.addEventListener('keydown', (e) => {
    const now = Date.now();
    // მხოლოდ editable ელემენტებში
    const target = e.target;
    const isEditable = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable;
    
    if (isEditable && now - lastKeystrokeTime > KEYSTROKE_THROTTLE) {
      lastKeystrokeTime = now;
      try {
        chrome.runtime.sendMessage({ type: 'keystroke' });
      } catch(err) {
        // Silent fail
      }
    }
  });

  // Tab switch detection - both directions
  let wasHidden = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !wasHidden) {
      wasHidden = true;
      // Tab დამალულია
    } else if (!document.hidden && wasHidden) {
      wasHidden = false;
      // Tab ისევ აქტიურია - ახლა გავგზავნოთ
      try {
        chrome.runtime.sendMessage({ type: 'tabSwitch' });
      } catch(err) {
        // Silent fail
      }
    }
  });

  // Optional: Text sampling (მხოლოდ თუ გჭირდებათ)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      const selection = window.getSelection().toString().trim();
      if (selection && selection.length > 10) {
        try {
          chrome.runtime.sendMessage({ 
            type: 'addSampleText', 
            text: selection.slice(0, 200) // მაქს 200 სიმბოლო
          });
        } catch(err) {
          // Silent fail
        }
      }
    }
  });

  console.log('[TM] Content script loaded successfully');
})();