# Boost - Browser Extension

A powerful, mobile-friendly browser extension that allows you to edit and inject custom JavaScript and CSS on any website per-domain.

## ✨ Features

### Core Features
- **Cross-Platform Compatibility**: Works seamlessly on both desktop browsers and mobile browsers including Orion on iOS (scripts stored locally on every browser)
- **Per-Domain Customization**: Apply different JavaScript and CSS scripts to different websites
- **Real-time Injection**: Scripts are injected immediately when enabled
- **Syntax Highlighting**: Code editors with JavaScript and CSS syntax highlighting using CodeMirror
- **Mobile-Optimized UI**: Responsive interface that adapts to mobile screens with touch-friendly controls
- **Toggle Control**: Easily enable/disable scripts for any domain
- **Persistent Storage**: Your scripts are saved across browser sessions

### Advanced Features
- **CSP Bypass**: Inject scripts on sites with strict Content Security Policy using Chrome's scripting API
- **Large Script Support**: Chunked storage in `chrome.storage.local` (10MB) comfortably handles scripts larger than 100KB
- **Dual Injection Architecture**: Separate injection methods for desktop (background script) and mobile (content script)
- **Comprehensive Logging**: Real-time log viewing with persistent storage across all components
- **Auto Migration**: Seamless migration from the legacy single-key format, plus a one-time copy of old sync storage into local
- **Base64 Encoding**: Proper handling of Unicode and special characters in scripts

## 🚀 Quick Start

### Installation
#### Desktop Browsers (Chrome, Firefox, Edge, etc.)

1. **Download the extension files**
   ```bash
   git clone https://github.com/KaiSingL/Boost.git
   cd boost
   ```

2. **Open browser extensions page**
   - Chrome: `chrome://extensions`
   - Firefox: `about:addons`
   - Edge: `edge://extensions`

3. **Enable Developer mode**
   - Toggle the "Developer mode" switch

4. **Load unpacked extension**
   - Click "Load unpacked" (Chrome) or "Add to Firefox" (Firefox)
   - Select the extension folder

#### Mobile Browsers (Orion on iOS)

1. **On your Mac, prepare for import**
   - Open Safari and navigate to `safari://extensions`
   - Enable "Allow extensions from other websites" in Develop menu
   - Click "Import Extension" and select the extension folder

2. **Sync to iOS device**
   - The extension will sync via iCloud
   - Ensure iCloud sync is enabled on both devices

3. **Enable in Orion browser**
   - Open Orion on your iOS device
   - Go to Settings → Extensions
   - Enable Boost extension

### Basic Usage
1. Open any website in your browser
2. Click the Boost extension icon
3. View current status for the domain
4. Create/edit scripts using the built-in editor
5. Toggle scripts on/off as needed

## 📱 Examples & Use Cases

### Hacker News Modernizer
Transforms classic Hacker News into a modern, responsive interface with:
- Dark/light theme toggle
- Card-based layout
- Mobile navigation menu
- Enhanced typography

**Key Features Demonstrated:**
- DOM manipulation and restructuring
- Theme switching with localStorage persistence
- Mobile-responsive design patterns
- Event handling and interactive elements

### Ad Element Remover
CSP-compliant solution for removing unwanted elements:
- Targeted element removal by ID/class
- Periodic cleanup for dynamic content
- Memory-efficient blob URL injection
- Comprehensive logging

**Key Features Demonstrated:**
- Advanced CSP bypass techniques
- Robust element targeting and removal
- Memory-efficient blob URL handling
- Error handling and fallback mechanisms

### Custom Site Enhancements
Common use cases users might implement:
- Custom CSS for better readability
- JavaScript for enhanced functionality
- Theme customization
- Feature removal or modification
- Performance optimizations

## 🔧 Advanced Features

### CSP Bypass Technology
Boost uses Chrome's `chrome.scripting` API to inject scripts even on sites with strict Content Security Policies:

```javascript
// JavaScript injection with MAIN world access
chrome.scripting.executeScript({
  target: { tabId, frameIds: [frameId] },
  world: "MAIN",
  func: function(code, host) {
    // Script execution in page context
  },
  args: [jsCode, hostname]
});

// CSS injection with full CSP bypass
chrome.scripting.insertCSS({
  target: { tabId, frameIds: [frameId] },
  css: cssCode
});
```

### Chunked Storage System
Large scripts are automatically split into 7000-character chunks:
- Base64 encoding for Unicode support
- Automatic migration from the old single-key format
- Local storage quota (10MB in Chrome 114+) with a pre-flight check for oversized saves
- Write-before-cleanup saves, so a failed write never deletes existing scripts

### Storage Model (local-only)
All extension data (scripts, enabled flags, theme) lives in `chrome.storage.local` via the shared `storage.js` layer:
- **No 100KB cloud limit**: desktop builds previously used `chrome.storage.sync`, which fails large saves with `Resource::kQuotaBytes quota exceeded`
- **One-time migration**: on update, any existing `chrome.storage.sync` data is copied into local and marked as migrated; the old sync copy is kept as a backup
- **No cross-device sync**: scripts stay on the device where they were created
- **Orion-safe**: Orion on iOS has a bug where `storage.sync` and `storage.local` share one space; using local only avoids it entirely

### Mobile Optimization
- Dual detection system for comprehensive mobile device identification
- Touch-friendly interface with larger controls
- Responsive layout with safe area padding
- Optimized injection pipeline for mobile browsers

## 📖 Usage Guide

