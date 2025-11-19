function inject(tabId, jsCode = '', cssCode = '') {
  if (cssCode.trim()) {
    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      css: cssCode
    }).catch(() => {});
  }

  if (jsCode.trim()) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (code) => {
        const script = document.createElement('script');
        script.textContent = code;
        (document.head || document.documentElement).appendChild(script);
        // Keep the tag (safer for most user scripts that need to stay alive)
      },
      args: [jsCode]
    }).catch(() => {});
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  try {
    const { hostname } = new URL(tab.url);
    chrome.storage.sync.get([hostname], (items) => {
      const data = items[hostname];
      if (data?.enabled && (data.js || data.css)) {
        inject(tabId, data.js, data.css);
      }
    });
  } catch (e) {}
});