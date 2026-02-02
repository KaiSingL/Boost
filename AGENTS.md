# Boost Browser Extension - Agent Guidelines

## Project Overview

This is a **Chrome Extension (Manifest V3)** that allows users to inject custom JavaScript and CSS per domain. It's a vanilla JavaScript project with no build tools or dependencies.

## Build/Test Commands

### Build/Packaging
```powershell
# Create distribution zip (excludes examples, .gitignore, README.md)
./zipper.ps1
```

### Manual Testing
1. **Load extension in Chrome:**
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this folder

2. **Test on a website:**
   - Navigate to any website (e.g., example.com)
   - Click the Boost extension icon
   - Add test JavaScript/CSS and verify injection

3. **Debug:**
   - Right-click extension icon → "Inspect popup" for popup.js debugging
   - Open page DevTools for content.js debugging
   - Background script logs: `chrome://extensions` → "service worker" link

## Code Style Guidelines

### JavaScript

**General:**
- Use `"use strict"`; at the top of all JS files
- Use ES6+ features (const/let, arrow functions, async/await)
- Prefer `const` for variables that don't change, `let` for those that do

**Naming Conventions:**
- camelCase for variables and functions: `currentHost`, `loadData()`
- PascalCase for constructors/classes (rare in this codebase)
- UPPER_SNAKE_CASE for constants: `CHUNK_SIZE`, `MAX_LOGS`
- Descriptive names: `isEnabled`, `hasContent`, `encodedJs`

**Functions:**
- Use async/await for asynchronous operations
- Callback pattern for storage APIs where needed
- Early returns for guard clauses

```javascript
// Good
async function loadCode(baseKey) {
  const countKey = `${baseKey}_chunks`;
  const { [countKey]: count = 0 } = await chrome.storage.sync.get(countKey);
  if (count === 0) return '';
  // ... rest
}

// Good - callback style for storage
function loadField(baseKey, cb) {
  chrome.storage.sync.get(`${baseKey}_chunks`, items => {
    const numChunks = items[`${baseKey}_chunks`] || 0;
    if (numChunks === 0) {
      cb('');
      return;
    }
    // ... rest
  });
}
```

**Error Handling:**
- Use try/catch for decoding operations
- Provide fallback behavior
- Log errors with context

```javascript
try {
  return decodeURIComponent(escape(atob(encoded)));
} catch (e) {
  console.warn('Decode failed, using raw:', e);
  try {
    return atob(encoded);
  } catch (e2) {
    console.error('Raw decode failed:', e2);
    return encoded;
  }
}
```

### Storage & Data Handling

**Chunked Storage Pattern:**
Scripts are stored in chunks due to Chrome storage limits:
```javascript
const CHUNK_SIZE = 7000;

// Keys: `${host}_js_chunks`, `${host}_js_0`, `${host}_js_1`, etc.
// CSS: `${host}_css_chunks`, `${host}_css_0`, etc.
// Enabled: `${host}_enabled`
```

**Orion Browser Special Handling:**
Orion on iOS has a bug where `chrome.storage.sync` and `chrome.storage.local` share the same storage space, causing data corruption and loss. The extension detects Orion and automatically switches to `chrome.storage.local` to avoid this issue.

```javascript
// Orion detection
const isOrionBrowser = /Orion/i.test(navigator.userAgent) || 
  (navigator.userAgent.includes('AppleWebKit') && !navigator.userAgent.includes('Chrome') && 
   /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent));

// Use local storage for Orion
const storageApi = isOrionBrowser ? chrome.storage.local : chrome.storage.sync;
const STORAGE_TYPE = isOrionBrowser ? 'local' : 'sync';
```

All three main files (popup.js, background.js, content.js) use the same `storageApi` variable to ensure consistent storage behavior across the extension.

**Base64 Encoding:**
All scripts are base64-encoded with Unicode support:
```javascript
function encodeScript(script) {
  try {
    return btoa(unescape(encodeURIComponent(script)));
  } catch (e) {
    return btoa(script);
  }
}

function decodeScript(encoded) {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch (e) {
    return atob(encoded);
  }
}
```

### Chrome Extension APIs

**Script Injection (background.js):**
```javascript
// CSS injection
chrome.scripting.insertCSS({ target, css: cssCode })

// JS injection in MAIN world (CSP bypass)
chrome.scripting.executeScript({
  target: { tabId, frameIds: [frameId] },
  world: "MAIN",
  func: function(code, host) { /* ... */ },
  args: [jsCode, hostname]
})
```

**Message Passing:**
```javascript
// Sending
chrome.runtime.sendMessage({ type: 'log', source, message })

// Listening
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'log') {
    log(request.source, request.message);
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async
});
```

### Logging

Use the centralized log function for consistency:
```javascript
async function log(source, message) {
  const { boost_logs: logs = [] } = await chrome.storage.local.get('boost_logs');
  logs.push({ timestamp: new Date().toISOString(), source, message });
  if (logs.length > MAX_LOGS) logs.shift();
  await chrome.storage.local.set({ boost_logs: logs });
}
```

Log sources: `'popup'`, `'background'`, `'content'`

### HTML/CSS

**Mobile-First Responsiveness:**
- Desktop: Fixed width `600px`
- Mobile: Full viewport with `body.mobile` class
- Mobile detection runs immediately in `<script>` before layout

```javascript
// Mobile detection (place at top of popup.js)
(function () {
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document);
  if (isMobileDevice) {
    document.documentElement.classList.add('mobile');
    document.body.classList.add('mobile');
  }
  window.isMobileDevice = isMobileDevice;
})();
```

### File Organization

```
/
├── manifest.json          # Extension manifest (v3)
├── background.js          # Service worker - desktop injection
├── content.js            # Content script - mobile injection
├── popup.html            # Popup UI
├── popup.js              # Popup logic
├── lib/codemirror/       # Code editor library
├── icons/                # Extension icons (16, 48, 128px)
├── examples/             # Example scripts (not in zip)
└── zipper.ps1           # Build script
```

### Code Comments

- Use comments to explain WHY, not WHAT
- Document complex logic and workarounds
- Keep comments concise

```javascript
// CSP bypass: Inject script in MAIN world to access page context
// See: https://developer.chrome.com/docs/extensions/mv3/content_scripts/
```

### Version Management

Update version in `manifest.json` following semver:
```json
{
  "version": "2.2.0"
}
```

## Testing Checklist

Before releasing:
- [ ] Extension loads without errors
- [ ] JS injection works on test sites
- [ ] CSS injection works on test sites
- [ ] Mobile detection works (test in mobile viewport)
- [ ] Large scripts (>100KB) save/load correctly
- [ ] Toggle enable/disable works
- [ ] Logs appear in log view
- [ ] Zip file created by `zipper.ps1` loads correctly