### Interface Overview
- **Landing View**: Current status and quick actions
- **Editor View**: Code editing with syntax highlighting
- **Log View**: Real-time debugging information

### Creating Scripts
1. Navigate to your target website
2. Click the Boost extension icon
3. Tap the edit button (pen icon)
4. Switch between JavaScript and CSS tabs
5. Write your code with syntax highlighting
6. Click save to persist changes

### Managing Scripts
- **Enable/Disable**: Use the play/pause button
- **Domain-specific**: Each site maintains its own script set
- **Real-time Changes**: Scripts apply immediately when toggled
- **Page Reload**: Use the reload button to force reapplication

## 🔍 Troubleshooting

### Common Issues

#### Extension Not Loading
- **Issue**: Extension fails to load in browser
- **Solutions**:
  - Ensure all files are present in the extension folder
  - Check browser console for errors (F12 → Console)
  - Verify manifest.json syntax is correct
  - Try removing and re-adding the extension

#### Scripts Not Applying
- **Issue**: Scripts don't execute on target sites
- **Solutions**:
  - Verify extension is enabled (play icon visible)
  - Check for syntax errors in your code
  - Try reloading the page using the extension's reload button
  - Check site console for injection errors
  - Ensure the site allows script injection

#### Mobile Interface Issues
- **Issue**: Extension doesn't work properly on mobile
- **Solutions**:
  - Verify proper installation steps were followed
  - Check that Orion browser has extension permissions
  - Ensure iCloud sync is enabled and working
  - Try clearing browser cache and data
  - Update browser to latest version

#### Orion Browser Storage Issues (iOS)
- **Issue**: Scripts or toggle states not persisting on Orion browser
- **Background**: Orion has a bug where `chrome.storage.sync` and `chrome.storage.local` share the same storage space, which can corrupt data when both are used
- **Solution**: The extension now uses `chrome.storage.local` exclusively on every browser, so the collision cannot happen. No user action required.
- **If issues persist**:
  - Update to the latest version of the extension (v2.5.6+)
  - Clear existing extension data in Orion settings
  - Reinstall the extension if necessary
  - Check the log view for "Using local storage" messages

#### Storage Errors
- **Issue**: Scripts not saving or loading properly
- **Solutions**:
  - Check browser storage permissions
  - Open the log view and look for a "storage is full" message — delete unused scripts to free space
  - Verify chunked storage is working (check logs)
  - If an old version failed to migrate scripts, update and reopen the popup once (migration runs automatically)

#### CSP Violations
- **Issue**: Scripts blocked by Content Security Policy
- **Solutions**:
  - Use the provided CSP bypass methods
  - Implement blob URL injection for complex scripts
  - Check site's CSP headers in browser dev tools
  - Use CSS injection instead of JavaScript when possible

### Debug Mode
Enable enhanced logging:
1. Open extension popup
2. Navigate to log view
3. Monitor real-time log entries
4. Look for error messages and injection status

### Performance Issues
- **Large Scripts**: Use chunked storage automatically
- **Memory Usage**: Monitor logs for memory warnings
- **Injection Speed**: Scripts inject at `document_start` for optimal performance

## 👨‍💻 Developer Documentation

### Key Components

#### storage.js
- Shared storage layer used by popup, background and content scripts
- Forces `chrome.storage.local` for all script data
- One-time migration of legacy `chrome.storage.sync` data

#### popup.js
- User interface and interaction handling
- Code editor with syntax highlighting
- Storage management and data persistence
- Mobile detection and responsive layout

#### background.js
- Desktop script injection logic
- Web navigation event handling
- Logging system coordination
- Storage chunk management

#### content.js
- Mobile-specific script injection
- CSP bypass implementation
- Direct DOM manipulation
- Real-time page interaction

### API Reference

#### Storage Functions
```javascript
// Save data with automatic chunking
saveData(host, { js: code, css: style, enabled: true }, callback)

// Load data with format migration
loadData(host, callback)

// Clear all logs
clearLogs()
```

#### Injection Functions
```javascript
// Desktop injection (background script)
injectBoost(tabId, frameId, jsCode, cssCode, hostname)

// Mobile injection (content script)
// Automatic via content script execution
```

#### Logging System
```javascript
// Log from any component
log('source', 'message')

// View logs in extension popup
// Navigate to log view in popup interface
```

## 🔒 Privacy & Security

### Data Collection
- **No external servers**: All data stored locally in browser
- **No tracking**: No analytics or user tracking
- **No telemetry**: No usage data sent to external services

### Storage Security
- **Local storage**: Scripts, enabled flags and theme are stored in `chrome.storage.local` on every browser
- **No sync**: Data is not uploaded to Chrome Sync or any other service; scripts do not travel between devices
- **Migration**: Legacy `chrome.storage.sync` data is copied into local once; the sync copy is left untouched as a backup and is not written to again
- **Encryption**: Data stored as-is (browser handles encryption)
- **Access control**: Only accessible by the extension

### Script Execution
- **Isolated execution**: Scripts run in page context, not extension context
- **Limited permissions**: Only required permissions requested
- **No external access**: Scripts cannot access extension internals
- **Content Security**: Respects site CSP policies where possible

### Permissions Explained
- `storage`: Save user scripts and settings
- `tabs`: Access current tab URL and reload pages
- `scripting`: Inject scripts and CSS into pages
- `webNavigation`: Handle page navigation events
- `<all_urls>`: Apply scripts to any website

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- [CodeMirror](https://codemirror.net/) for syntax highlighting
- Chrome Extension API for powerful browser integration
- Orion browser team for mobile extension support