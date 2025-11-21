"use strict";

async function injectBoost(tabId, frameId, jsCode = '', cssCode = '', hostname = 'unknown') {
  if (frameId !== 0) return;

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

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!details.url?.startsWith('http')) return;

  let hostname;
  try { hostname = new URL(details.url).hostname; } catch { return; }

  chrome.storage.sync.get([hostname], (result) => {
    const data = result[hostname] || { js: '', css: '', enabled: false };
    if (!data.enabled || (!data.js?.trim() && !data.css?.trim())) return;

    injectBoost(details.tabId, details.frameId, data.js, data.css, hostname);
  });
});