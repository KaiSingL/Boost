// popup.js
"use strict";

// Mobile Detection Script - Runs immediately, no layout flash
(function () {
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document); // iPadOS

  if (isMobileDevice) {
    document.documentElement.classList.add('mobile');
    document.body.classList.add('mobile');
  }

  window.isMobileDevice = isMobileDevice;
})();

// CodeMirror editor instances
let jsEditor = null;
let cssEditor = null;
let editorsInitialized = false;

// State variables
let currentHost = null;
let currentTabId = null;
let isEnabled = false;
let hasContent = false;
let currentView = 'landing';

// DOM elements
const toggleBtn = document.getElementById('toggle-btn');
const playIcon = toggleBtn.querySelector('.play-icon');
const pauseIcon = toggleBtn.querySelector('.pause-icon');
const landing = document.getElementById('landing');
const editorView = document.getElementById('editor-view');
const logView = document.getElementById('log-view');
const toolBar = document.getElementById('toolbar');
const backBtn = document.getElementById('back-btn');
const saveBtn = document.getElementById('save-btn');
const reloadBtn = document.getElementById('reload-btn');
const clearBtn = document.getElementById('clear-btn');
const statusText = document.getElementById('status-text');
const logPre = document.getElementById('log-pre');
const logBtn = document.getElementById('log-btn');
const refreshIcon = reloadBtn.querySelector('.refresh-icon');
const reloadPlayIcon = reloadBtn.querySelector('.play-icon');

// Constants
const CHUNK_SIZE = 7000;
const MAX_LOGS = 500;
const DISPLAY_LOGS = 100;

// Helpers
function encodeScript(script) {
  try {
    return btoa(unescape(encodeURIComponent(script)));
  } catch (e) {
    console.error('Encode failed:', e);
    return btoa(script);
  }
}

function decodeScript(encoded) {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch (e) {
    console.warn('Decode failed:', e);
    try {
      return atob(encoded);
    } catch (e2) {
      console.error('Raw decode failed:', e2);
      return encoded;
    }
  }
}

// CodeMirror initialization
function waitForCodeMirror(callback, maxAttempts = 50) {
  let attempts = 0;
  const check = () => {
    attempts++;
    if (typeof CodeMirror !== 'undefined') {
      callback();
    } else if (attempts < maxAttempts) {
      setTimeout(check, 100);
    } else {
      console.error('CodeMirror failed to load after', maxAttempts, 'attempts');
    }
  };
  check();
}

function initCodeMirror() {
  if (editorsInitialized || typeof CodeMirror === 'undefined') return;

  // Initialize JS editor
  const jsContainer = document.getElementById('js-editor');
  if (jsContainer && !jsEditor) {
    jsEditor = CodeMirror(jsContainer, {
      mode: 'javascript',
      theme: 'tomorrow-light',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentWithTabs: false,
      extraKeys: {
        'Tab': function(cm) {
          cm.replaceSelection('  ', 'end');
        }
      }
    });
  }

  // Initialize CSS editor
  const cssContainer = document.getElementById('css-editor');
  if (cssContainer && !cssEditor) {
    cssEditor = CodeMirror(cssContainer, {
      mode: 'css',
      theme: 'tomorrow-light',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentWithTabs: false,
      extraKeys: {
        'Tab': function(cm) {
          cm.replaceSelection('  ', 'end');
        }
      }
    });
  }

  editorsInitialized = true;
  console.log('CodeMirror editors initialized');
}

// Helper: Update reload button icon
function updateReloadIcon() {
  if (!hasContent) {
    refreshIcon.style.display = 'block';
    reloadPlayIcon.style.display = 'none';
    reloadBtn.setAttribute('aria-label', 'Reload page');
  } else if (!isEnabled) {
    refreshIcon.style.display = 'none';
    reloadPlayIcon.style.display = 'block';
    reloadBtn.setAttribute('aria-label', 'Enable Boost and reload page');
  } else {
    refreshIcon.style.display = 'block';
    reloadPlayIcon.style.display = 'none';
    reloadBtn.setAttribute('aria-label', 'Reload page');
  }
}

function updateToggleIcon(enabled) {
  playIcon.style.display = enabled ? 'none' : 'block';
  pauseIcon.style.display = enabled ? 'block' : 'none';
  toggleBtn.style.backgroundColor = enabled ? '#0d6efd' : 'white';
  toggleBtn.style.color = enabled ? 'white' : '#0d6efd';
}

