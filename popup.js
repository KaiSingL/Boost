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

  // Orion Browser Detection - Add class for CSS targeting
  const isOrionBrowser = /Orion/i.test(navigator.userAgent) ||
    (navigator.userAgent.includes('AppleWebKit') && !navigator.userAgent.includes('Chrome') &&
     /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent));

  if (isOrionBrowser) {
    document.documentElement.classList.add('orion');
    document.body.classList.add('orion');
  }

  window.isOrionBrowser = isOrionBrowser;
})();

// Orion Browser Detection and Storage Strategy
// Orion has a bug where storage.sync and storage.local share the same space
// causing data corruption. We use storage.local for Orion to avoid this.
const isOrionBrowser = /Orion/i.test(navigator.userAgent) || 
  (navigator.userAgent.includes('AppleWebKit') && !navigator.userAgent.includes('Chrome') && 
   /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent));

// Use local storage for Orion to avoid sync/local collision bug
const storageApi = isOrionBrowser ? chrome.storage.local : chrome.storage.sync;
const STORAGE_TYPE = isOrionBrowser ? 'local' : 'sync';

console.log(`Boost: Using ${STORAGE_TYPE} storage${isOrionBrowser ? ' (Orion detected)' : ''}`);

// CodeMirror editor instances
let jsEditor = null;
let cssEditor = null;
let editorsInitialized = false;

// State variables
let currentHost = null;
let currentTabId = null;
let originalHost = null;
let originalTabId = null;
let isEnabled = false;
let hasContent = false;
let currentView = 'landing';
let returnView = 'landing';
let lastModified = null;
let currentTheme = 'system';

// DOM elements
const landing = document.getElementById('landing');
const editorView = document.getElementById('editor-view');
const logView = document.getElementById('log-view');
const scriptsListView = document.getElementById('scripts-list-view');
const toolBar = document.getElementById('toolbar');
const backBtn = document.getElementById('back-btn');
const saveBtn = document.getElementById('save-btn');
const reloadBtn = document.getElementById('reload-btn');
const clearBtn = document.getElementById('clear-btn');
const logPre = document.getElementById('log-pre');
const logBtn = document.getElementById('log-btn');
const manageBtn = document.getElementById('manage-btn');

// Scripts list elements
const scriptsList = document.getElementById('scripts-list');
const scriptsCount = document.getElementById('scripts-count');
const scriptsEmpty = document.getElementById('scripts-empty');

// Delete dialog elements
const deleteDialog = document.getElementById('delete-dialog');
const deleteDialogMessage = document.getElementById('delete-dialog-message');
const deleteCancelBtn = document.getElementById('delete-cancel-btn');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

let deleteTargetHost = null;

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

// Version display
const versionText = document.getElementById('version-text');

// Constants
const CHUNK_SIZE = 7000;
const MAX_LOGS = 500;
const DISPLAY_LOGS = 100;
const THEMES = ['system', 'light', 'dark'];
const THEME_STORAGE_KEY = 'boost_theme';

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

