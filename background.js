"use strict";

const isMobileDevice = /Android|iPhone|iPad|iPod|Macintosh.*(iPhone|iPad)/i.test(navigator.userAgent);

const MAX_LOGS = 500;

// Centralized log function
async function log(source, message) {
  try {
    const { boost_logs: logs = [] } = await chrome.storage.local.get('boost_logs');
    logs.push({ timestamp: new Date().toISOString(), source, message });
    if (logs.length > MAX_LOGS) logs.shift();
    await chrome.storage.local.set({ boost_logs: logs });
  } catch (e) {
    console.error(`Background log failed: ${e}`);
  }
}

// Helper for styled console logs while capturing plain message
function styledLog(...args) {
  console.log(...args); // Preserve original styled output
  const message = args.slice(1).join(' '); // Strip style arg
  log('background', message);
}

async function injectBoost(tabId, frameId, jsCode = '', cssCode = '', hostname = 'unknown') {
  const target = { tabId, frameIds: [frameId] };
  const tasks = [];

  if (cssCode.trim()) {
    tasks.push(
      chrome.scripting.insertCSS({ target, css: cssCode })
        .then(() => styledLog(`%cBoost ✅ CSS injected (full CSP bypass) on ${hostname}`, 'color: #0d6efd; font-weight: bold;'))
        .catch(err => console.error(`%cBoost ❌ CSS injection failed on ${hostname}`, 'color: red;', err))
    );
  }

  if (jsCode.trim()) {
    tasks.push(
      chrome.scripting.executeScript({
        target,
        world: "MAIN",
        func: function(code, host) {
          try {
            const script = document.createElement("script");
            script.textContent = code;
            script.dataset.boost = "js";
            (document.head || document.documentElement).appendChild(script);
            console.log(`%cBoost ✅ JS injected (main world) on ${host}`, 'color: #0d6efd; font-weight: bold;');
          } catch (e) {
            console.error("%cBoost ❌ JS injection failed on", 'color: red;', host, e);
          }
        },
        args: [jsCode, hostname]
      })
    );
  }

  await Promise.all(tasks);
  styledLog(`%cBoost 🚀 Injection complete on ${hostname}`, 'background: #0d6efd; color: white; font-weight: bold; padding: 5px 10px; border-radius: 6px;');
}

async function loadCode(baseKey) {
  const countKey = `${baseKey}_chunks`;
  const { [countKey]: count = 0 } = await chrome.storage.sync.get(countKey);

  if (count === 0) return '';

  const keys = Array.from({ length: count }, (_, i) => `${baseKey}_${i}`);
  const chunks = await chrome.storage.sync.get(keys);

  return keys.reduce((acc, key) => acc + (chunks[key] ?? ''), '');
}

// Listen for log messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'log') {
    log(request.source, request.message);
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async
});

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!details.url?.startsWith('http')) return;
  if (isMobileDevice) return;

  let hostname;
  try {
    hostname = new URL(details.url).hostname;
  } catch (e) {
    return;
  }

  const enabledKey = `${hostname}_enabled`;
  const enabledRes = await chrome.storage.sync.get(enabledKey);

  let jsCode = '';
  let cssCode = '';
  let enabled = false;

  if (enabledKey in enabledRes) {
    // New chunked format
    enabled = enabledRes[enabledKey] === true;

    if (enabled) {
      jsCode = await loadCode(`${hostname}_js`);
      cssCode = await loadCode(`${hostname}_css`);
    }
  } else {
    // Fallback to old single-object format
    const oldRes = await chrome.storage.sync.get([hostname]);
    const oldData = oldRes[hostname];

    if (oldData?.enabled) {
      enabled = true;
      jsCode = oldData.js || '';
      cssCode = oldData.css || '';
    }
  }

  if (!enabled || (!jsCode.trim() && !cssCode.trim())) return;

  await injectBoost(details.tabId, details.frameId, jsCode, cssCode, hostname);
});