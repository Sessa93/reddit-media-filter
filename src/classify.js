// Pure post classification, shared by the content script and the Node tests.
// A post is one of: image, gif, video, text, link, other.
(function (root) {
  'use strict';

  const GIF_EXTENSIONS = new Set(['gif', 'gifv']);
  const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'mkv', 'm3u8', 'mpd']);
  const IMAGE_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'heic', 'heif', 'tif', 'tiff',
  ]);

  const GIF_HOSTS = ['redgifs.com', 'gfycat.com', 'giphy.com', 'tenor.com', 'gifdeliverynetwork.com'];
  const VIDEO_HOSTS = [
    'v.redd.it', 'youtube.com', 'youtu.be', 'youtube-nocookie.com', 'streamable.com',
    'vimeo.com', 'twitch.tv', 'tiktok.com', 'dailymotion.com', 'dai.ly', 'streamff.com',
    'streamja.com', 'streamin.one', 'rumble.com', 'kick.com', 'bilibili.com',
  ];
  const IMAGE_HOSTS = [
    'i.redd.it', 'preview.redd.it', 'imgur.com', 'flickr.com', 'staticflickr.com',
    'ibb.co', 'imgbb.com', 'postimg.cc',
  ];

  function hostIn(host, domains) {
    return domains.some((d) => host === d || host.endsWith('.' + d));
  }

  // Media kind implied by a URL alone, or null when the URL says nothing.
  function classifyUrl(href) {
    if (!href) return null;
    let url;
    try {
      url = new URL(href, 'https://www.reddit.com');
    } catch {
      return null;
    }
    const host = url.hostname.toLowerCase();
    const ext = /\.([a-z0-9]+)$/i.exec(url.pathname)?.[1].toLowerCase();

    if (GIF_EXTENSIONS.has(ext) || hostIn(host, GIF_HOSTS)) return 'gif';
    if (VIDEO_EXTENSIONS.has(ext) || hostIn(host, VIDEO_HOSTS)) return 'video';
    if (IMAGE_EXTENSIONS.has(ext) || hostIn(host, IMAGE_HOSTS)) return 'image';
    if (hostIn(host, ['reddit.com']) && url.pathname.startsWith('/gallery/')) return 'image';
    return null;
  }

  /**
   * Classify a post from signals read off the page.
   *
   * @param {object} s
   * @param {string} [s.postType]   shreddit `post-type` (image, gallery, video, text, link, ...)
   * @param {string} [s.url]        where the post points (shreddit `content-href`, old reddit `data-url`)
   * @param {string} [s.domain]     shreddit `domain` / old reddit `data-domain`
   * @param {boolean} [s.isSelf]    old reddit self (text) post
   * @param {boolean} [s.gifPlayer] a video player flagged as a GIF is in the post's media
   * @param {boolean} [s.videoPlayer] a video player is in the post's media
   * @param {boolean} [s.gallery]   a gallery carousel is in the post's media
   * @param {boolean} [s.image]     a primary media image is in the post's media
   */
  function classifyPost(s) {
    const type = (s.postType || '').toLowerCase();
    if (s.isSelf || type === 'text' || type === 'self') return 'text';

    const fromUrl = classifyUrl(s.url) || (s.domain ? classifyUrl(`https://${s.domain}/`) : null);

    if (s.gifPlayer || fromUrl === 'gif') return 'gif';
    if (type === 'image' || type === 'gallery') return 'image';
    if (type === 'video') return 'video';
    if (fromUrl) return fromUrl;
    if (s.videoPlayer) return 'video';
    // Link posts often carry a preview image, so only trust the URL for them.
    if (type === 'link') return 'link';
    if (s.gallery || s.image) return 'image';
    return 'other';
  }

  const api = { classifyUrl, classifyPost };
  root.RMF = Object.assign(root.RMF || {}, api);
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
