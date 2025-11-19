"use strict";

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.code-editor').forEach(e => e.classList.remove('active'));
    document.getElementById(tab.dataset.target).classList.add('active');
  });
});

let currentHost = null;
let currentTabId = null;
let isEnabled = false;
let hasContent = false;

const toggleBtn = document.getElementById('toggle-btn');
const playIcon = toggleBtn.querySelector('.play-icon');
const pauseIcon = toggleBtn.querySelector('.pause-icon');
const landing = document.getElementById('landing');
const editorView = document.getElementById('editor-view');
const toolBar = document.getElementById('toolbar');
const backBtn = document.getElementById('back-btn');
const saveBtn = document.getElementById('save-btn');
const reloadBtn = document.getElementById('reload-btn');
const statusText = document.getElementById('status-text');

function updateToggleIcon(enabled) {
  playIcon.style.display = enabled ? 'none' : 'block';
  pauseIcon.style.display = enabled ? 'block' : 'none';
  toggleBtn.style.backgroundColor = enabled ? '#0d6efd' : 'white';
  toggleBtn.style.color = enabled ? 'white' : '#0d6efd';
}

function showLanding() {
  landing.classList.add('active');
  editorView.classList.remove('active');
  toolBar.style.display = 'none';
  backBtn.style.display = 'none';
  saveBtn.style.display = 'none';
  reloadBtn.style.display = 'none';
  toggleBtn.style.display = hasContent ? 'flex' : 'none';
}

function showEditor() {
  landing.classList.remove('active');
  editorView.classList.add('active');
  toolBar.style.display = 'flex';
  backBtn.style.display = 'flex';
  saveBtn.style.display = 'flex';
  reloadBtn.style.display = 'flex';
  toggleBtn.style.display = hasContent ? 'flex' : 'none';
}

backBtn.addEventListener('click', showLanding);
document.getElementById('edit-btn').addEventListener('click', showEditor);

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

  sync();
});

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

    chrome.storage.sync.get([currentHost], (items) => {
      const data = items[currentHost] || { js: '', css: '', enabled: false };

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

      // Safe highlight
      document.querySelectorAll('.code-editor code').forEach(codeEl => {
        if (codeEl && codeEl.parentElement) {
          codeEl.textContent = codeEl.parentElement.querySelector('textarea')?.value || '';
          Prism.highlightElement(codeEl);
        }
      });
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

  const saveObj = {};
  saveObj[currentHost] = { js: jsCode, css: cssCode, enabled: newEnabled };

  chrome.storage.sync.set(saveObj, () => {
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

  const saveObj = {};
  chrome.storage.sync.get([currentHost], (items) => {
    saveObj[currentHost] = { ...items[currentHost], enabled: isEnabled };
    chrome.storage.sync.set(saveObj);
  });

  chrome.tabs.reload(currentTabId);
});

// Reload page button
reloadBtn.addEventListener('click', () => {
  chrome.tabs.reload(currentTabId);
});