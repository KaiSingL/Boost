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
let lastModified = null;

// DOM elements
const landing = document.getElementById('landing');
const editorView = document.getElementById('editor-view');
const logView = document.getElementById('log-view');
const toolBar = document.getElementById('toolbar');
const backBtn = document.getElementById('back-btn');
const saveBtn = document.getElementById('save-btn');
const reloadBtn = document.getElementById('reload-btn');
const clearBtn = document.getElementById('clear-btn');
const logPre = document.getElementById('log-pre');
const logBtn = document.getElementById('log-btn');

// Status elements
const mainLed = document.getElementById('main-led');
const mainStatusText = document.getElementById('main-status-text');
const toolbarLed = document.getElementById('toolbar-led');
const toolbarStatusText = document.getElementById('toolbar-status-text');
const toolbarStatus = document.getElementById('toolbar-status');
const domainText = document.getElementById('domain-text');
const emptyDomain = document.getElementById('empty-domain');
const sizeText = document.getElementById('size-text');
const modifiedText = document.getElementById('modified-text');
const componentsText = document.getElementById('components-text');

// Panels
const emptyState = document.getElementById('empty-state');
const actionPanel = document.getElementById('action-panel');
const createPanel = document.getElementById('create-panel');

// Action buttons
const toggleBtn = document.getElementById('toggle-btn');
const toggleText = document.getElementById('toggle-text');
const editBtn = document.getElementById('edit-btn');
const createBtn = document.getElementById('create-btn');

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

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now';
  // Less than 1 hour
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
  // Less than 24 hours
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' hr ago';
  // Less than 7 days
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' days ago';
  
  return date.toLocaleDateString();
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

// LED Status Updates
function updateStatusLED(enabled, hasScript) {
  if (!hasScript) {
    // No script state
    mainLed.classList.remove('active');
    mainStatusText.textContent = 'NO SCRIPT';
    if (toolbarLed) {
      toolbarLed.classList.remove('active');
      toolbarStatusText.textContent = 'NO SCRIPT';
    }
  } else if (enabled) {
    // Active state
    mainLed.classList.add('active');
    mainStatusText.textContent = 'ACTIVE';
    if (toolbarLed) {
      toolbarLed.classList.add('active');
      toolbarStatusText.textContent = 'ACTIVE';
    }
  } else {
    // Paused state
    mainLed.classList.remove('active');
    mainStatusText.textContent = 'PAUSED';
    if (toolbarLed) {
      toolbarLed.classList.remove('active');
      toolbarStatusText.textContent = 'PAUSED';
    }
  }
}

function updateToggleButton(enabled) {
  if (enabled) {
    toggleBtn.classList.add('active');
    toggleText.textContent = 'ENABLED';
  } else {
    toggleBtn.classList.remove('active');
    toggleText.textContent = 'DISABLED';
  }
}

function updateTechnicalInfo(jsCode, cssCode) {
  const jsSize = jsCode ? new Blob([jsCode]).size : 0;
  const cssSize = cssCode ? new Blob([cssCode]).size : 0;
  const totalSize = jsSize + cssSize;
  
  sizeText.textContent = formatBytes(totalSize);
  componentsText.textContent = `JS: ${formatBytes(jsSize)} | CSS: ${formatBytes(cssSize)}`;
  
  if (lastModified) {
    modifiedText.textContent = formatDate(lastModified);
  }
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
  toolbarStatus.style.display = 'none';
  currentView = 'landing';
  
  // Update visibility based on hasContent
  updateLandingVisibility();
}

function updateLandingVisibility() {
  if (hasContent) {
    emptyState.style.display = 'none';
    createPanel.style.display = 'none';
    actionPanel.style.display = 'flex';
  } else {
    emptyState.style.display = 'flex';
    createPanel.style.display = 'flex';
    actionPanel.style.display = 'none';
  }
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
  toolbarStatus.style.display = 'flex';

  // Initialize editors if not already done
  if (!editorsInitialized) {
    waitForCodeMirror(() => {
      initCodeMirror();
      if (jsEditor) jsEditor.refresh();
      if (cssEditor) cssEditor.refresh();
    });
  } else {
    if (jsEditor) jsEditor.refresh();
    if (cssEditor) cssEditor.refresh();
  }

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
  toolbarStatus.style.display = 'none';

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

editBtn.addEventListener('click', showEditor);
createBtn.addEventListener('click', showEditor);
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
  sets[`${host}_modified`] = new Date().toISOString();
  chunkAndSet(`${host}_js`, encodedJs, sets);
  chunkAndSet(`${host}_css`, encodedCss, sets);

  if (totalSize > 100000) {
    log('popup', 'SAVE: Large script detected (>100KB) - using chunks + base64');
  }

  chrome.storage.sync.set(sets, () => {
    log('popup', `SAVE: Chunked save complete for ${host}`);
    lastModified = sets[`${host}_modified`];
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
    chrome.storage.sync.get([`${host}_enabled`, `${host}_modified`], items => {
      const enabled = items[`${host}_enabled`] === true;
      lastModified = items[`${host}_modified`] || null;
      
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
      domainText.textContent = 'N/A';
      emptyDomain.textContent = 'this browser page';
      emptyState.style.display = 'flex';
      createPanel.style.display = 'none';
      actionPanel.style.display = 'none';
      updateStatusLED(false, false);
      return;
    }

    currentTabId = tab.id;
    try {
      currentHost = new URL(tab.url).hostname;
    } catch (e) {
      currentHost = 'this site';
    }

    domainText.textContent = currentHost;
    emptyDomain.textContent = currentHost;

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

      // Update UI
      updateStatusLED(isEnabled, hasContent);
      updateToggleButton(isEnabled);
      updateTechnicalInfo(data.js, data.css);
      updateLandingVisibility();
      showLanding();
    });
  });
}

loadSiteData();

// Save button
const saveIconHTML = saveBtn.innerHTML;
const checkIconHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>SAVED</span>`;

saveBtn.addEventListener('click', () => {
  const jsCode = jsEditor ? jsEditor.getValue() : '';
  const cssCode = cssEditor ? cssEditor.getValue() : '';

  const newHasContent = jsCode.trim().length > 0 || cssCode.trim().length > 0;
  const newEnabled = newHasContent ? isEnabled : false;

  saveData(currentHost, { js: jsCode, css: cssCode, enabled: newEnabled }, () => {
    hasContent = newHasContent;
    isEnabled = newEnabled;

    // Update status
    updateStatusLED(isEnabled, hasContent);
    updateToggleButton(isEnabled);
    updateTechnicalInfo(jsCode, cssCode);

    saveBtn.innerHTML = checkIconHTML;
    setTimeout(() => saveBtn.innerHTML = saveIconHTML, 1500);
  });
});

// Toggle enable/disable
toggleBtn.addEventListener('click', () => {
  isEnabled = !isEnabled;

  updateStatusLED(isEnabled, hasContent);
  updateToggleButton(isEnabled);

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
      updateStatusLED(isEnabled, hasContent);
      updateToggleButton(isEnabled);
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
