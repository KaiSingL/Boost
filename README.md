# Boost - Browser Extension

A powerful, mobile-friendly browser extension that allows you to edit and inject custom JavaScript and CSS on any website per-domain.

## Features

- **Cross-Platform Compatibility**: Works seamlessly on both desktop browsers and mobile browsers including Orion on iOS
- **Per-Domain Customization**: Apply different JavaScript and CSS scripts to different websites
- **Real-time Injection**: Scripts are injected immediately when enabled
- **Syntax Highlighting**: Code editors with JavaScript and CSS syntax highlighting using Prism.js
- **Mobile-Optimized UI**: Responsive interface that adapts to mobile screens with touch-friendly controls
- **Toggle Control**: Easily enable/disable scripts for any domain
- **Persistent Storage**: Your scripts are saved across browser sessions

## Installation

### Desktop Browsers (Chrome, Firefox, Edge, etc.)

1. Download the extension files
2. Open your browser's extensions page
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

### Mobile Browsers (Orion on iOS)

1. On your Mac, open Safari and navigate to `safari://extensions`
2. Enable "Allow extensions from other websites" in the Develop menu
3. Click "Import Extension" and select the extension folder
4. The extension will sync to your iOS device via iCloud
5. Open Orion browser on your iOS device and enable the extension

## Usage

1. **Open any website** in your browser
2. **Click the Boost extension icon** in your browser toolbar
3. **View current status**: The extension will show whether Boost is active or paused for the current domain
4. **Create/Edit scripts**:
   - Click the "Edit" (pen) button to open the code editor
   - Switch between JavaScript and CSS tabs using the tab buttons
   - Write your code in the editor with syntax highlighting
   - Click "Save" to persist your changes
5. **Toggle scripts on/off**:
   - Use the play/pause button to enable or disable scripts for the current domain
   - Scripts are automatically reloaded when toggled
6. **Reload page**: Use the reload button to apply changes immediately

## Mobile Interface

The extension features a mobile-optimized interface that:

- Automatically detects mobile devices and adjusts the layout
- Uses larger touch targets for better usability on touchscreens
- Implements responsive design that works with various screen sizes
- Provides safe area padding for devices with notches or home indicators

## Permissions

This extension requires the following permissions:

- `storage`: To save your scripts and settings
- `tabs`: To access the current tab URL and reload pages

## Privacy

- All scripts are stored locally in your browser's storage
- No data is sent to external servers
- Scripts are only applied to the domains you explicitly configure
- The extension respects your browser's privacy settings

## Technical Details

- **Manifest Version**: 3
- **Content Scripts**: Run at `document_start` for immediate injection
- **Storage**: Uses `chrome.storage.sync` for cross-device synchronization
- **Code Injection**: Dynamically creates `<script>` and `<style>` elements
- **Error Handling**: Gracefully handles invalid URLs and extension pages

## Troubleshooting

### Common Issues

1. **Extension not working on mobile**:
   - Ensure proper installation steps were followed
   - Check that the extension is enabled in your browser settings
   - Try reloading the browser after installation

2. **Scripts not applying**:
   - Verify that the extension is enabled (play icon visible)
   - Check that your code has no syntax errors
   - Try reloading the page using the reload button

3. **Mobile interface issues**:
   - Ensure your browser is up to date
   - Try clearing browser cache and data
   - Check if the extension is compatible with your specific browser version

### Developer Notes

- The extension uses a dual-editor approach with a textarea for input and a pre element for display
- Syntax highlighting is handled by Prism.js with proper language grammars
- Mobile detection is performed immediately on load to prevent layout shifts
- The extension skips special pages (chrome://, about:, etc.)

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.