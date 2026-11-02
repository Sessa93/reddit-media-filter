const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyUrl, classifyPost } = require('../src/classify.js');

test('classifyUrl recognises media by extension', () => {
  assert.equal(classifyUrl('https://i.redd.it/abc123.jpeg'), 'image');
  assert.equal(classifyUrl('https://i.redd.it/abc123.png'), 'image');
  assert.equal(classifyUrl('https://i.redd.it/abc123.gif'), 'gif');
  assert.equal(classifyUrl('https://preview.redd.it/abc.gif?format=mp4&s=x'), 'gif');
  assert.equal(classifyUrl('https://i.imgur.com/abc.gifv'), 'gif');
  assert.equal(classifyUrl('https://i.imgur.com/abc.mp4'), 'video');
  assert.equal(classifyUrl('https://example.com/clip.webm'), 'video');
});

test('classifyUrl recognises media hosts', () => {
  assert.equal(classifyUrl('https://v.redd.it/xyz789'), 'video');
  assert.equal(classifyUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'video');
  assert.equal(classifyUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), 'video');
  assert.equal(classifyUrl('https://youtu.be/dQw4w9WgXcQ'), 'video');
  assert.equal(classifyUrl('https://streamable.com/abc'), 'video');
  assert.equal(classifyUrl('https://giphy.com/gifs/abc'), 'gif');
  assert.equal(classifyUrl('https://imgur.com/a/album1'), 'image');
  assert.equal(classifyUrl('https://www.reddit.com/gallery/1abcde'), 'image');
});

test('classifyUrl returns null for non-media and junk', () => {
  assert.equal(classifyUrl('https://www.reddit.com/r/pics/comments/1abc/title/'), null);
  assert.equal(classifyUrl('/r/AskReddit/comments/1abc/title/'), null);
  assert.equal(classifyUrl('https://www.bbc.co.uk/news/article-123'), null);
  assert.equal(classifyUrl('https://external-preview.redd.it/abc'), null);
  assert.equal(classifyUrl('https://notyoutube.com/watch'), null);
  assert.equal(classifyUrl(''), null);
  assert.equal(classifyUrl(undefined), null);
  assert.equal(classifyUrl('http://[bad'), null);
});

test('shreddit posts classify from post-type and content-href', () => {
  assert.equal(classifyPost({ postType: 'image', url: 'https://i.redd.it/a.jpeg' }), 'image');
  assert.equal(classifyPost({ postType: 'image', url: 'https://i.redd.it/a.gif' }), 'gif');
  assert.equal(classifyPost({ postType: 'gallery', url: 'https://www.reddit.com/gallery/1a' }), 'image');
  assert.equal(classifyPost({ postType: 'video', url: 'https://v.redd.it/a' }), 'video');
  assert.equal(classifyPost({ postType: 'video', url: 'https://v.redd.it/a', gifPlayer: true }), 'gif');
  assert.equal(classifyPost({ postType: 'text', url: '/r/x/comments/1a/t/' }), 'text');
  assert.equal(classifyPost({ postType: 'link', url: 'https://www.youtube.com/watch?v=1' }), 'video');
  assert.equal(classifyPost({ postType: 'link', url: 'https://i.imgur.com/a.png' }), 'image');
  assert.equal(classifyPost({ postType: 'link', url: 'https://news.example.com/story' }), 'link');
});

test('redgifs is never media', () => {
  assert.equal(classifyUrl('https://www.redgifs.com/watch/somegif'), null);
  assert.equal(classifyUrl('https://media.redgifs.com/SomeGif.mp4'), null);
  assert.equal(classifyUrl('https://www.gifdeliverynetwork.com/somegif'), null);

  const watch = 'https://www.redgifs.com/watch/somegif';
  assert.equal(classifyPost({ postType: 'link', url: watch }), 'link');
  assert.equal(classifyPost({ postType: 'video', url: watch, videoPlayer: true }), 'link');
  assert.equal(classifyPost({ postType: 'image', url: watch, gifPlayer: true }), 'link');
  assert.equal(classifyPost({ url: 'https://media.redgifs.com/SomeGif.mp4' }), 'link');
  // Old reddit: only the domain may say redgifs.
  assert.equal(classifyPost({ postType: 'link', url: '/r/x/comments/1a/t/', domain: 'v3.redgifs.com' }), 'link');
});

test('link posts with a preview image stay links', () => {
  assert.equal(
    classifyPost({ postType: 'link', url: 'https://news.example.com/story', image: true }),
    'link',
  );
});

test('unknown post types fall back to the media in the post', () => {
  const permalink = 'https://www.reddit.com/r/x/comments/1a/t/';
  assert.equal(classifyPost({ postType: 'crosspost', url: permalink, videoPlayer: true }), 'video');
  assert.equal(classifyPost({ postType: 'crosspost', url: permalink, gallery: true }), 'image');
  assert.equal(classifyPost({ postType: 'multi_media', url: permalink, image: true }), 'image');
  assert.equal(classifyPost({ postType: 'multi_media', url: permalink }), 'other');
  assert.equal(classifyPost({}), 'other');
});

test('old reddit posts classify from data-url, data-domain and self flag', () => {
  const old = (s) => classifyPost({ postType: 'link', ...s });
  assert.equal(old({ url: 'https://i.redd.it/a.jpg', domain: 'i.redd.it' }), 'image');
  assert.equal(old({ url: 'https://v.redd.it/a', domain: 'v.redd.it' }), 'video');
  assert.equal(old({ url: 'https://i.imgur.com/a.gifv', domain: 'i.imgur.com' }), 'gif');
  assert.equal(old({ url: '/r/x/comments/1a/t/', domain: 'self.x', isSelf: true }), 'text');
  assert.equal(old({ url: 'https://www.reddit.com/gallery/1a', postType: 'gallery' }), 'image');
  assert.equal(old({ url: 'https://example.com/page', domain: 'example.com', videoPlayer: true }), 'video');
  assert.equal(old({ url: 'https://example.com/page', domain: 'example.com' }), 'link');
  // Domain is used when the URL itself is not conclusive.
  assert.equal(old({ url: '/r/x/comments/1a/t/', domain: 'i.redd.it' }), 'image');
});
