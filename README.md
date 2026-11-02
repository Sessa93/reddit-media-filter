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
| GIFs | `.gif` / `.gifv` URLs (also behind Reddit's `reddit.com/media?url=…` viewer links), `.gif` preview images, video players Reddit flags as GIFs (`shreddit-player-2[gif]`), giphy / tenor / gfycat |
| Vids | `post-type="video"`, `v.redd.it`, YouTube, Streamable, Vimeo, Twitch, TikTok and similar hosts, video file extensions |

Anything else (text, link, unknown) is hidden while the filter is on.

Redgifs posts never count as media: they're treated as plain links and hidden, even when Reddit plays them inline as GIFs or videos.

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
scripts/package.sh   builds the release zip
.github/workflows/   CI: test, package, release
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

## Packaging and releases

```bash
npm run package
```

builds `dist/reddit-media-filter-<version>.zip` with only the files the extension needs. It fails if the manifest points at a file that isn't in the zip. Chrome can't install the zip directly: unzip it and use **Load unpacked**, or upload it to the Chrome Web Store.

The [Package workflow](.github/workflows/package.yml) runs the tests and builds the zip on every push to `main` and every pull request. Download the zip from the run's **Artifacts** section.

To publish a release:

1. Bump `version` in `manifest.json` and merge it to `main`.
2. Tag that commit and push the tag:

   ```bash
   git tag v1.0.1 && git push origin v1.0.1
   ```

The workflow checks that the tag matches the manifest version, then creates a GitHub release with the zip attached.
