import test from 'node:test';
import assert from 'node:assert/strict';
import { shareImage, SHARE_DEFAULT_IMAGE } from '../src/utils/cloudinary.js';

const PHOTO = 'https://res.cloudinary.com/demo/image/upload/v1774800337/artopia/pen.png';

test('share image is a 1200x630 JPEG cut from the Cloudinary original', () => {
  assert.equal(shareImage(PHOTO), 'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/v1774800337/artopia/pen.jpg');
});

test('products are padded on white so nothing is cropped, and never f_auto', () => {
  const url = shareImage(PHOTO, 'pad');
  assert.match(url, /c_pad,b_white,w_1200,h_630/);
  assert.ok(!url.includes('f_auto'));
});

test('non-Cloudinary and already transformed urls are left alone', () => {
  assert.equal(shareImage(SHARE_DEFAULT_IMAGE), SHARE_DEFAULT_IMAGE);
  const done = 'https://res.cloudinary.com/demo/image/upload/w_600/pen.png';
  assert.equal(shareImage(done), done);
  assert.equal(shareImage(undefined), undefined);
});

test('the default share image is a file that exists in public/', async () => {
  const { statSync } = await import('node:fs');
  assert.ok(statSync(new URL('../public/images/share/artopia.jpg', import.meta.url)).size > 10000);
  assert.ok(statSync(new URL('../public/images/engraving/share.jpg', import.meta.url)).size > 10000);
});
