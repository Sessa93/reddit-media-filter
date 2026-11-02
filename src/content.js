// Classifies Reddit feed posts and hides the kinds the user filtered out.
// Handles the current site (shreddit web components) and old.reddit.com.
(function () {
  'use strict';

  const { DEFAULTS, classifyPost, loadSettings, isKindShown } = globalThis.RMF;

  const POST_SELECTOR = 'shreddit-post, shreddit-ad-post, div.thing.link';
  const PLAYER_SELECTOR =
    'shreddit-player, shreddit-player-2, shreddit-player-static, shreddit-player-static-hlsjs';
  const KIND_ATTR = 'data-rmf-kind';
  const HIDDEN_ATTR = 'data-rmf-hidden';
  const PRIMARY_IMAGE_SELECTOR = 'shreddit-media-lightbox-listener img, img[data-post-media-primary]';
  // A .gif path inside a src or srcset, e.g. preview.redd.it/abc.gif?width=640&format=png8
  const GIF_SRC = /\.gifv?(?:[?#\s,]|$)/i;

  let settings = { ...DEFAULTS };
  let ready = false;
  let frame = 0;
  let lastHref = location.href;
  let lastBadge = -1;
  const pending = new Set();
  const targets = new WeakMap();

  // Post pages show the post itself plus comments; leave them alone.
  function isPostPage() {
    return location.pathname.includes('/comments/');
  }

  function isActive() {
    return settings.enabled && !isPostPage();
  }

  // Crossposts can nest a post inside another; the outer one decides.
  function isTopLevel(post) {
    return !post.parentElement?.closest(POST_SELECTOR);
  }

  function readSignals(post) {
    if (post.classList.contains('thing')) {
      return {
        url: post.dataset.url,
        domain: post.dataset.domain,
        isSelf: post.classList.contains('self'),
        postType: post.dataset.isGallery === 'true' ? 'gallery' : 'link',
        videoPlayer: Boolean(post.querySelector('.expando-button.video')),
      };
    }

    const media = post.querySelector('[slot="post-media-container"]');
    const players = media ? [...media.querySelectorAll(PLAYER_SELECTOR)] : [];
    const images = media ? [...media.querySelectorAll(PRIMARY_IMAGE_SELECTOR)] : [];
    return {
      postType: post.getAttribute('post-type'),
      url: post.getAttribute('content-href'),
      domain: post.getAttribute('domain'),
      gifPlayer: players.some(
        (p) =>
          p.hasAttribute('gif') ||
          GIF_SRC.test(p.getAttribute('src') || '') ||
          GIF_SRC.test(p.getAttribute('poster') || ''),
      ),
      gifImage: images.some((img) =>
        ['src', 'srcset', 'data-lazy-src'].some((attr) => GIF_SRC.test(img.getAttribute(attr) || '')),
      ),
      videoPlayer: players.length > 0,
      gallery: Boolean(media?.querySelector('gallery-carousel')),
      image: Boolean(
        media?.querySelector('shreddit-media-lightbox-listener, img[data-post-media-primary]'),
      ),
    };
  }

  // The element to hide: shreddit wraps each feed post in its own <article>.
  function hideTarget(post) {
    let target = targets.get(post);
    if (!target) {
      const article = post.classList.contains('thing') ? null : post.closest('article');
      const ownsArticle =
        article && [...article.querySelectorAll(POST_SELECTOR)].every((p) => p === post || post.contains(p));
      target = ownsArticle ? article : post;
      targets.set(post, target);
    }
    return target;
  }

  function setAttr(el, name, on) {
    if (on !== el.hasAttribute(name)) el.toggleAttribute(name, on);
  }

  function apply(post) {
    const hidden = isActive() && !isKindShown(settings, post.getAttribute(KIND_ATTR));
    const target = hideTarget(post);
    setAttr(target, HIDDEN_ATTR, hidden);
    // Feed articles are followed by an <hr> divider; hide it with the post.
    const next = target.nextElementSibling;
    if (target !== post && next?.tagName === 'HR') setAttr(next, HIDDEN_ATTR, hidden);
  }

  function classify(post) {
    const kind = classifyPost(readSignals(post));
    if (post.getAttribute(KIND_ATTR) !== kind) post.setAttribute(KIND_ATTR, kind);
  }

  function classifiedPosts() {
    return [...document.querySelectorAll(`[${KIND_ATTR}]`)];
  }

  function stats() {
    const counts = { image: 0, gif: 0, video: 0, text: 0, link: 0, other: 0 };
    let hidden = 0;
    const posts = classifiedPosts();
    for (const post of posts) {
      counts[post.getAttribute(KIND_ATTR)]++;
      if (hideTarget(post).hasAttribute(HIDDEN_ATTR)) hidden++;
    }
    return { counts, total: posts.length, hidden, enabled: settings.enabled, postPage: isPostPage() };
  }

  function reportBadge() {
    const { hidden } = stats();
    if (hidden === lastBadge) return;
    lastBadge = hidden;
    try {
      chrome.runtime.sendMessage({ type: 'rmf:badge', hidden }).catch(() => {});
    } catch {
      // Extension was reloaded; this copy of the script is orphaned.
    }
  }

  function flush() {
    frame = 0;
    for (const post of pending) {
      if (post.isConnected && isTopLevel(post)) {
        classify(post);
        apply(post);
      }
    }
    pending.clear();
    reportBadge();
  }

  // Run before the next paint so filtered posts never flash on screen.
  function schedule() {
    if (ready && pending.size && !frame) frame = requestAnimationFrame(flush);
  }

  function reapplyAll() {
    classifiedPosts().forEach(apply);
    reportBadge();
  }

  function queue(node) {
    if (node.matches(POST_SELECTOR)) pending.add(node);
    else if (node.firstElementChild) node.querySelectorAll(POST_SELECTOR).forEach((p) => pending.add(p));
  }

  const observer = new MutationObserver((records) => {
    // Reddit navigates client-side, so watch for URL changes here.
    if (location.href !== lastHref) {
      lastHref = location.href;
      if (ready) reapplyAll();
    }
    for (const record of records) {
      // Media players load lazily inside posts; reclassify the owning post.
      if (record.target.nodeType === Node.ELEMENT_NODE) {
        const owner = record.target.closest(POST_SELECTOR);
        if (owner) pending.add(owner);
      }
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) queue(node);
      }
    }
    schedule();
  });
  observer.observe(document, { childList: true, subtree: true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in DEFAULTS) settings[key] = newValue ?? DEFAULTS[key];
    }
    if (ready) reapplyAll();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'rmf:stats') sendResponse(stats());
  });

  loadSettings().then((loaded) => {
    settings = loaded;
    ready = true;
    document.querySelectorAll(POST_SELECTOR).forEach((p) => pending.add(p));
    schedule();
  });
})();
