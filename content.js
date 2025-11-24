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

  // Helpers for base64 encoding/decoding to avoid escaping issues
  function encodeScript(script) {
    try {
      return btoa(unescape(encodeURIComponent(script))); // Handle UTF-8 properly
    } catch (e) {
      console.error('Encode failed:', e);
      return btoa(script); // Fallback
    }
  }

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

  // Callback-based loadField for chunks (raw encoded string)
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

  // Load data with old-format migration to chunks + base64, then chunked load
  function loadData(host, callback) {
    sendLog('content', `Checking old format for ${host}`);
    chrome.storage.sync.get(host, items => {
      if (items[host]) {
        // Old single-key format: migrate to chunked + encoded
        const oldData = items[host];
        sendLog('content', `Old format found, migrating to chunks + base64 for ${host}`);
        // Mimic saveData for migration (encode and chunk, remove old)
        const encodedJs = encodeScript(oldData.js || '');
        const encodedCss = encodeScript(oldData.css || '');
        const sets = {};
        sets[`${host}_enabled`] = oldData.enabled;
        const CHUNK_SIZE = 7000;
        function chunkAndSet(baseKey, value, sets) {
          if (value.length === 0) {
            sets[`${baseKey}_chunks`] = 0;
            return;
          }
          const chunks = [];
          for (let i = 0; i < value.length; i += CHUNK_SIZE) {
            chunks.push(value.substring(i, i + CHUNK_SIZE));
          }
          sets[`${baseKey}_chunks`] = chunks.length;
          chunks.forEach((chunk, i) => {
            sets[`${baseKey}_${i}`] = chunk;
          });
        }
        chunkAndSet(`${host}_js`, encodedJs, sets);
        chunkAndSet(`${host}_css`, encodedCss, sets);
        sendLog('content', `Migration: Encoded JS (${encodedJs.length}), CSS (${encodedCss.length})`);
        chrome.storage.sync.set(sets, () => {
          chrome.storage.sync.remove(host, () => {
            sendLog('content', `Migration complete for ${host}`);
            callback(oldData);
          });
        });
        return;
      }

      // Load from chunked format (encoded)
      sendLog('content', `Loading chunked format for ${host}`);
      chrome.storage.sync.get(`${host}_enabled`, en => {
        const enabled = en[`${host}_enabled`] === true;
        sendLog('content', `Enabled? ${enabled}`);
        loadField(`${host}_js`, encodedJs => {
          const js = decodeScript(encodedJs);
          sendLog('content', `JS decoded, length ${js.length}`);
          loadField(`${host}_css`, encodedCss => {
            const css = decodeScript(encodedCss);
            sendLog('content', `CSS decoded, length ${css.length}`);
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