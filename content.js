"use strict";

(() => {
  // Skip extension pages, chrome://, about:, etc.
  if (!['http:', 'https:'].includes(location.protocol)) return;

  const hostname = location.hostname;
  if (!hostname) return;

  chrome.storage.sync.get([hostname], (result) => {
    const data = result[hostname] || { js: '', css: '', enabled: false };

    if (!data.enabled) return;

    const jsCode = data.js || '';
    const cssCode = data.css || '';

    if (!jsCode.trim() && !cssCode.trim()) return;

    const head = document.head || document.documentElement;

    let injected = false;

    if (cssCode.trim()) {
      const style = document.createElement('style');
      style.dataset.boost = 'css';
      style.textContent = cssCode;
      head.appendChild(style);
      console.log(`%cBoost: CSS injected on ${hostname}`, 'color: #0d6efd; font-weight: bold;');
      injected = true;
    }

    if (jsCode.trim()) {
      const script = document.createElement('script');
      script.dataset.boost = 'js';
      script.textContent = jsCode;
      head.appendChild(script);
      console.log(`%cBoost: JS injected on ${hostname}`, 'color: #0d6efd; font-weight: bold;');
      injected = true;
    }

    if (injected) {
      console.log(
        `%cBoost: JS and CSS injected successfully on ${hostname}`,
        'background: #0d6efd; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
      );
    }
  });
})();