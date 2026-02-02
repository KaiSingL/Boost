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

// Helpers for base64 encoding/decoding to avoid escaping issues
function decodeScript(encoded) {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch (e) {
    console.warn('Decode failed, using raw (possible corruption):', e);
    try {
      return atob(encoded);
    } catch (e2) {
      console.error('Raw decode failed:', e2);
      return encoded; // Ultimate fallback
    }
  }
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

  if (chrome.runtime.lastError) {
    const errorMsg = chrome.runtime.lastError.message;
    log('background', `LOAD ERROR for ${countKey}: ${errorMsg}`);
    console.error('Boost background load error:', errorMsg);
    return '';
  }

  if (count === 0) return '';

  const keys = Array.from({ length: count }, (_, i) => `${baseKey}_${i}`);
  const chunks = await chrome.storage.sync.get(keys);

  if (chrome.runtime.lastError) {
    const errorMsg = chrome.runtime.lastError.message;
    log('background', `LOAD ERROR for ${baseKey} chunks: ${errorMsg}`);
    console.error('Boost background load error:', errorMsg);
    return '';
  }

  let encoded = keys.reduce((acc, key) => acc + (chunks[key] ?? ''), '');
  const decoded = decodeScript(encoded);
  log('background', `LOAD: Decoded ${baseKey} (${decoded.length} chars) from ${count} chunks`);
  return decoded;
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

  log('background', `Injection check for ${hostname} (enabled key: ${hostname}_enabled)`);

  const enabledKey = `${hostname}_enabled`;
  const enabledRes = await chrome.storage.sync.get(enabledKey);

  if (chrome.runtime.lastError) {
    log('background', `LOAD ERROR for ${enabledKey}: ${chrome.runtime.lastError.message}`);
    return;
  }

  let jsCode = '';
  let cssCode = '';
  let enabled = false;

  if (enabledKey in enabledRes) {
    // New chunked format
    enabled = enabledRes[enabledKey] === true;

    if (enabled) {
      jsCode = await loadCode(`${hostname}_js`);
      cssCode = await loadCode(`${hostname}_css`);
      log('background', `Loaded enabled chunks: JS ${jsCode.length}, CSS ${cssCode.length} chars`);
    }
  } else {
    // Fallback to old single-object format
    const oldRes = await chrome.storage.sync.get([hostname]);

    if (chrome.runtime.lastError) {
      log('background', `LOAD ERROR for old format ${hostname}: ${chrome.runtime.lastError.message}`);
    } else {
      const oldData = oldRes[hostname];

      if (oldData?.enabled) {
        enabled = true;
        jsCode = oldData.js || '';
        cssCode = oldData.css || '';
        log('background', `Loaded old format: JS ${jsCode.length}, CSS ${cssCode.length} chars`);
      }
    }
  }

  if (!enabled || (!jsCode.trim() && !cssCode.trim())) {
    log('background', `Skipping injection: disabled or empty for ${hostname}`);
    return;
  }

  await injectBoost(details.tabId, details.frameId, jsCode, cssCode, hostname);
});