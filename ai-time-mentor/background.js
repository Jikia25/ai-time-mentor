// background.optimized.js - Full final: tracking, batching, mediaPlayMs, reminders, notifications
(function () {
  // --- Helpers: tiny promise wrappers for chrome.* callbacks ---
  function cbToPromise(fn, ...args) {
    return new Promise((resolve, reject) => {
      try {
        fn(...args, (res) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.warn("[TM] chrome.lastError", chrome.runtime.lastError);
          }
          resolve(res);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  async function storageGet(keys) {
    return (
      (await cbToPromise(
        chrome.storage.local.get.bind(chrome.storage.local),
        keys
      )) || {}
    );
  }
  async function storageSet(obj) {
    return await cbToPromise(
      chrome.storage.local.set.bind(chrome.storage.local),
      obj
    );
  }

  // --- small utilities ---
  function clamp(v, a = 0, b = 1) {
    return Math.max(a, Math.min(b, v));
  }

  // sentiment lexicon (small)
  const SENTIMENT_LEXICON = {
    good: 1,
    great: 1,
    awesome: 1,
    nice: 1,
    love: 1,
    happy: 1,
    done: 1,
    fixed: 1,
    resolved: 1,
    bad: -1,
    terrible: -1,
    hate: -1,
    stuck: -1,
    frustrat: -1,
    angry: -1,
    annoy: -1,
    fail: -1,
    issue: -1,
  };

  function sentimentScore(text) {
    if (!text || typeof text !== "string") return 0;
    const s = text.toLowerCase().replace(/[^\w\s]/g, " ");
    const tokens = s.split(/\s+/).filter(Boolean);
    if (!tokens.length) return 0;
    let score = 0;
    tokens.forEach((t) => {
      for (const key in SENTIMENT_LEXICON) {
        if (t.startsWith(key)) {
          score += SENTIMENT_LEXICON[key];
          break;
        }
      }
    });
    return score / Math.sqrt(tokens.length);
  }

  function analyzeAggregates(aggregates) {
    aggregates = aggregates || {};
    const productiveMs = aggregates.productive || 0;
    const distractingMs = aggregates.distracting || 0;
    const otherMs = aggregates.other || 0;
    const tabSwitches = aggregates.tabSwitches || 0;
    const typing = aggregates.typingKeystrokes || 0;
    const idleMs = aggregates.idleMs || 0;
    const textSamples = Array.isArray(aggregates.samples)
      ? aggregates.samples
      : [];

    const totalActiveMs = productiveMs + distractingMs + otherMs;
    const activeMinutes = Math.max(totalActiveMs / 60000, 0.1);

    const focusScore = clamp(productiveMs / Math.max(totalActiveMs, 1));
    const switchRate = tabSwitches / activeMinutes;
    const typingIntensity = typing / activeMinutes;
    const idleRatio = clamp(idleMs / Math.max(idleMs + totalActiveMs, 1));
    const sentimentVals = textSamples.map((s) => sentimentScore(s));
    const sentimentAvg = sentimentVals.length
      ? sentimentVals.reduce((a, b) => a + b, 0) / sentimentVals.length
      : 0;

    let stress = 0;
    stress += clamp((switchRate - 0.5) / 5);
    if (typingIntensity > 120) stress += 0.2;
    if (sentimentAvg < -0.2) stress += 0.25;
    if (idleRatio > 0.4) stress += 0.15;
    stress = clamp(stress);

    let mood = "mixed";
    if (focusScore > 0.7 && stress < 0.2) mood = "focused";
    else if (focusScore > 0.5 && stress < 0.4) mood = "calm";
    else if (stress >= 0.6) mood = "frustrated";
    else if (idleRatio > 0.5) mood = "tired";
    else if (switchRate > 1.5) mood = "restless";
    else mood = "mixed";

    const focusPct = Math.round(focusScore * 100);
    let summary = `Focus: ${focusPct}% — mood: ${mood}.`;
    let insight = "",
      action = "";

    if (mood === "frustrated") {
      insight = `High switching and negative tone detected (stress ${Math.round(
        stress * 100
      )}%).`;
      action = `Take a 3-minute break. Then try a 25-min Pomodoro.`;
    } else if (mood === "restless") {
      insight = `Frequent context switches (~${switchRate.toFixed(1)}/min).`;
      action = `Enable Focus Mode for 25 minutes and close distracting tabs.`;
    } else if (mood === "tired") {
      insight = `High idle time suggests fatigue.`;
      action = `Take a longer break (10–20 min) and hydrate.`;
    } else if (mood === "focused") {
      insight = `Steady productive time detected — good momentum.`;
      action = `Keep this rhythm: 25/5 Pomodoro.`;
    } else {
      if (sentimentAvg < -0.2) {
        insight = `Text tone leans negative — possible frustration.`;
        action = `Write a 2-sentence summary of the blocker; ask a quick sync.`;
      } else if (focusPct < 40) {
        insight = `Low focus detected (<40%).`;
        action = `Try a short 5-min break and then a 25-min focus session.`;
      } else {
        insight = `Mixed signals: moderate focus with occasional switches.`;
        action = `Schedule deep work into your peak hours.`;
      }
    }

    return {
      focusScore,
      focusPct,
      switchRate: parseFloat(switchRate.toFixed(2)),
      typingIntensity: Math.round(typingIntensity),
      idleRatio: parseFloat(idleRatio.toFixed(2)),
      sentimentAvg: parseFloat(sentimentAvg.toFixed(3)),
      stress: parseFloat(stress.toFixed(2)),
      mood,
      summary,
      insight,
      action,
    };
  }

  // --- domain lists ---
  const PRODUCTIVE_DOMAINS = [
    "github.com",
    "stackoverflow.com",
    "gitlab.com",
    "docs.google.com",
    "notion.so",
    "jira",
    "trello.com",
    "linkedin.com",
    "chatgpt.com",
  ];
  const DISTRACTING_DOMAINS = [
    "youtube.com",
    "facebook.com",
    "twitter.com",
    "instagram.com",
    "tiktok.com",
    "reddit.com",
  ];

  function domainFromUrl(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }
  function classify(domain) {
    if (!domain) return "other";
    if (PRODUCTIVE_DOMAINS.some((d) => domain.includes(d))) return "productive";
    if (DISTRACTING_DOMAINS.some((d) => domain.includes(d)))
      return "distracting";
    return "other";
  }

  // --- batched storage writes ---
  let pendingUsage = null;
  let pendingFlushTimer = null;
  function scheduleFlushPendingUsage() {
    if (pendingFlushTimer) return;
    pendingFlushTimer = setTimeout(async () => {
      try {
        if (!pendingUsage) {
          pendingFlushTimer = null;
          return;
        }
        const current = await storageGet(["usage"]);
        const usage = current.usage || {};
        for (const k in pendingUsage) {
          usage[k] = (usage[k] || 0) + pendingUsage[k];
        }
        pendingUsage = null;
        pendingFlushTimer = null;
        await storageSet({ usage });
        recomputeEmotionProfileThrottled();
      } catch (e) {
        console.warn("[TM] flush error", e);
        pendingFlushTimer = null;
      }
    }, 800);
  }

  async function saveDuration(category, ms) {
    pendingUsage = pendingUsage || {};
    pendingUsage[category] = (pendingUsage[category] || 0) + ms;
    scheduleFlushPendingUsage();
  }

  // --- tracking state ---
  let current = null;

  async function startTracking(tabId, url) {
    await stopCurrent();
    const domain = domainFromUrl(url);
    current = {
      tabId,
      url,
      domain,
      startTs: Date.now(),
      category: classify(domain),
    };
    console.log("[TM] startTracking", domain, current.category);
    setTimeout(() => recomputeEmotionProfileThrottled(), 120);
  }

  async function stopCurrent(reason = "") {
    if (!current) return;
    const now = Date.now();
    const duration = now - current.startTs;
    await saveDuration(current.category, duration);
    console.log(
      "[TM] stopCurrent",
      current.domain,
      current.category,
      "ms=",
      duration,
      "reason=",
      reason
    );
    current = null;
    recomputeEmotionProfileThrottled();
  }

  // --- recompute profile ---
  async function recomputeEmotionProfile() {
    try {
      const res = await storageGet(["usage", "consentText"]);
      const usageRaw = res.usage || {};
      const hasCategoryKeys =
        typeof usageRaw.productive === "number" ||
        typeof usageRaw.distracting === "number";
      const normalized = {
        productive: 0,
        distracting: 0,
        other: 0,
        tabSwitches: usageRaw.tabSwitches || 0,
        typingKeystrokes: usageRaw.typingKeystrokes || 0,
        idleMs: usageRaw.idleMs || 0,
        samples: Array.isArray(usageRaw.samples)
          ? usageRaw.samples.slice()
          : [],
      };

      if (hasCategoryKeys) {
        normalized.productive = usageRaw.productive || 0;
        normalized.distracting = usageRaw.distracting || 0;
        normalized.other = usageRaw.other || 0;
      } else {
        for (const key in usageRaw) {
          if (!usageRaw.hasOwnProperty(key)) continue;
          if (
            [
              "tabSwitches",
              "typingKeystrokes",
              "idleMs",
              "samples",
              "productive",
              "distracting",
              "other",
            ].includes(key)
          )
            continue;
          const val = Number(usageRaw[key]) || 0;
          const k = String(key).toLowerCase();
          if (PRODUCTIVE_DOMAINS.some((d) => k.includes(d)))
            normalized.productive += val;
          else if (DISTRACTING_DOMAINS.some((d) => k.includes(d)))
            normalized.distracting += val;
          else normalized.other += val;
        }
      }

      if (!res.consentText) normalized.samples = [];

      const profile = analyzeAggregates(normalized);

      // Save profile and mark source as 'local' by default
      await storageSet({
        emotionProfile: profile,
        profileSource: "local",
        profileUpdatedAt: Date.now(),
      });
      console.log("[TM] ✅ emotionProfile updated", profile);

      // schedule reminders based on the freshly computed profile
      try {
        checkAndScheduleReminders(profile);
      } catch (e) {
        console.warn("[TM] checkReminders err", e);
      }
    } catch (e) {
      console.error("[TM] recompute error", e);
    }
  }

  let recomputeTimeout = null;
  function recomputeEmotionProfileThrottled() {
    if (recomputeTimeout) clearTimeout(recomputeTimeout);
    recomputeTimeout = setTimeout(() => {
      recomputeEmotionProfile();
    }, 1000);
  }

  // --- REMINDERS: improved implementation ---
  async function _hasSimilarReminder({
    title,
    type,
    windowMs = 3 * 60 * 1000,
  }) {
    try {
      const st = await storageGet(["reminders"]);
      const r = (st.reminders || []).find((rem) => {
        if (type && rem.meta && rem.meta.type !== type) return false;
        if (title && rem.title !== title) return false;
        const dt = Math.abs((rem.when || 0) - Date.now());
        return dt <= windowMs;
      });
      return !!r;
    } catch (e) {
      return false;
    }
  }

  async function scheduleReminder({
    id,
    whenMs,
    title,
    message,
    meta,
    options = {},
  }) {
    const dedupeWindowMs = options.dedupeWindowMs || 3 * 60 * 1000;
    const keepUntilAction = !!options.keepUntilAction;

    try {
      if (!id) id = `rem_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      if (!whenMs || typeof whenMs !== "number")
        whenMs = Date.now() + 60 * 1000;

      if (meta && meta.type) {
        const exists = await _hasSimilarReminder({
          title,
          type: meta.type,
          windowMs: dedupeWindowMs,
        });
        if (exists) {
          console.log(
            "[TM] skip scheduling duplicate reminder type=",
            meta.type
          );
          return null;
        }
      }

      const st = await storageGet(["reminders"]);
      const reminders = st.reminders || [];
      const entry = {
        id,
        when: whenMs,
        title: title || "Reminder",
        message: message || "",
        meta: meta || {},
        createdAt: Date.now(),
        keepUntilAction,
      };
      reminders.push(entry);
      await storageSet({ reminders });

      try {
        chrome.alarms.create(id, { when: whenMs });
      } catch (e) {
        console.warn("[TM] alarms.create failed", e);
      }

      console.log(
        "[TM] Scheduled reminder",
        id,
        "at",
        new Date(whenMs).toLocaleString()
      );
      return entry;
    } catch (e) {
      console.warn("[TM] scheduleReminder error", e);
      return null;
    }
  }

  async function removeReminderById(id) {
    try {
      const st = await storageGet(["reminders"]);
      let reminders = st.reminders || [];
      const before = reminders.length;
      reminders = reminders.filter((r) => r.id !== id);
      if (reminders.length !== before) {
        await storageSet({ reminders });
      }
      try {
        chrome.alarms.clear(id);
      } catch (e) {}
    } catch (e) {
      console.warn("[TM] removeReminder error", e);
    }
  }

  function checkAndScheduleReminders(profile) {
    if (!profile) return;
    const now = Date.now();
    const makeId = (type) =>
      `rem_${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (profile.idleRatio > 0.5) {
      const id = makeId("idle");
      scheduleReminder({
        id,
        whenMs: now + 60 * 1000,
        title: "დაღლილობის ნიშანი — დრო შესვენების",
        message:
          "ხალხურად: ბევრი დროა იყავი არააქტიური. სცადე 5–10 წუთიანი შესვენება და დაბრუნდი. (Snooze/ChatGPT)",
        meta: { type: "idle", profile },
        options: { dedupeWindowMs: 5 * 60 * 1000, keepUntilAction: false },
      });
    }

    if (profile.focusPct < 40) {
      const id = makeId("focus");
      scheduleReminder({
        id,
        whenMs: now + 2 * 60 * 1000,
        title: "ფოკუსი დაბალია",
        message:
          "ფოკუსი <40%. შეეცადე 5 წუთის დასვენება და შემდეგ 25 წუთიანი პომოდორო სესიაზე დაიწყე.",
        meta: { type: "focus", profile },
        options: { dedupeWindowMs: 10 * 60 * 1000, keepUntilAction: false },
      });
    }

    if (profile.stress >= 0.6) {
      const id = makeId("stress");
      scheduleReminder({
        id,
        whenMs: now + 30 * 1000,
        title: "სიგნალი: მაღალი სტრესი",
        message:
          "სტრესის ნიშნები მაღალია. 3 წუთიანი სუნთქვითი ვარჯიში დაგეხმარება.",
        meta: { type: "stress", profile },
        options: { dedupeWindowMs: 5 * 60 * 1000, keepUntilAction: true },
      });
    }

    (async () => {
      try {
        const st = await storageGet(["usage"]);
        const u = st.usage || {};
        const mediaMin = Math.round((u.mediaPlayMs || 0) / 60000);
        if (mediaMin >= 30) {
          const id = makeId("media");
          scheduleReminder({
            id,
            whenMs: now + 90 * 1000,
            title: "დიდი მედია სესია",
            message: `იხილე ~${mediaMin} წუთი მედია. სცადე ახლა 25 წუთი კონცენტრირებული მუშაობა.`,
            meta: { type: "media", profile },
            options: { dedupeWindowMs: 30 * 60 * 1000, keepUntilAction: false },
          });
        }
      } catch (e) {
        /* noop */
      }
    })();
  }

  // --- alarms handler ---
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    try {
      if (!alarm || !alarm.name) return;
      if (alarm.name === "tm_heartbeat") {
        if (current) {
          const chunk = 60 * 1000;
          pendingUsage = pendingUsage || {};
          pendingUsage[current.category] =
            (pendingUsage[current.category] || 0) + chunk;
          current.startTs = Date.now();
          scheduleFlushPendingUsage();
        }
        return;
      }

      const id = alarm.name;
      const st = await storageGet(["reminders"]);
      const reminders = st.reminders || [];
      const rIndex = reminders.findIndex((x) => x.id === id);
      const r = reminders[rIndex];
      if (!r) return;

      const notifOptions = {
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: r.title || "Reminder",
        message: r.message || "",
        buttons: [{ title: "Snooze 5m" }, { title: "Dismiss" }],
        priority: 2,
      };

      try {
        chrome.notifications.create(id, notifOptions, () => {});
      } catch (e) {
        console.warn("[TM] notify failed", e);
      }

      if (!r.keepUntilAction) {
        reminders.splice(rIndex, 1);
        await storageSet({ reminders });
        try {
          chrome.alarms.clear(id);
        } catch (e) {}
      } else {
        reminders[rIndex].firedAt = Date.now();
        await storageSet({ reminders });
      }
    } catch (e) {
      console.warn("[TM] alarm handler error", e);
    }
  });

  // --- notification handlers ---
  chrome.notifications.onButtonClicked.addListener(
    (notificationId, buttonIndex) => {
      (async () => {
        try {
          if (!notificationId) return;
          const st = await storageGet(["reminders"]);
          const reminders = st.reminders || [];
          const r = reminders.find((x) => x.id === notificationId);

          if (buttonIndex === 0) {
            // Snooze 5m
            const snoozeMs = Date.now() + 5 * 60 * 1000;
            const newId = `${notificationId}_snooze_${Date.now()}`;
            await scheduleReminder({
              id: newId,
              whenMs: snoozeMs,
              title: r ? r.title + " (snoozed)" : "Snoozed reminder",
              message: r ? r.message : "",
              meta: r
                ? { snoozedFrom: notificationId }
                : { snoozedFrom: notificationId },
              options: { keepUntilAction: false },
            });
            try {
              chrome.notifications.clear(notificationId);
            } catch (e) {}
            if (r && r.keepUntilAction)
              await removeReminderById(notificationId);
          } else if (buttonIndex === 1) {
            // Dismiss
            try {
              chrome.notifications.clear(notificationId);
            } catch (e) {}
            await removeReminderById(notificationId);
          }
        } catch (e) {
          console.warn("[TM] notification button handler err", e);
        }
      })();
    }
  );

  chrome.notifications.onClicked.addListener((notificationId) => {
    try {
      const url = chrome.runtime.getURL("dashboard.html");
      chrome.tabs.create({ url });
      try {
        chrome.notifications.clear(notificationId);
      } catch (e) {}
    } catch (e) {
      console.warn("[TM] notification click err", e);
    }
  });

  // --- chrome event wiring ---
  chrome.tabs.onActivated.addListener(async (info) => {
    try {
      const tab = await cbToPromise(
        chrome.tabs.get.bind(chrome.tabs),
        info.tabId
      );
      if (tab && tab.url) await startTracking(tab.id, tab.url);
    } catch (e) {
      console.warn("[TM] onActivated", e);
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    try {
      if (changeInfo.status === "complete" && tab.active && tab.url) {
        await startTracking(tabId, tab.url);
      }
    } catch (e) {
      console.warn("[TM] onUpdated", e);
    }
  });

  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    try {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        await stopCurrent("window-lost-focus");
      } else {
        const tabs = await cbToPromise(chrome.tabs.query.bind(chrome.tabs), {
          active: true,
          windowId,
        });
        if (tabs && tabs[0] && tabs[0].url)
          await startTracking(tabs[0].id, tabs[0].url);
      }
    } catch (e) {
      console.warn("[TM] windows.onFocusChanged", e);
    }
  });

  // heartbeat
  chrome.alarms.create("tm_heartbeat", { periodInMinutes: 1 });

  // --- runtime messages (includes mediaPlayback handler) ---
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      try {
        if (!msg) {
          sendResponse?.({});
          return;
        }

        if (msg.type === "keystroke") {
          pendingUsage = pendingUsage || {};
          pendingUsage.typingKeystrokes =
            (pendingUsage.typingKeystrokes || 0) + 1;
          scheduleFlushPendingUsage();
          sendResponse?.({ ok: true });
        } else if (msg.type === "tabSwitch") {
          pendingUsage = pendingUsage || {};
          pendingUsage.tabSwitches = (pendingUsage.tabSwitches || 0) + 1;
          scheduleFlushPendingUsage();
          sendResponse?.({ ok: true });
        } else if (msg.type === "mediaPlayback" && typeof msg.ms === "number") {
          pendingUsage = pendingUsage || {};
          pendingUsage.mediaPlayMs =
            (pendingUsage.mediaPlayMs || 0) + Number(msg.ms);
          pendingUsage.mediaPlays = (pendingUsage.mediaPlays || 0) + 1;
          scheduleFlushPendingUsage();
          // debug log briefly
          console.log("[TM] mediaPlayback received ms=", msg.ms);
          sendResponse?.({ ok: true });
        } else if (msg.type === "getAggregates") {
          const res = await storageGet([
            "usage",
            "emotionProfile",
            "reminders",
            "profileSource",
          ]);
          sendResponse?.(res);
        } else if (msg.type === "resetUsage") {
          await storageSet({
            usage: {},
            emotionProfile: null,
            reminders: [],
            profileSource: "local",
          });
          pendingUsage = null;
          sendResponse?.({ ok: true });
        } else if (
          msg.type === "addSampleText" &&
          typeof msg.text === "string"
        ) {
          const st = await storageGet(["consentText", "usage"]);
          if (!st.consentText) {
            sendResponse?.({ ok: false, reason: "no-consent" });
            return;
          }
          const usage = st.usage || {};
          usage.samples = usage.samples || [];
          usage.samples.push(msg.text);
          if (usage.samples.length > 10) usage.samples.shift();
          await storageSet({ usage });
          recomputeEmotionProfileThrottled();
          sendResponse?.({ ok: true });
        } else if (msg.type === "recomputeProfile") {
          await recomputeEmotionProfile();
          const p =
            (await storageGet(["emotionProfile"])).emotionProfile || null;
          sendResponse?.({ ok: true, profile: p });
        } else if (msg.type === "snoozeReminder" && msg.id) {
          const st = await storageGet(["reminders"]);
          const reminders = st.reminders || [];
          const r = reminders.find((x) => x.id === msg.id);
          if (!r) {
            sendResponse?.({ ok: false, reason: "not-found" });
            return;
          }
          const id = `rem_snooze_${Date.now()}_${Math.floor(
            Math.random() * 1000
          )}`;
          await scheduleReminder({
            id,
            whenMs: Date.now() + 5 * 60 * 1000,
            title: r.title + " (snoozed)",
            message: r.message,
            meta: { snoozedFrom: msg.id },
            options: { keepUntilAction: false },
          });
          await removeReminderById(msg.id);
          sendResponse?.({ ok: true });
        } else if (msg.type === "dismissReminder" && msg.id) {
          await removeReminderById(msg.id);
          sendResponse?.({ ok: true });
        } else {
          sendResponse?.({ ok: false, reason: "unknown" });
        }
      } catch (e) {
        console.error("[TM] onMessage internal error", e);
        try {
          sendResponse?.({ ok: false, error: String(e) });
        } catch {}
      }
    })();
    return true; // keep message channel open
  });

  // idle
  if (chrome.idle && chrome.idle.setDetectionInterval) {
    try {
      chrome.idle.setDetectionInterval(60);
    } catch (e) {
      console.warn("[TM] Idle detection setup failed:", e);
    }
    chrome.idle.onStateChanged.addListener((state) => {
      if (state === "idle" || state === "locked") {
        pendingUsage = pendingUsage || {};
        pendingUsage.idleMs = (pendingUsage.idleMs || 0) + 60000;
        scheduleFlushPendingUsage();
      }
    });
  }

  // installed/startup
  chrome.runtime.onInstalled.addListener(async () => {
    console.log("[TM] 🚀 Extension installed/updated");
    const s = await storageGet(["usage"]);
    if (!s.usage) {
      await storageSet({ usage: {} });
      recomputeEmotionProfileThrottled();
    }
  });

  chrome.runtime.onStartup.addListener(async () => {
    console.log("[TM] 🔄 Browser/extension started");
    try {
      const tabs = await cbToPromise(chrome.tabs.query.bind(chrome.tabs), {
        active: true,
        currentWindow: true,
      });
      if (tabs && tabs[0] && tabs[0].url)
        await startTracking(tabs[0].id, tabs[0].url);
    } catch (e) {
      console.warn("[TM] startup tracking error", e);
    }
    recomputeEmotionProfileThrottled();
  });

  console.log("[TM] optimized background loaded (media + reminders)");
})();
