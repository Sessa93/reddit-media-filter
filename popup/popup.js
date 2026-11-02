(function () {
  'use strict';

  const { loadSettings, saveSettings, KIND_KEYS } = globalThis.RMF;

  const logo = document.getElementById('logo');
  const enabledInput = document.getElementById('enabled');
  const typeInputs = [...document.querySelectorAll('input[data-key]')];
  const countEls = [...document.querySelectorAll('.count[data-kind]')];
  const statusEl = document.getElementById('status');
  const shortcutEl = document.getElementById('shortcut');

  let settings = null;

  function render() {
    enabledInput.checked = settings.enabled;
    document.body.classList.toggle('off', !settings.enabled);
    logo.src = `../icons/${settings.enabled ? 'on' : 'off'}-32.png`;
    for (const input of typeInputs) input.checked = settings[input.dataset.key];
  }

  async function activeTabStats() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    try {
      return await chrome.tabs.sendMessage(tab.id, { type: 'rmf:stats' });
    } catch {
      return null; // Not a Reddit tab, or it was open before the extension loaded.
    }
  }

  function describe(stats) {
    if (!stats) return 'Open a Reddit feed to filter it. Reload tabs that were open before installing.';
    if (stats.postPage) return 'Paused on post pages. The filter applies to feeds.';
    if (!stats.enabled) return `Filter is off. Showing all ${stats.total} posts.`;
    const noneSelected = !Object.values(KIND_KEYS).some((key) => settings[key]);
    if (noneSelected) return 'No types selected, so every post is hidden.';
    return `Hiding ${stats.hidden} of ${stats.total} posts on this page.`;
  }

  async function refreshStats() {
    const stats = await activeTabStats();
    for (const el of countEls) el.textContent = stats ? stats.counts[el.dataset.kind] : '';
    statusEl.textContent = describe(stats);
  }

  async function showShortcut() {
    const commands = await chrome.commands.getAll();
    const shortcut = commands.find((c) => c.name === 'toggle-filter')?.shortcut;
    if (!shortcut) return;
    shortcutEl.textContent = ' toggles the filter.';
    const kbd = document.createElement('kbd');
    kbd.textContent = shortcut;
    shortcutEl.prepend(kbd);
    shortcutEl.hidden = false;
  }

  enabledInput.addEventListener('change', () => saveSettings({ enabled: enabledInput.checked }));
  for (const input of typeInputs) {
    input.addEventListener('change', () => saveSettings({ [input.dataset.key]: input.checked }));
  }

  // Settings can also change from the keyboard shortcut or another window.
  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area !== 'sync') return;
    settings = await loadSettings();
    render();
    // Give the content script a moment to re-filter before recounting.
    setTimeout(refreshStats, 50);
  });

  loadSettings().then((loaded) => {
    settings = loaded;
    render();
    refreshStats();
    setInterval(refreshStats, 1000);
  });
  showShortcut();
})();