function showLanding() {
  landing.classList.add('active');
  editorView.classList.remove('active');
  logView.classList.remove('active');
  toolBar.style.display = 'none';
  backBtn.style.display = 'none';
  saveBtn.style.display = 'none';
  reloadBtn.style.display = 'none';
  clearBtn.style.display = 'none';
  toggleBtn.style.display = hasContent ? 'flex' : 'none';
  currentView = 'landing';
}

function showEditor() {
  landing.classList.remove('active');
  editorView.classList.add('active');
  logView.classList.remove('active');
  toolBar.style.display = 'flex';
  backBtn.style.display = 'flex';
  saveBtn.style.display = 'flex';
  reloadBtn.style.display = 'flex';
  clearBtn.style.display = 'none';
  toggleBtn.style.display = hasContent ? 'flex' : 'none';

  // Initialize editors if not already done
  if (!editorsInitialized) {
    waitForCodeMirror(() => {
      initCodeMirror();
      // Refresh editors to ensure proper rendering
      if (jsEditor) jsEditor.refresh();
      if (cssEditor) cssEditor.refresh();
    });
  } else {
    // Refresh on show
    if (jsEditor) jsEditor.refresh();
    if (cssEditor) cssEditor.refresh();
  }

  updateReloadIcon();
  currentView = 'editor';
}

function showLog() {
  landing.classList.remove('active');
  editorView.classList.remove('active');
  logView.classList.add('active');
  toolBar.style.display = 'flex';
  backBtn.style.display = 'flex';
  clearBtn.style.display = 'flex';
  saveBtn.style.display = 'none';
  reloadBtn.style.display = 'none';
  toggleBtn.style.display = 'none';

  loadLogs();
  logPre.scrollTop = logPre.scrollHeight;
  currentView = 'log';
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.code-editor').forEach(e => e.classList.remove('active'));
    document.getElementById(tab.dataset.target).classList.add('active');

    // Refresh the active editor
    if (editorsInitialized) {
      setTimeout(() => {
        if (jsEditor) jsEditor.refresh();
        if (cssEditor) cssEditor.refresh();
      }, 10);
    }
  });
});

backBtn.addEventListener('click', () => {
  if (currentView === 'editor') showLanding();
  if (currentView === 'log') showLanding();
});

document.getElementById('edit-btn').addEventListener('click', showEditor);
logBtn.addEventListener('click', showLog);
clearBtn.addEventListener('click', clearLogs);

// Chunk functions
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

function saveData(host, data, cb) {
  const totalSize = (data.js || '').length + (data.css || '').length;
  log('popup', `SAVE: Starting chunked save for ${host} (raw size: ${totalSize} chars)`);

  const encodedJs = encodeScript(data.js || '');
  const encodedCss = encodeScript(data.css || '');
  log('popup', `SAVE: Encoded JS (${encodedJs.length} chars), CSS (${encodedCss.length} chars)`);

  const sets = {};
  sets[`${host}_enabled`] = data.enabled;
  chunkAndSet(`${host}_js`, encodedJs, sets);
  chunkAndSet(`${host}_css`, encodedCss, sets);

  if (totalSize > 100000) {
    log('popup', 'SAVE: Large script detected (>100KB) - using chunks + base64');
  }

  chrome.storage.sync.set(sets, () => {
    log('popup', `SAVE: Chunked save complete for ${host}`);
    if (cb) cb();
  });
}