function getEffectiveTheme(theme) {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme(theme) {
  const effectiveTheme = getEffectiveTheme(theme);

  document.body.classList.remove('light-theme', 'dark-theme', 'system-theme');
  document.body.classList.add(theme + '-theme');

  const lightLink = document.getElementById('cm-theme-light');
  const darkLink = document.getElementById('cm-theme-dark');

  if (effectiveTheme === 'light') {
    lightLink.style.display = 'block';
    darkLink.style.display = 'none';
  } else if (effectiveTheme === 'dark') {
    lightLink.style.display = 'none';
    darkLink.style.display = 'block';
  }

  const cmTheme = effectiveTheme === 'dark' ? 'one-dark' : 'tomorrow-light';
  if (jsEditor) jsEditor.setOption('theme', cmTheme);
  if (cssEditor) cssEditor.setOption('theme', cmTheme);

  if (jsEditor) jsEditor.refresh();
  if (cssEditor) cssEditor.refresh();
}

function updateThemeUI(theme) {
  currentTheme = theme;
  
  document.querySelectorAll('.theme-option-btn').forEach(btn => {
    const isActive = btn.dataset.theme === theme;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
  
  applyTheme(theme);
  storageApi.set({ [THEME_STORAGE_KEY]: theme });
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

function initCodeMirror(theme) {
  if (editorsInitialized || typeof CodeMirror === 'undefined') return;

  const effectiveTheme = theme ? getEffectiveTheme(theme) : 'light';
  const cmTheme = effectiveTheme === 'dark' ? 'one-dark' : 'tomorrow-light';

  // Initialize JS editor
  const jsContainer = document.getElementById('js-editor');
  if (jsContainer && !jsEditor) {
    jsEditor = CodeMirror(jsContainer, {
      mode: 'javascript',
      theme: cmTheme,
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentWithTabs: false,
      inputStyle: 'contenteditable', // Better mobile support
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
      theme: cmTheme,
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentWithTabs: false,
      inputStyle: 'contenteditable', // Better mobile support
      extraKeys: {
        'Tab': function(cm) {
          cm.replaceSelection('  ', 'end');
        }
      }
    });
  }

  editorsInitialized = true;
  console.log('CodeMirror editors initialized with theme:', cmTheme);
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
  scriptsListView.classList.remove('active');
  toolBar.style.display = 'none';
  backBtn.style.display = 'none';
  saveBtn.style.display = 'none';
  reloadBtn.style.display = 'none';
  clearBtn.style.display = 'none';
  toolbarStatus.style.display = 'none';
  currentView = 'landing';

  // Restore current domain details
  if (originalHost) {
    currentHost = originalHost;
    currentTabId = originalTabId;
    domainText.textContent = currentHost;
    emptyDomain.textContent = currentHost;
  }

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
  scriptsListView.classList.remove('active');
  toolBar.style.display = 'flex';
  backBtn.style.display = 'flex';
  saveBtn.style.display = 'flex';
  reloadBtn.style.display = 'flex';
  clearBtn.style.display = 'none';
  toolbarStatus.style.display = 'flex';

  // Initialize editors if not already done
  if (!editorsInitialized) {
    waitForCodeMirror(() => {
      initCodeMirror(currentTheme);
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
  logView.classList.remove('active');
  scriptsListView.classList.remove('active');
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

function showScriptsList() {
  landing.classList.remove('active');
  editorView.classList.remove('active');
  logView.classList.remove('active');
  scriptsListView.classList.add('active');
  toolBar.style.display = 'flex';
  backBtn.style.display = 'flex';
  clearBtn.style.display = 'none';
  saveBtn.style.display = 'none';
  reloadBtn.style.display = 'none';
  toolbarStatus.style.display = 'none';

  loadAllScripts();
  currentView = 'scripts-list';
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
  if (currentView === 'editor') {
    if (returnView === 'scripts-list') { showScriptsList(); return; }
    showLanding();
    return;
  }
  showLanding();
});

editBtn.addEventListener('click', () => { returnView = 'landing'; showEditor(); });
createBtn.addEventListener('click', () => { returnView = 'landing'; showEditor(); });
logBtn.addEventListener('click', showLog);
manageBtn.addEventListener('click', showScriptsList);
clearBtn.addEventListener('click', clearLogs);

toggleBtn.addEventListener('click', () => {
  isEnabled = !isEnabled;
  
  updateStatusLED(isEnabled, hasContent);
  updateToggleButton(isEnabled);
  
  const jsCode = jsEditor ? jsEditor.getValue() : '';
  const cssCode = cssEditor ? cssEditor.getValue() : '';
  
  saveData(currentHost, { js: jsCode, css: cssCode, enabled: isEnabled }, (err) => {
    if (err) {
      log('popup', `Toggle save failed for ${currentHost}: ${err.message}`);
    }
  });
  
  chrome.tabs.reload(currentTabId);
});

saveBtn.addEventListener('click', () => {
  const jsCode = jsEditor ? jsEditor.getValue() : '';
  const cssCode = cssEditor ? cssEditor.getValue() : '';
  
  saveData(currentHost, { js: jsCode, css: cssCode, enabled: isEnabled }, (err) => {
    if (err) {
      log('popup', `Save failed for ${currentHost}: ${err.message}`);
    } else {
      log('popup', `Saved script for ${currentHost}`);
      hasContent = jsCode.trim().length > 0 || cssCode.trim().length > 0;
      updateLandingVisibility();
      updateStatusLED(isEnabled, hasContent);
      updateTechnicalInfo(jsCode, cssCode);
      
      // Visual feedback - show "SAVED ✓" for 1.5 seconds
      const originalText = saveBtn.querySelector('span').textContent;
      saveBtn.classList.add('saved');
      saveBtn.querySelector('span').textContent = 'SAVED \u2713';
      
      setTimeout(() => {
        saveBtn.classList.remove('saved');
        saveBtn.querySelector('span').textContent = originalText;
      }, 1500);
    }
  });
});

reloadBtn.addEventListener('click', () => {
  if (currentTabId) {
    chrome.tabs.reload(currentTabId);
    log('popup', `Reloaded tab ${currentTabId}`);
  }
});

// Chunk functions
function chunkAndSet(baseKey, value, sets) {
  const chunkCountKey = `${baseKey}_chunks`;
  
  if (value.length === 0) {
    // Mark for deletion - don't just set count to 0
    sets[chunkCountKey] = 0;
    sets[`${baseKey}_delete_marker`] = true; // Signal to delete old chunks
    return;
  }

  const chunks = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.substring(i, i + CHUNK_SIZE));
  }

  sets[chunkCountKey] = chunks.length;
  chunks.forEach((chunk, i) => {
    sets[`${baseKey}_${i}`] = chunk;
  });
}

function saveData(host, data, cb) {
  const totalSize = (data.js || '').length + (data.css || '').length;
  log('popup', `SAVE: Starting chunked save for ${host} (raw size: ${totalSize} chars)`);
  log('popup', `SAVE: Using ${STORAGE_TYPE} storage API`);

  const encodedJs = encodeScript(data.js || '');
  const encodedCss = encodeScript(data.css || '');
  log('popup', `SAVE: Encoded JS (${encodedJs.length} chars), CSS (${encodedCss.length} chars)`);

  const sets = {};
  const keysToDelete = [];
  sets[`${host}_enabled`] = data.enabled;
  sets[`${host}_modified`] = new Date().toISOString();
  
  // Get chunk info for potential deletion
  chunkAndSet(`${host}_js`, encodedJs, sets);
  chunkAndSet(`${host}_css`, encodedCss, sets);

  // If we're clearing data, collect old chunk keys to delete
  if (sets[`${host}_js_delete_marker`]) {
    // We need to find out how many old chunks exist and delete them
    // For now, we'll delete a reasonable range (up to 100 chunks = ~700KB)
    for (let i = 0; i < 100; i++) {
      keysToDelete.push(`${host}_js_${i}`);
    }
    delete sets[`${host}_js_delete_marker`];
  }
  
  if (sets[`${host}_css_delete_marker`]) {
    for (let i = 0; i < 100; i++) {
      keysToDelete.push(`${host}_css_${i}`);
    }
    delete sets[`${host}_css_delete_marker`];
  }

  const numKeys = Object.keys(sets).length;
  const estimatedSize = JSON.stringify(sets).length;
  log('popup', `SAVE: Preparing to store ${numKeys} keys, ~${estimatedSize} bytes total`);

  if (totalSize > 100000) {
    log('popup', 'SAVE: Large script detected (>100KB) - using chunks + base64');
  }

  // First delete old chunk keys if any, then save new data
  const performSave = () => {
    storageApi.set(sets, () => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;
        log('popup', `SAVE ERROR for ${host}: ${errorMsg}`);
        console.error('Boost save error:', errorMsg);
        if (cb) cb(new Error(errorMsg));
        return;
      }
      log('popup', `SAVE: Chunked save complete for ${host} (${numKeys} keys stored)`);
      lastModified = sets[`${host}_modified`];
      if (cb) cb();
    });
  };

  if (keysToDelete.length > 0) {
    log('popup', `SAVE: Deleting ${keysToDelete.length} old chunk keys`);
    storageApi.remove(keysToDelete, () => {
      if (chrome.runtime.lastError) {
        log('popup', `SAVE WARNING: Error deleting old chunks: ${chrome.runtime.lastError.message}`);
      }
      performSave();
    });
  } else {
    performSave();
  }
}

function loadField(baseKey, cb) {
  storageApi.get(`${baseKey}_chunks`, items => {
    if (chrome.runtime.lastError) {
      const errorMsg = chrome.runtime.lastError.message;
      log('popup', `LOAD ERROR for ${baseKey}_chunks: ${errorMsg}`);
      console.error('Boost load error:', errorMsg);
      cb('');
      return;
    }

    const numChunks = items[`${baseKey}_chunks`] || 0;
    log('popup', `LOAD: ${baseKey} has ${numChunks} chunks`);

    if (numChunks === 0) {
      cb('');
      return;
    }

    const chunkKeys = [];
    for (let i = 0; i < numChunks; i++) {
      chunkKeys.push(`${baseKey}_${i}`);
    }

    storageApi.get(chunkKeys, ch => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;
        log('popup', `LOAD ERROR for ${baseKey} chunks: ${errorMsg}`);
        console.error('Boost load error:', errorMsg);
        cb('');
        return;
      }

      let value = '';
      let missingChunks = 0;
      for (let i = 0; i < numChunks; i++) {
        const chunk = ch[`${baseKey}_${i}`];
        if (chunk) {
          value += chunk;
        } else {
          missingChunks++;
          log('popup', `LOAD WARNING: Missing chunk ${baseKey}_${i}`);
        }
      }

      if (missingChunks > 0) {
        log('popup', `LOAD WARNING: ${missingChunks}/${numChunks} chunks missing for ${baseKey}`);
      } else {
        log('popup', `LOAD: Successfully loaded ${value.length} chars from ${numChunks} chunks for ${baseKey}`);
      }
      cb(value);
    });
  });
}

function loadData(host, callback) {
  log('popup', `LOAD: Starting load for ${host}`);

  storageApi.get(host, items => {
    if (chrome.runtime.lastError) {
      const errorMsg = chrome.runtime.lastError.message;
      log('popup', `LOAD ERROR checking old format for ${host}: ${errorMsg}`);
      console.error('Boost load error:', errorMsg);
      callback({ js: '', css: '', enabled: false });
      return;
    }

    if (items[host]) {
      const oldData = items[host];
      log('popup', `LOAD: Old format found, migrating for ${host}`);
      saveData(host, oldData, (err) => {
        if (err) {
          log('popup', `LOAD: Migration failed for ${host}: ${err.message}`);
          callback(oldData);
          return;
        }
        storageApi.remove(host, () => {
          if (chrome.runtime.lastError) {
            log('popup', `LOAD WARNING: Failed to remove old format for ${host}: ${chrome.runtime.lastError.message}`);
          }
          log('popup', `LOAD: Migration complete for ${host}`);
          callback(oldData);
        });
      });
      return;
    }

    log('popup', `LOAD: Loading chunked format for ${host}`);
    storageApi.get([`${host}_enabled`, `${host}_modified`], items => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;
        log('popup', `LOAD ERROR for ${host} metadata: ${errorMsg}`);
        console.error('Boost load error:', errorMsg);
        callback({ js: '', css: '', enabled: false });
        return;
      }

      const enabled = items[`${host}_enabled`] === true;
      lastModified = items[`${host}_modified`] || null;
      log('popup', `LOAD: ${host} enabled=${enabled}, modified=${lastModified || 'never'}`);
      
      loadField(`${host}_js`, encodedJs => {
        const js = decodeScript(encodedJs);
        loadField(`${host}_css`, encodedCss => {
          const css = decodeScript(encodedCss);
          const data = { js, css, enabled };
          log('popup', `LOAD: Data loaded for ${host} (js:${js.length}, css:${css.length}, enabled:${enabled})`);
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

// Scripts List View
function discoverDomains() {
  return new Promise((resolve) => {
    storageApi.get(null, (allItems) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to scan storage:', chrome.runtime.lastError.message);
        resolve([]);
        return;
      }

      const domains = new Set();
      for (const key of Object.keys(allItems)) {
        // Match ${host}_js_chunks or ${host}_css_chunks
        const match = key.match(/^(.+?)_(js|css)_chunks$/);
        if (match) {
          domains.add(match[1]);
        }
      }

      resolve(Array.from(domains).sort());
    });
  });
}

function deleteScript(host, cb) {
  storageApi.get(null, (allItems) => {
    if (chrome.runtime.lastError) {
      cb(new Error(chrome.runtime.lastError.message));
      return;
    }

    const keysToDelete = [];
    for (const key of Object.keys(allItems)) {
      if (key === `${host}_enabled` ||
          key === `${host}_modified` ||
          key.startsWith(`${host}_js_`) ||
          key.startsWith(`${host}_css_`)) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length === 0) {
      cb();
      return;
    }

    storageApi.remove(keysToDelete, () => {
      if (chrome.runtime.lastError) {
        cb(new Error(chrome.runtime.lastError.message));
        return;
      }
      log('popup', `Deleted all data for ${host} (${keysToDelete.length} keys)`);
      cb();
    });
  });
}

function toggleScript(host, currentState, cb) {
  const newState = !currentState;
  storageApi.set({ [`${host}_enabled`]: newState }, () => {
    if (chrome.runtime.lastError) {
      cb(new Error(chrome.runtime.lastError.message));
      return;
    }
    log('popup', `${host} ${newState ? 'enabled' : 'disabled'}`);
    cb(null, newState);
  });
}

function createScriptRow(host, enabled, modified, jsSize, cssSize) {
  const row = document.createElement('div');
  row.className = 'script-row';
  row.dataset.host = host;

  const totalSize = jsSize + cssSize;

  const statusClass = enabled ? 'active' : '';
  const statusText = enabled ? 'ACTIVE' : 'PAUSED';

  row.innerHTML = `
    <div class="script-row-info">
      <span class="script-row-domain">${host}</span>
      <div class="script-row-meta">
        <span>${formatBytes(totalSize)}</span>
        <span>JS: ${formatBytes(jsSize)}</span>
        <span>CSS: ${formatBytes(cssSize)}</span>
        <span>${formatDate(modified)}</span>
      </div>
    </div>
    <div class="script-row-status">
      <span class="led ${statusClass}"></span>
      <span>${statusText}</span>
    </div>
    <div class="script-row-actions">
      <button class="script-action-btn edit-script" title="Edit">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
      </button>
      <button class="script-action-btn toggle-script ${enabled ? 'toggle-active' : ''}" title="${enabled ? 'Disable' : 'Enable'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
        </svg>
      </button>
      <button class="script-action-btn delete-script" title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `;

  // Edit handler
  row.querySelector('.edit-script').addEventListener('click', (e) => {
    e.stopPropagation();
    editScriptFromList(host);
  });

  // Toggle handler
  row.querySelector('.toggle-script').addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const led = row.querySelector('.script-row-status .led');
    const statusLabel = row.querySelector('.script-row-status span:last-child');

    toggleScript(host, enabled, (err, newState) => {
      if (err) {
        log('popup', `Toggle failed for ${host}: ${err.message}`);
        return;
      }
      enabled = newState;
      led.classList.toggle('active', newState);
      statusLabel.textContent = newState ? 'ACTIVE' : 'PAUSED';
      btn.classList.toggle('toggle-active', newState);
      btn.title = newState ? 'Disable' : 'Enable';
    });
  });

  // Delete handler
  row.querySelector('.delete-script').addEventListener('click', (e) => {
    e.stopPropagation();
    showDeleteDialog(host);
  });

  return row;
}

function editScriptFromList(host) {
  currentHost = host;
  currentTabId = null;

  domainText.textContent = host;
  emptyDomain.textContent = host;

  loadData(host, (data) => {
    waitForCodeMirror(() => {
      initCodeMirror(currentTheme);

      if (jsEditor) jsEditor.setValue(data.js || '');
      if (cssEditor) cssEditor.setValue(data.css || '');
    });

    isEnabled = data.enabled === true;
    hasContent = (data.js || '').trim().length > 0 || (data.css || '').trim().length > 0;

    updateStatusLED(isEnabled, hasContent);
    updateToggleButton(isEnabled);
    updateTechnicalInfo(data.js, data.css);
    returnView = 'scripts-list';
    showEditor();
  });
}

async function loadAllScripts() {
  const domains = await discoverDomains();

  scriptsList.innerHTML = '';
  scriptsCount.textContent = `${domains.length} domain${domains.length !== 1 ? 's' : ''}`;

  if (domains.length === 0) {
    scriptsList.innerHTML = '';
    scriptsList.appendChild(scriptsEmpty);
    scriptsEmpty.style.display = 'flex';
    return;
  }

  scriptsEmpty.style.display = 'none';

  for (const host of domains) {
    const enabledKey = `${host}_enabled`;
    const modifiedKey = `${host}_modified`;

    storageApi.get([enabledKey, modifiedKey], (items) => {
      const enabled = items[enabledKey] === true;
      const modified = items[modifiedKey] || null;

      loadField(`${host}_js`, (encodedJs) => {
        const js = decodeScript(encodedJs);
        const jsSize = js.length;

        loadField(`${host}_css`, (encodedCss) => {
          const css = decodeScript(encodedCss);
          const cssSize = css.length;

          const row = createScriptRow(host, enabled, modified, jsSize, cssSize);
          scriptsList.appendChild(row);
        });
      });
    });
  }
}

// Delete dialog
function showDeleteDialog(host) {
  deleteTargetHost = host;
  deleteDialogMessage.innerHTML = `Delete script for <strong>${host}</strong>?`;
  deleteDialog.style.display = 'flex';
}

function hideDeleteDialog() {
  deleteTargetHost = null;
  deleteDialog.style.display = 'none';
}

deleteCancelBtn.addEventListener('click', hideDeleteDialog);

deleteConfirmBtn.addEventListener('click', () => {
  if (!deleteTargetHost) return;

  const host = deleteTargetHost;
  hideDeleteDialog();

  deleteScript(host, (err) => {
    if (err) {
      log('popup', `Delete failed for ${host}: ${err.message}`);
      return;
    }

    const row = scriptsList.querySelector(`.script-row[data-host="${host}"]`);
    if (row) {
      row.style.opacity = '0';
      row.style.transform = 'translateX(20px)';
      row.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      setTimeout(() => {
        row.remove();
        const remaining = scriptsList.querySelectorAll('.script-row').length;
        scriptsCount.textContent = `${remaining} domain${remaining !== 1 ? 's' : ''}`;
        if (remaining === 0) {
          scriptsEmpty.style.display = 'flex';
          scriptsList.appendChild(scriptsEmpty);
        }
      }, 200);
    }
  });
});

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

    originalHost = currentHost;
    originalTabId = currentTabId;

    domainText.textContent = currentHost;
    emptyDomain.textContent = currentHost;

    loadData(currentHost, (data) => {
      // Initialize editors and set content
      waitForCodeMirror(() => {
        initCodeMirror(currentTheme);

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

// Load version from manifest
function loadVersion() {
  try {
    const manifest = chrome.runtime.getManifest();
    if (manifest && manifest.version) {
      versionText.textContent = 'v' + manifest.version;
    }
  } catch (e) {
    console.log('Could not load version:', e);
  }
}

loadVersion();

// Initialize theme toggle
document.querySelectorAll('.theme-option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    updateThemeUI(btn.dataset.theme);
  });
});

// Load saved theme or default to system
storageApi.get(THEME_STORAGE_KEY, ({ [THEME_STORAGE_KEY]: savedTheme }) => {
  const theme = savedTheme || 'system';
  updateThemeUI(theme);
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
