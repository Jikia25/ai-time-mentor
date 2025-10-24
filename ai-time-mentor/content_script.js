// content_script.js - tracks keystrokes, visibility, and media playback (video/audio)
(function () {
  // Chrome API check
  if (typeof chrome === "undefined" || !chrome.runtime) {
    console.error("[TM] Chrome runtime API not available");
    return;
  }

  // Keystroke throttling (existing)
  let lastKeystrokeTime = 0;
  const KEYSTROKE_THROTTLE = 2000; // 2s

  document.addEventListener("keydown", (e) => {
    const now = Date.now();
    const target = e.target;
    const isEditable =
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    if (isEditable && now - lastKeystrokeTime > KEYSTROKE_THROTTLE) {
      lastKeystrokeTime = now;
      try {
        chrome.runtime.sendMessage({ type: "keystroke" });
      } catch (err) {}
    }
  });

  // Tab switch detection
  let wasHidden = false;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !wasHidden) {
      wasHidden = true;
    } else if (!document.hidden && wasHidden) {
      wasHidden = false;
      try {
        chrome.runtime.sendMessage({ type: "tabSwitch" });
      } catch (err) {}
    }
  });

  // Optional: text sampling with Ctrl+Shift+S
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "S") {
      e.preventDefault();
      const selection = window.getSelection().toString().trim();
      if (selection && selection.length > 10) {
        try {
          chrome.runtime.sendMessage({
            type: "addSampleText",
            text: selection.slice(0, 200),
          });
        } catch (err) {}
      }
    }
  });

  // ---------------- MEDIA PLAYBACK TRACKING ----------------
  const mediaMap = new WeakMap();

  function handlePlay(e) {
    try {
      const el = e.target;
      if (!el || !(el instanceof HTMLMediaElement)) return;
      mediaMap.set(el, Date.now());
    } catch (err) {}
  }

  function handlePauseOrEnded(e) {
    try {
      const el = e.target;
      if (!el || !(el instanceof HTMLMediaElement)) return;
      const start = mediaMap.get(el) || 0;
      if (!start) return;
      const now = Date.now();
      const delta = now - start;
      mediaMap.delete(el);

      try {
        chrome.runtime.sendMessage(
          { type: "mediaPlayback", ms: delta },
          () => {}
        );
      } catch (err) {}
    } catch (err) {}
  }

  function attachToMedia(el) {
    if (!(el instanceof HTMLMediaElement)) return;
    if (el.dataset.tmBound === "1") return;
    el.addEventListener("play", handlePlay, true);
    el.addEventListener("pause", handlePauseOrEnded, true);
    el.addEventListener("ended", handlePauseOrEnded, true);
    el.dataset.tmBound = "1";
  }

  function scanAndAttach() {
    try {
      const medias = document.querySelectorAll("video, audio");
      medias.forEach((m) => attachToMedia(m));
    } catch (e) {}
  }

  scanAndAttach();

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        scanAndAttach();
        break;
      }
    }
  });
  try {
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  } catch (e) {}

  // beforeunload: flush any playing durations
  window.addEventListener("beforeunload", () => {
    try {
      const now = Date.now();
      document.querySelectorAll("video, audio").forEach((el) => {
        if (!(el instanceof HTMLMediaElement)) return;
        const start = mediaMap.get(el);
        if (start) {
          const delta = now - start;
          try {
            chrome.runtime.sendMessage(
              { type: "mediaPlayback", ms: delta },
              () => {}
            );
          } catch (err) {}
        }
      });
    } catch (e) {}
  });

  // periodic heartbeat to flush currently playing durations (every 30s)
  setInterval(() => {
    try {
      const now = Date.now();
      document.querySelectorAll("video, audio").forEach((el) => {
        if (!(el instanceof HTMLMediaElement)) return;
        const start = mediaMap.get(el);
        if (start) {
          const delta = now - start;
          mediaMap.set(el, now); // reset start so we count only chunk
          try {
            chrome.runtime.sendMessage(
              { type: "mediaPlayback", ms: delta },
              () => {}
            );
          } catch (err) {}
        }
      });
    } catch (e) {}
  }, 30000);

  console.log("[TM] Content script loaded (media tracking active)");
})();
