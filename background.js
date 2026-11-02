// Keeps the toolbar icon and badge in sync, and handles the keyboard shortcut.
importScripts('src/settings.js');

const ICONS = {
  on: { 16: 'icons/on-16.png', 32: 'icons/on-32.png' },
  off: { 16: 'icons/off-16.png', 32: 'icons/off-32.png' },
};

async function syncIcon() {
  const { enabled } = await RMF.loadSettings();
  await chrome.action.setIcon({ path: enabled ? ICONS.on : ICONS.off });
}

chrome.runtime.onInstalled.addListener(syncIcon);
chrome.runtime.onStartup.addListener(syncIcon);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && 'enabled' in changes) syncIcon();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-filter') return;
  const { enabled } = await RMF.loadSettings();
  await RMF.saveSettings({ enabled: !enabled });
});

// Content scripts report how many posts they hid; show it on that tab's badge.
chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (message?.type !== 'rmf:badge' || tabId === undefined) return;
  const text = message.hidden > 999 ? '999+' : message.hidden > 0 ? String(message.hidden) : '';
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#5f6368' });
  chrome.action.setBadgeText({ tabId, text });
});