function loadField(baseKey, cb) {
  chrome.storage.sync.get(`${baseKey}_chunks`, items => {
    const numChunks = items[`${baseKey}_chunks`] || 0;
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

function loadData(host, callback) {
  log('popup', `LOAD: Starting load for ${host}`);

  chrome.storage.sync.get(host, items => {
    if (items[host]) {
      const oldData = items[host];
      log('popup', `LOAD: Old format found, migrating for ${host}`);
      saveData(host, oldData, () => {
        chrome.storage.sync.remove(host, () => {
          log('popup', `LOAD: Migration complete for ${host}`);
          callback(oldData);
        });
      });
      return;
    }

    log('popup', `LOAD: Loading chunked format for ${host}`);
    chrome.storage.sync.get(`${host}_enabled`, en => {
      const enabled = en[`${host}_enabled`] === true;
      loadField(`${host}_js`, encodedJs => {
        const js = decodeScript(encodedJs);
        loadField(`${host}_css`, encodedCss => {
          const css = decodeScript(encodedCss);
          const data = { js, css, enabled };
          log('popup', `LOAD: Data loaded for ${host} (js:${js.length}, css:${css.length})`);
          callback(data);
        });
      });
    });
  });
}

async function log(source, message) {
  try {
    const { boost_logs: logs = [] } = await chrome.storage.local.get('boost_logs');
    logs.push({ timestamp: new Date().toISOString(), source, message });
    if (logs.length > MAX_LOGS) logs.shift();
    await chrome.storage.local.set({ boost_logs: logs });
    console.log(`[${source}] ${message}`);
  } catch (e) {
    console.error(`Log failed: ${e}`);
  }
}

function loadLogs() {
  chrome.storage.local.get('boost_logs', ({ boost_logs: logs = [] }) => {
    const recent = logs.slice(-DISPLAY_LOGS).map(l => `[${new Date(l.timestamp).toLocaleString()}] ${l.source}: ${l.message}`).join('\n');
    logPre.textContent = recent || 'No logs yet. Perform actions to generate logs.';
  });
}

function clearLogs() {
  chrome.storage.local.set({ boost_logs: [] }, () => {
    logPre.textContent = 'Logs cleared.';
    log('popup', 'Cleared all logs');
  });
}

// Load data for current domain
function loadSiteData() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      statusText.innerHTML = 'Open a website to boost';
      if (document.querySelector('.actions')) document.querySelector('.actions').style.display = 'none';
      return;
    }

    currentTabId = tab.id;
    try {
      currentHost = new URL(tab.url).hostname;
    } catch (e) {
      currentHost = 'this site';
    }

    loadData(currentHost, (data) => {
      // Initialize editors and set content
      waitForCodeMirror(() => {
        initCodeMirror();

        if (jsEditor) {
          jsEditor.setValue(data.js || '');
        }

        if (cssEditor) {
          cssEditor.setValue(data.css || '');
        }
      });

      isEnabled = data.enabled === true;
      hasContent = (data.js || '').trim().length > 0 || (data.css || '').trim().length > 0;

      statusText.innerHTML = hasContent
        ? `Boost is <strong>${isEnabled ? 'active' : 'paused'}</strong> on <strong>${currentHost}</strong>.`
        : `No Boost script yet for <strong>${currentHost}</strong>. Tap the pen to create one.`;

      updateToggleIcon(isEnabled);
      updateReloadIcon();
      showLanding();
    });
  });
}

loadSiteData();

// Save button
const saveIconHTML = saveBtn.innerHTML;
const checkIconHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

saveBtn.addEventListener('click', () => {
  const jsCode = jsEditor ? jsEditor.getValue() : '';
  const cssCode = cssEditor ? cssEditor.getValue() : '';

  const newHasContent = jsCode.trim().length > 0 || cssCode.trim().length > 0;
  const newEnabled = newHasContent ? isEnabled : false;

  saveData(currentHost, { js: jsCode, css: cssCode, enabled: newEnabled }, () => {
    hasContent = newHasContent;
    isEnabled = newEnabled;

    statusText.innerHTML = hasContent
      ? `Boost is <strong>${isEnabled ? 'active' : 'paused'}</strong> on <strong>${currentHost}</strong>.`
      : `No Boost script yet for <strong>${currentHost}</strong>. Tap the pen to create one.`;

    updateToggleIcon(isEnabled);
    updateReloadIcon();

    saveBtn.innerHTML = checkIconHTML;
    setTimeout(() => saveBtn.innerHTML = saveIconHTML, 1500);
  });
});

// Toggle enable/disable
toggleBtn.addEventListener('click', () => {
  isEnabled = !isEnabled;

  statusText.innerHTML = hasContent
    ? `Boost is <strong>${isEnabled ? 'active' : 'paused'}</strong> on <strong>${currentHost}</strong>.`
    : `No Boost script yet for <strong>${currentHost}</strong>. Tap the pen to create one.`;

  updateToggleIcon(isEnabled);

  const jsCode = jsEditor ? jsEditor.getValue() : '';
  const cssCode = cssEditor ? cssEditor.getValue() : '';

  saveData(currentHost, { js: jsCode, css: cssCode, enabled: isEnabled }, () => { });

  chrome.tabs.reload(currentTabId);
});

// Reload page button
reloadBtn.addEventListener('click', () => {
  if (!hasContent) {
    chrome.tabs.reload(currentTabId);
  } else {
    const newEnabled = true;
    isEnabled = newEnabled;
    const jsCode = jsEditor ? jsEditor.getValue() : '';
    const cssCode = cssEditor ? cssEditor.getValue() : '';
    saveData(currentHost, { js: jsCode, css: cssCode, enabled: newEnabled }, () => {
      updateReloadIcon();
      chrome.tabs.reload(currentTabId);
    });
  }
});

// Keyboard shortcuts
if (!window.isMobileDevice) {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (currentView === 'editor') {
        saveBtn.click();
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      if (currentView === 'editor') {
        reloadBtn.click();
      }
    }
  });
}
