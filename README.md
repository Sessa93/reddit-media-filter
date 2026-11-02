# Reddit Media Filter

A Chrome/Vivaldi extension (Manifest V3) that filters Reddit feeds down to **pics, GIFs and vids**. Text posts, plain link posts and ads are hidden. Each media type has its own toggle.

## Install

1. Open the extensions page:
   - Chrome: `chrome://extensions`
   - Vivaldi: `vivaldi://extensions`
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder (the one containing `manifest.json`).
4. Reload any Reddit tabs that were already open.

Pin the extension to the toolbar to get to the popup quickly.

## Use

- **Popup:** turn the filter on/off, and choose which of Pics / GIFs / Vids to keep. It also shows how many of each are on the current page.
- **Badge:** the toolbar icon shows how many posts are hidden on the current tab. The icon turns gray when the filter is off.
- **Shortcut:** <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> toggles the filter. Change it at `chrome://extensions/shortcuts` (in Vivaldi, Settings → Keyboard also works).

Settings sync across browsers signed into the same profile (`chrome.storage.sync`).

## What counts as what

| Kind | Detected from |
| --- | --- |
| Pics | `post-type="image"` or `"gallery"`, `i.redd.it` / `preview.redd.it` / imgur / reddit gallery links, image file extensions |
| GIFs | `.gif` / `.gifv` URLs, video players Reddit flags as GIFs (`shreddit-player-2[gif]`), redgifs / giphy / tenor / gfycat |
| Vids | `post-type="video"`, `v.redd.it`, YouTube, Streamable, Vimeo, Twitch, TikTok and similar hosts, video file extensions |

Anything else (text, link, unknown) is hidden while the filter is on.

## Where it runs

- **www.reddit.com** (the current web-component UI): home, popular, all, subreddit and user feeds, including posts added by infinite scroll.
- **old.reddit.com**, and www.reddit.com with the old-Reddit preference on.
- Post pages (`/comments/…`) are left alone, so opening a post always shows it.
- Search results use different markup and are not filtered.

If Reddit changes its markup and posts are misclassified, the popup counts show what was detected. Turn the filter off with the switch or the shortcut in the meantime.

## Layout

```
manifest.json        MV3 manifest
background.js        toolbar icon/badge, keyboard shortcut
src/settings.js      defaults + storage helpers (shared)
src/classify.js      pure URL/post classification (shared with tests)
src/content.js       finds posts, classifies them, hides filtered ones
src/content.css      the hiding rule
popup/               toolbar popup
icons/               on/off icons
test/                unit tests + DOM fixture
```

## Tests

```bash
npm test
```

runs the classifier unit tests (Node 18+, no dependencies).

`test/fixture.html` exercises the real content script against Reddit-shaped markup (shreddit and old Reddit) using a small `chrome.*` shim. Serve the folder and open it:

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765/test/fixture.html>. The green/red panel at the top checks every post's detected type and visibility. The buttons simulate toggling settings, infinite scroll, a lazily loaded GIF player, and navigating to a post page and back.
