"use strict";

// Mobile Detection Script - Runs immediately, no layout flash
(function () {
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                         (/Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document); // iPadOS

  if (isMobileDevice) {
    document.documentElement.classList.add('mobile');
    document.body.classList.add('mobile');
  }

  // Expose for use in functions
  window.isMobileDevice = isMobileDevice;
})();

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.code-editor').forEach(e => e.classList.remove('active'));
    document.getElementById(tab.dataset.target).classList.add('active');

    // New: trigger immediate highlight when switching tabs
    highlightCurrentEditor();
  });
});

let currentHost = null;
let currentTabId = null;
let isEnabled = false;
let hasContent = false;
let currentView = 'landing'; // Track current view: 'landing', 'editor', 'log'

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

// Constants for chunking (desktop only)
const CHUNK_SIZE = 7000; // Safe character limit per chunk to stay under 8192 bytes (accounts for JSON overhead)
const MAX_LOGS = 500; // Max logs to store
const DISPLAY_LOGS = 100; // Last N to display

// Helper: highlight the currently visible editor
function highlightCurrentEditor() {
  const activeEditor = document.querySelector('.code-editor.active');
  if (!activeEditor) return;
  const textarea = activeEditor.querySelector('textarea');
  const code = activeEditor.querySelector('code');
  if (code && textarea) {
    code.textContent = textarea.value || '';
    Prism.highlightElement(code);
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

  // Critical: highlight immediately when entering editor
  highlightCurrentEditor();
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
  logPre.scrollTop = logPre.scrollHeight; // Auto-scroll to bottom
  currentView = 'log';
}

backBtn.addEventListener('click', () => {
  if (currentView === 'editor') showLanding();
  if (currentView === 'log') showLanding();
});

document.getElementById('edit-btn').addEventListener('click', showEditor);
logBtn.addEventListener('click', showLog);
clearBtn.addEventListener('click', clearLogs);

// Editors sync & Tab key support
document.querySelectorAll('.code-editor').forEach(editor => {
  const textarea = editor.querySelector('textarea');
  const code = editor.querySelector('code');
  const pre = editor.querySelector('pre');

  const sync = () => {
    if (code) code.textContent = textarea?.value || '';
    Prism.highlightElement(code);
  };

  textarea.addEventListener('input', sync);
  textarea.addEventListener('scroll', () => {
    if (pre) pre.scrollTop = textarea.scrollTop;
    if (pre) pre.scrollLeft = textarea.scrollLeft;
  });

  textarea.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + "  " + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      sync();
    }
  });

  // Initial sync for each editor (runs once on load)
  sync();
});

// Function to chunk a string and add to sets object (desktop only)
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

// Function to save data: simple on mobile, chunked on desktop
function saveData(host, data, cb) {
  const mobile = window.isMobileDevice;
  log('popup', `SAVE: Starting save for ${host} (mobile: ${mobile})`);

  if (mobile) {
    // Simple old format for mobile/Orion compatibility
    if ((data.js || '').length + (data.css || '').length > 100000) {
      log('popup', 'SAVE: Data too large for mobile simple format (>100KB), consider desktop');
    }
    chrome.storage.sync.set({ [host]: data }, () => {
      log('popup', `SAVE: Simple save complete for ${host}`);
      if (cb) cb();
    });
  } else {
    // Chunked format for desktop
    const sets = {};
    sets[`${host}_enabled`] = data.enabled;
    chunkAndSet(`${host}_js`, data.js, sets);
    chunkAndSet(`${host}_css`, data.css, sets);
    chrome.storage.sync.set(sets, () => {
      log('popup', `SAVE: Chunked save complete for ${host}`);
      if (cb) cb();
    });
  }
}

// Function to load a chunked field (desktop fallback)
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

