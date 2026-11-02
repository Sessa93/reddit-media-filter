// Settings shared by the content script, popup and background worker.
(function (root) {
  'use strict';

  const DEFAULTS = Object.freeze({
    enabled: true,
    showImage: true,
    showGif: true,
    showVideo: true,
  });

  // Post kinds that can be shown while the filter is on, and the setting for each.
  const KIND_KEYS = Object.freeze({
    image: 'showImage',
    gif: 'showGif',
    video: 'showVideo',
  });

  function loadSettings() {
    return chrome.storage.sync.get(DEFAULTS);
  }

  function saveSettings(patch) {
    return chrome.storage.sync.set(patch);
  }

  function isKindShown(settings, kind) {
    const key = KIND_KEYS[kind];
    return Boolean(key && settings[key]);
  }

  root.RMF = Object.assign(root.RMF || {}, {
    DEFAULTS,
    KIND_KEYS,
    loadSettings,
    saveSettings,
    isKindShown,
  });
})(globalThis);
