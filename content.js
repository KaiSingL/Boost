"use strict";
(() => {
  // Skip non-HTTP/HTTPS
  if (!['http:', 'https:'].includes(location.protocol)) return;
  const hostname = location.hostname;
  if (!hostname) return;

  // Mobile detection (full check since in page context)
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                         (/Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document);
  if (!isMobileDevice) return;

  // Send log via message to background
  function sendLog(source, message) {
    chrome.runtime.sendMessage({ type: 'log', source, message }, () => {
      // Optional: Handle response if needed
    });
    console.log(`[${source}] ${message}`); // Still log to page console
  }

  sendLog('content', `Proceeding with injection for ${hostname}`);

  // Callback-based loadField for chunks (fallback)
  function loadField(baseKey, cb) {
    sendLog('content', `Loading field ${baseKey}`);
    chrome.storage.sync.get(`${baseKey}_chunks`, items => {
      const numChunks = items[`${baseKey}_chunks`] || 0;
      sendLog('content', `Num chunks for ${baseKey}: ${numChunks}`);
      if (numChunks === 0) {
        cb('');
        return;
      }

      const chunkKeys = [];
      for (let i = 0; i < numChunks; i++) {
        chunkKeys.push(`${baseKey}_${i}`);
      }

      chrome.storage.sync.get(chunkKeys, ch => {
        let value = '';
        for (let i = 0; i < numChunks; i++) {
          value += ch[`${baseKey}_${i}`] || '';
        }
        cb(value);
      });
    });
  }

  // Load data: prefer old format on mobile (no migration), fallback to chunked
  function loadData(host, callback) {
    sendLog('content', `Checking old format for ${host}`);
    chrome.storage.sync.get(host, items => {
      if (items[host]) {
        // Old single-key format: use directly on mobile (no migration)
        const oldData = items[host];
        sendLog('content', `Old format found, using directly (mobile) for ${host}`);
        callback(oldData);
        return;
      }

      // No old format: load from split/chunked (fallback for legacy chunked data)
      sendLog('content', `Loading chunked format for ${host}`);
      chrome.storage.sync.get(`${host}_enabled`, en => {
        const enabled = en[`${host}_enabled`] === true;
        sendLog('content', `Enabled? ${enabled}`);
        loadField(`${host}_js`, js => {
          sendLog('content', `JS loaded, length ${js.length}`);
          loadField(`${host}_css`, css => {
            sendLog('content', `CSS loaded, length ${css.length}`);
            callback({ js, css, enabled });
          });
        });
      });
    });
  }

  // Load and inject (exact old approach)
  loadData(hostname, (data) => {
    sendLog('content', `Data loaded for ${hostname}`);
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
      sendLog('content', `CSS injected on ${hostname}`);
      injected = true;
    }

    if (jsCode.trim()) {
      const script = document.createElement('script');
      script.dataset.boost = 'js';
      script.textContent = jsCode;
      head.appendChild(script);
      sendLog('content', `JS injected on ${hostname}`);
      injected = true;
    }

    if (injected) {
      sendLog('content', `JS and CSS injected successfully on ${hostname}`);
    }
  });
})();