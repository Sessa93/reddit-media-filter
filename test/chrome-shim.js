// Minimal chrome.* stand-in so the content script can run on the plain fixture page.
(function () {
  'use strict';

  const store = {};
  const changeListeners = [];
  const messageListeners = [];

  window.chrome = {
    storage: {
      sync: {
        get: async (defaults) => ({ ...defaults, ...store }),
        set: async (patch) => {
          const changes = {};
          for (const [key, value] of Object.entries(patch)) {
            changes[key] = { oldValue: store[key], newValue: value };
            store[key] = value;
          }
          setTimeout(() => changeListeners.forEach((fn) => fn(changes, 'sync')));
        },
      },
      onChanged: { addListener: (fn) => changeListeners.push(fn) },
    },
    runtime: {
      sendMessage: async (message) => {
        if (message?.type === 'rmf:badge') window.rmfBadge = message.hidden;
      },
      onMessage: { addListener: (fn) => messageListeners.push(fn) },
    },
  };

  // What the popup would receive from chrome.tabs.sendMessage.
  window.rmfRequestStats = () =>
    new Promise((resolve) => messageListeners.forEach((fn) => fn({ type: 'rmf:stats' }, {}, resolve)));
})();