// Function to load site data (with mobile-aware migration)
function loadData(host, callback) {
  const mobile = window.isMobileDevice;
  log('popup', `LOAD: Starting load for ${host} (mobile: ${mobile})`);

  chrome.storage.sync.get(host, items => {
    if (items[host]) {
      // Old single-key format found
      const oldData = items[host];
      if (mobile) {
        // On mobile: no migration, use directly
        log('popup', `LOAD: Using old format directly (mobile) for ${host}`);
        callback(oldData);
        return;
      }
      // Desktop: migrate to split/chunked
      log('popup', `LOAD: Migrating old format for ${host}`);
      saveData(host, oldData, () => {
        chrome.storage.sync.remove(host, () => {
          log('popup', `LOAD: Migration complete for ${host}`);
          callback(oldData); // Use old data for now; next load will be chunked
        });
      });
      return;
    }

    // No old format: load from split/chunked (or default)
    log('popup', `LOAD: Loading chunked format for ${host}`);
    chrome.storage.sync.get(`${host}_enabled`, en => {
      const enabled = en[`${host}_enabled`] === true;
      loadField(`${host}_js`, js => {
        loadField(`${host}_css`, css => {
          const data = { js, css, enabled };
          log('popup', `LOAD: Chunked data loaded for ${host} (js:${js.length}, css:${css.length})`);
          callback(data);
        });
      });
    });
  });
}

// Centralized log function for popup
async function log(source, message) {
  try {
    const { boost_logs: logs = [] } = await chrome.storage.local.get('boost_logs');
    logs.push({ timestamp: new Date().toISOString(), source, message });
    if (logs.length > MAX_LOGS) logs.shift();
    await chrome.storage.local.set({ boost_logs: logs });
    console.log(`[${source}] ${message}`); // Plain console for popup
  } catch (e) {
    console.error(`Log failed: ${e}`);
  }
}

// Load and display logs
function loadLogs() {
  chrome.storage.local.get('boost_logs', ({ boost_logs: logs = [] }) => {
    const recent = logs.slice(-DISPLAY_LOGS).map(l => `[${new Date(l.timestamp).toLocaleString()}] ${l.source}: ${l.message}`).join('\n');
    logPre.textContent = recent || 'No logs yet. Perform actions to generate logs.';
  });
}

// Clear logs
function clearLogs() {
  chrome.storage.local.set({ boost_logs: [] }, () => {
    logPre.textContent = 'Logs cleared.';
    log('popup', 'Cleared all logs');
  });
}

// Load data for current domain
function loadSiteData() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
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
      const jsTextarea = document.querySelector('#js-editor textarea');
      const cssTextarea = document.querySelector('#css-editor textarea');

      if (jsTextarea) jsTextarea.value = data.js || '';
      if (cssTextarea) cssTextarea.value = data.css || '';

      isEnabled = data.enabled === true;
      hasContent = (data.js || '').trim().length > 0 || (data.css || '').trim().length > 0;

      statusText.innerHTML = hasContent
        ? `Boost is <strong>${isEnabled ? 'active' : 'paused'}</strong> on <strong>${currentHost}</strong>.`
        : `No Boost script yet for <strong>${currentHost}</strong>. Tap the pen to create one.`;

      updateToggleIcon(isEnabled);
      showLanding();

      // Critical: immediately highlight both editors after loading saved code
      highlightCurrentEditor();
    });
  });
}

loadSiteData();

// Save button with check flash
const saveIconHTML = saveBtn.innerHTML;
const checkIconHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

saveBtn.addEventListener('click', () => {
  const jsTextarea = document.querySelector('#js-editor textarea');
  const cssTextarea = document.querySelector('#css-editor textarea');

  const jsCode = jsTextarea ? jsTextarea.value : '';
  const cssCode = cssTextarea ? cssTextarea.value : '';

  const newHasContent = jsCode.trim().length > 0 || cssCode.trim().length > 0;
  const newEnabled = newHasContent ? isEnabled : false;

  saveData(currentHost, { js: jsCode, css: cssCode, enabled: newEnabled }, () => {
    hasContent = newHasContent;
    isEnabled = newEnabled;

    statusText.innerHTML = hasContent
      ? `Boost is <strong>${isEnabled ? 'active' : 'paused'}</strong> on <strong>${currentHost}</strong>.`
      : `No Boost script yet for <strong>${currentHost}</strong>. Tap the pen to create one.`;

    updateToggleIcon(isEnabled);

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

  // Pull current JS/CSS from textareas and save full data (simple and consistent)
  const jsCode = document.querySelector('#js-editor textarea').value;
  const cssCode = document.querySelector('#css-editor textarea').value;

  saveData(currentHost, { js: jsCode, css: cssCode, enabled: isEnabled }, () => {});

  chrome.tabs.reload(currentTabId);
});

// Reload page button
reloadBtn.addEventListener('click', () => {
  chrome.tabs.reload(currentTabId);
});