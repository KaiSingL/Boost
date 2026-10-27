"use strict";

// Shared storage layer for popup, background and content scripts.
//
// All extension data (scripts, enabled flags, theme) lives in chrome.storage.local.
// Desktop used to use chrome.storage.sync, which caps total storage at ~100KB and
// produced "Resource::kQuotaBytes quota exceeded" failures for large scripts.
// chrome.storage.local has a much larger quota (10MB in Chrome 114+) and needs no
// cloud round-trips, at the cost of no longer syncing scripts across devices.
//
// Orion on iOS has a bug where storage.sync and storage.local share the same
// space, which corrupted data. Local-only storage sidesteps that bug entirely.

(function (global) {
  const isOrionBrowser = /Orion/i.test(navigator.userAgent) ||
    (navigator.userAgent.includes('AppleWebKit') && !navigator.userAgent.includes('Chrome') &&
     /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent));

  const storageApi = chrome.storage.local;
  const STORAGE_TYPE = 'local';
  const MIGRATION_KEY = 'boost_storage_migrated_v1';
  const LOGS_KEY = 'boost_logs';

  let migrationPromise = null;

  function migrateFromSync() {
    return new Promise((resolve) => {
      chrome.storage.local.get(MIGRATION_KEY, ({ [MIGRATION_KEY]: alreadyMigrated }) => {
        if (alreadyMigrated) {
          resolve(false);
          return;
        }

        // Orion already keeps everything in local. Sync and local share one
        // physical space there, so there is nothing to copy (and reading sync
        // risks seeing unrelated data).
        if (isOrionBrowser) {
          chrome.storage.local.set({ [MIGRATION_KEY]: true }, () => resolve(false));
          return;
        }

        chrome.storage.sync.get(null, (syncItems) => {
          if (chrome.runtime.lastError) {
            // Leave the marker unset so the next run retries.
            console.warn('Boost: storage migration skipped:', chrome.runtime.lastError.message);
            resolve(false);
            return;
          }

          const toCopy = {};
          for (const [key, value] of Object.entries(syncItems || {})) {
            if (key === LOGS_KEY || key === MIGRATION_KEY) continue;
            toCopy[key] = value;
          }

          const copiedKeys = Object.keys(toCopy).length;
          const markDone = (didCopy) => chrome.storage.local.set({ [MIGRATION_KEY]: true }, () => resolve(didCopy));

          const copy = copiedKeys > 0
            ? (done) => chrome.storage.local.set(toCopy, done)
            : (done) => done();

          copy(() => {
            if (chrome.runtime.lastError) {
              console.warn('Boost: storage migration failed:', chrome.runtime.lastError.message);
              resolve(false);
              return;
            }
            // The legacy sync copy is intentionally left in place. It is never
            // read or written once migration is marked done, and it lets a
            // reinstall (or a rollback) recover scripts. Clearing it here would
            // destroy data on devices still running the previous version.
            markDone(copiedKeys > 0);
          });
        });
      });
    });
  }

  // Copy any legacy sync data into local exactly once. Safe to call from any
  // context; concurrent callers share a single in-flight migration.
  function ensureStorageMigrated() {
    if (!migrationPromise) migrationPromise = migrateFromSync();
    return migrationPromise;
  }

  global.BoostStorage = {
    isOrionBrowser,
    storageApi,
    STORAGE_TYPE,
    ensureStorageMigrated,
    MIGRATION_KEY
  };
})(typeof self !== 'undefined' ? self : window);
