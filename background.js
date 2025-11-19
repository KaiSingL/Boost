"use strict";

/**
 * Injects custom CSS and JS into the specified tab.
 * Always injects CSS via <style> tag and JS via <script> tag in document.head.
 */
function inject(tabId, jsCode = '', cssCode = '', hostname = 'unknown site') {
  let injected = 0;
  let errors = 0;

  // Inject CSS as <style> tag
  if (cssCode.trim()) {
    chrome.scripting
      .executeScript({
        target: { tabId, allFrames: false },
        func: (css, host) => {
          const style = document.createElement('style');
          style.textContent = css;
          style.dataset.boost = 'css'; // marker
          (document.head || document.documentElement).appendChild(style);
          console.log(`%cBoost: CSS injected on ${host}`, 'color: #0d6efd; font-weight: bold;');
        },
        args: [cssCode, hostname],
        world: 'MAIN' // ensures it runs in page context
      })
      .then(() => injected++)
      .catch(err => {
        errors++;
        console.error('%cBoost: Failed to inject CSS', 'color: red; font-weight: bold;', err);
      });
  } else {
    injected++; // count as done if no CSS
  }

  // Inject JS as <script> tag
  if (jsCode.trim()) {
    chrome.scripting
      .executeScript({
        target: { tabId, allFrames: false },
        func: (js, host) => {
          const script = document.createElement('script');
          script.textContent = js;
          script.dataset.boost = 'js'; // marker
          (document.head || document.documentElement).appendChild(script);
          console.log(`%cBoost: JS injected on ${host}`, 'color: #0d6efd; font-weight: bold;');
        },
        args: [jsCode, hostname],
        world: 'MAIN'
      })
      .then(() => injected++)
      .catch(err => {
        errors++;
        console.error('%cBoost: Failed to inject JS', 'color: red; font-weight: bold;', err);
      });
  } else {
    injected++; // count as done if no JS
  }

  // Final success message only when both operations are complete
  Promise.allSettled([
    cssCode.trim() ? chrome.scripting.executeScript({ target: { tabId } }) : Promise.resolve(),
    jsCode.trim() ? chrome.scripting.executeScript({ target: { tabId } }) : Promise.resolve()
  ]).then(() => {
    if (errors === 0 && (jsCode.trim() || cssCode.trim())) {
      chrome.scripting.executeScript({
        target: { tabId },
        func: (host) => {
          console.log(`%cBoost: JS and CSS injected successfully on ${host}`, 'background: #0d6efd; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
        },
        args: [hostname]
      }).catch(() => {});
    }
  });
}

// Listen for page loads and inject if enabled
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) return;

  let hostname = 'unknown site';
  try {
    hostname = new URL(tab.url).hostname;
  } catch (e) {
    // ignore invalid URLs
  }

  chrome.storage.sync.get([hostname], (items) => {
    const data = items[hostname];

    if (data?.enabled && (data.js?.trim() || data.css?.trim())) {
      inject(tabId, data.js || '', data.css || '', hostname);
    }
  });
});