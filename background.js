"use strict";

async function injectBoost(tabId, frameId, jsCode = '', cssCode = '', hostname = 'unknown') {
  const target = { tabId, frameIds: [frameId] };
  const tasks = [];

  if (cssCode.trim()) {
    tasks.push(
      chrome.scripting.insertCSS({ target, css: cssCode })
        .then(() => console.log(`%cBoost ✅ CSS injected (full CSP bypass) on ${hostname}`, 'color: #0d6efd; font-weight: bold;'))
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
            console.error("%cBoost ❌ JS injection failed on", host, e);
          }
        },
        args: [jsCode, hostname]
      })
    );
  }

  await Promise.all(tasks);
  console.log(`%cBoost 🚀 Injection complete on ${hostname}`, 'background: #0d6efd; color: white; font-weight: bold; padding: 5px 10px; border-radius: 6px;');
}

async function loadCode(baseKey) {
  const countKey = `${baseKey}_chunks`;
  const { [countKey]: count = 0 } = await chrome.storage.sync.get(countKey);

  if (count === 0) return '';

  const keys = Array.from({ length: count }, (_, i) => `${baseKey}_${i}`);
  const chunks = await chrome.storage.sync.get(keys);

  return keys.reduce((acc, key) => acc + (chunks[key] ?? ''), '');
}

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!details.url?.startsWith('http')) return;

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