// Workaround for strict Content Security Policy (CSP) that blocks inline scripts with setInterval/console.log
// Many modern sites (e.g. YouTube, Reddit, news sites) enforce CSP → Boost-injected <script> tags get blocked silently
// Solution: run the entire remover from a dynamically created <script> blob URL (allowed under 'self')
// This bypasses CSP inline restrictions while keeping everything lightweight and reliable

(() => {
  // List of IDs we want to nuke
  const idsToRemove = ['featured', 'highlights', 'full-width-ad', 'side-hot-review', 'onesignal-slidedown-dialog', 'top-bar-tags-container', 'cookie'];
  const classToRemove = ['top-bar-tags-container', 'top-bar-tags'];

  classToRemove.forEach(cls => {
    const elements = document.querySelectorAll(`.${cls}`);
    elements.forEach(el => el.remove());
  });
  const removerCode = `
    const ids = ${JSON.stringify(idsToRemove)};
    let totalRemoved = 0;

    const removeTargets = () => {
      let removedThisRun = 0;
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.remove();
          console.log('%c✓ Removed #' + id, 'color:#4caf50;font-weight:bold;');
          removedThisRun++;
          totalRemoved++;
        }
      });

      if (removedThisRun > 0) {
        console.log('%c+ Cleaned ' + removedThisRun + ' element(s) — ' + totalRemoved + ' total', 'color:#2196f3;');
      }
    };

    // Run immediately + every 800 ms to catch late-loaded ads/promos
    removeTargets();
    setInterval(removeTargets, 800);
  `;

  // Create a blob URL that is considered 'self' → allowed by even the strictest CSP
  const blob = new Blob([removerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  // Inject and run
  const script = document.createElement('script');
  script.src = url;
  script.onload = () => URL.revokeObjectURL(url); // clean up memory immediately
  (document.head || document.documentElement).appendChild(script);
})();