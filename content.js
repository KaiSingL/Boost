"use strict";

(() => {
  // Skip extension pages, chrome://, about:, etc.
  if (!['http:', 'https:'].includes(location.protocol)) return;

  const hostname = location.hostname;
  if (!hostname) return;

  // Enhanced injection methods with CSP compatibility
  const injectionMethods = {
    // Method 1: Blob URL (most CSP-compatible)
    blobUrl: function(code, type = 'js') {
      try {
        const mimeType = type === 'css' ? 'text/css' : 'application/javascript';
        const blob = new Blob([code], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        
        if (type === 'css') {
          const style = document.createElement('style');
          style.dataset.boost = 'css';
          style.textContent = code;
          document.head.appendChild(style);
        } else {
          const script = document.createElement('script');
          script.dataset.boost = 'js';
          script.src = blobUrl;
          script.onload = () => URL.revokeObjectURL(blobUrl);
          document.head.appendChild(script);
        }
        
        return true;
      } catch (e) {
        console.error(`Blob URL ${type} injection failed:`, e);
        return false;
      }
    },

    // Method 2: Chrome Messaging (requires extension context)
    messaging: function(code, type = 'js') {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'executeCode',
          code: code,
          type: type
        }, (response) => {
          resolve(response?.success || false);
        });
      });
    },

    // Method 3: Data URL (fallback)
    dataUrl: function(code, type = 'js') {
      try {
        const mimeType = type === 'css' ? 'text/css' : 'application/javascript';
        const encoded = btoa(code);
        const dataUrl = `data:${mimeType};base64,${encoded}`;
        
        if (type === 'css') {
          const style = document.createElement('style');
          style.dataset.boost = 'css';
          style.textContent = code;
          document.head.appendChild(style);
        } else {
          const script = document.createElement('script');
          script.dataset.boost = 'js';
          script.src = dataUrl;
          document.head.appendChild(script);
        }
        
        return true;
      } catch (e) {
        console.error(`Data URL ${type} injection failed:`, e);
        return false;
      }
    }
  };

  // CSP detection and analysis
  function detectCSP() {
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const csp = meta ? meta.content : '';
    
    return {
      hasCSP: !!csp,
      scriptSrc: csp.match(/script-src\s+([^;]+)/)?.[1] || '',
      styleSrc: csp.match(/style-src\s+([^;]+)/)?.[1] || '',
      allowsInline: csp.includes("'unsafe-inline'"),
      allowsEval: csp.includes("'unsafe-eval'"),
      allowsBlob: !csp.includes('blob:') && !csp.includes("'self'"),
      allowsData: !csp.includes('data:') && !csp.includes("'self'"),
      allowsExternal: csp.includes("'self'") || csp.includes('http://localhost:*') || csp.includes('http://127.0.0.1:*')
    };
  }

  // Smart injection with fallback chain
  async function injectCodeWithFallbacks(jsCode, cssCode) {
    const results = { js: false, css: false };
    const csp = detectCSP();
    
    console.log(`%cBoost: Detected CSP on ${hostname}`, 'color: #ff6b6b; font-weight: bold;');
    console.log('CSP Analysis:', csp);
    
    // Define injection methods in order of preference
    const methods = [];
    
    // Add blob URL if allowed or no CSP
    if (!csp.hasCSP || csp.allowsBlob) {
      methods.push('blobUrl');
    }
    
    // Add data URL if allowed or no CSP
    if (!csp.hasCSP || csp.allowsData) {
      methods.push('dataUrl');
    }
    
    // Always try messaging as it doesn't depend on CSP
    methods.push('messaging');
    
    // Try injection methods
    for (const method of methods) {
      try {
        console.log(`%cBoost: Trying ${method} injection method`, 'color: #4ecdc4; font-weight: bold;');
        
        if (method === 'messaging') {
          // For messaging, we need to handle it differently
          if (jsCode) {
            const response = await injectionMethods[method](jsCode, 'js');
            results.js = response;
          }
          if (cssCode) {
            const response = await injectionMethods[method](cssCode, 'css');
            results.css = response;
          }
        } else {
          // Direct injection methods
          if (jsCode) results.js = injectionMethods[method](jsCode, 'js');
          if (cssCode) results.css = injectionMethods[method](cssCode, 'css');
        }
        
        if (results.js && results.css) {
          console.log(`%cBoost: ${method} injection successful`, 'color: #51cf66; font-weight: bold;');
          break;
        }
      } catch (e) {
        console.error(`${method} injection failed:`, e);
      }
    }
    
    return results;
  }

  // Enhanced injection with error handling
  async function injectCode(jsCode, cssCode) {
    const head = document.head || document.documentElement;
    
    if (!jsCode.trim() && !cssCode.trim()) return false;
    
    let injected = false;
    
    try {
      const results = await injectCodeWithFallbacks(jsCode, cssCode);
      
      if (results.js || results.css) {
        injected = true;
        
        console.log(
          `%cBoost: Code injected successfully on ${hostname}`,
          'background: #0d6efd; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
        );
        
        // Send success message to popup
        chrome.runtime.sendMessage({
          action: 'injectionSuccess',
          hostname: hostname,
          jsInjected: results.js,
          cssInjected: results.css
        });
      } else {
        console.error(`%cBoost: All injection methods failed on ${hostname}`, 'color: #ff6b6b; font-weight: bold;');
        
        // Send failure message to popup
        chrome.runtime.sendMessage({
          action: 'injectionFailed',
          hostname: hostname,
          csp: detectCSP()
        });
      }
    } catch (e) {
      console.error(`%cBoost: Injection error on ${hostname}:`, e);
      injected = false;
    }
    
    return injected;
  }

  // Listen for messaging from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'executeCode') {
      injectCode(request.jsCode, request.cssCode)
        .then(success => sendResponse({ success }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
    }
  });

  // Main injection logic
  chrome.storage.sync.get([hostname], (result) => {
    const data = result[hostname] || { js: '', css: '', enabled: false };

    if (!data.enabled) return;

    const jsCode = data.js || '';
    const cssCode = data.css || '';

    injectCode(jsCode, cssCode);
  });
})();