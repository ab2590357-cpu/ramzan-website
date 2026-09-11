import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { put } from '@vercel/blob';
import { POST, validateMediaFile } from './[secret]/media/route';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(async (pathname: string) => ({
    url: `https://assets.public.blob.vercel-storage.com/${pathname}`,
    pathname
  })),
  del: vi.fn(async () => undefined),
  get: vi.fn(),
  head: vi.fn(),
  list: vi.fn(),
  BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {}
}));

const originalAdminKey = process.env.RAFAY_ADMIN_KEY;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalBlobStoreId = process.env.BLOB_STORE_ID;
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;
const originalDataDir = process.env.RAFAY_DATA_DIR;
let tempRoot = '';

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = '';
  }
  if (originalAdminKey === undefined) delete process.env.RAFAY_ADMIN_KEY;
  else process.env.RAFAY_ADMIN_KEY = originalAdminKey;
  if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  if (originalBlobStoreId === undefined) delete process.env.BLOB_STORE_ID;
  else process.env.BLOB_STORE_ID = originalBlobStoreId;
  if (originalOidcToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
  else process.env.VERCEL_OIDC_TOKEN = originalOidcToken;
  if (originalDataDir === undefined) delete process.env.RAFAY_DATA_DIR;
  else process.env.RAFAY_DATA_DIR = originalDataDir;
  vi.clearAllMocks();
});

it('accepts JPEG PNG and WebP up to 5 MB', () => {
  for (const type of ['image/jpeg','image/png','image/webp']) {
    const file = new File([new Uint8Array(1024)], 'photo.bin', { type });
    expect(validateMediaFile(file)).toEqual({ ok: true });
  }
});

it('rejects unsupported media types and files above 5 MB', () => {
  const pdf = new File(['x'], 'file.pdf', { type: 'application/pdf' });
  expect(validateMediaFile(pdf).ok).toBe(false);
  const large = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'photo.webp', { type: 'image/webp' });
  expect(validateMediaFile(large).ok).toBe(false);
});

it('returns a JSON service error instead of crashing when Blob storage is not connected', async () => {
  const secret = 'ci-test-admin-key-at-least-32-characters';
  process.env.RAFAY_ADMIN_KEY = secret;
  delete process.env.RAFAY_DATA_DIR;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL_OIDC_TOKEN;
  const form = new FormData();
  form.set('scope', 'site');
  form.set('file', new File(['image-bytes'], 'hero.webp', { type: 'image/webp' }));

  const response = await POST(new Request('https://example.test/api/control/key/media', { method: 'POST', body: form }), {
    params: Promise.resolve({ secret })
  });
  const payload = await response.json();

  expect(response.status).toBe(503);
  expect(payload.error).toContain('Blob storage');
  expect(vi.mocked(put)).not.toHaveBeenCalled();
});

it('stores a valid profile image inside the RAFAY media namespace', async () => {
  const secret = 'ci-test-admin-key-at-least-32-characters';
  process.env.RAFAY_ADMIN_KEY = secret;
  delete process.env.RAFAY_DATA_DIR;
  process.env.BLOB_READ_WRITE_TOKEN = 'blob_rw_ci';
  const form = new FormData();
  form.set('scope', 'profile');
  form.set('profileId', 'rafa');
  form.set('file', new File(['image-bytes'], 'portrait.webp', { type: 'image/webp' }));

  const response = await POST(new Request('https://example.test/api/control/key/media', { method: 'POST', body: form }), {
    params: Promise.resolve({ secret })
  });
  const payload = await response.json();

  expect(response.status).toBe(201);
  expect(payload.url).toContain('/rafay/media/profiles/rafa/');
  expect(vi.mocked(put)).toHaveBeenCalledOnce();
});

it('stores site media in the RAFAY site namespace', async () => {
  const secret = 'ci-test-admin-key-at-least-32-characters';
  process.env.RAFAY_ADMIN_KEY = secret;
  delete process.env.RAFAY_DATA_DIR;
  process.env.BLOB_READ_WRITE_TOKEN = 'blob_rw_ci';
  const form = new FormData();
  form.set('scope', 'site');
  form.set('file', new File(['image-bytes'], 'hero.webp', { type: 'image/webp' }));

  const response = await POST(new Request('https://example.test/api/control/key/media', { method: 'POST', body: form }), {
    params: Promise.resolve({ secret })
  });
  const payload = await response.json();

  expect(response.status).toBe(201);
  expect(payload.pathname).toContain('rafay/media/site/');
});

it('writes site media to RAFAY_DATA_DIR instead of Vercel Blob', async () => {
  const secret = 'ci-test-admin-key-at-least-32-characters';
  process.env.RAFAY_ADMIN_KEY = secret;
  tempRoot = await mkdtemp(join(tmpdir(), 'rafay-admin-media-'));
  process.env.RAFAY_DATA_DIR = tempRoot;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL_OIDC_TOKEN;

  const boundary = '----rafay-filesystem-upload-test';
  const multipart = [
    `--${boundary}\r\nContent-Disposition: form-data; name="scope"\r\n\r\nsite\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="hero.webp"\r\nContent-Type: image/webp\r\n\r\nrailway-image\r\n`,
    `--${boundary}--\r\n`
  ].join('');
  const request = new Request('https://example.test/api/control/key/media', {
    method: 'POST',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    body: multipart
  });

  const response = await POST(request, { params: Promise.resolve({ secret }) });
  const payload = await response.json();

  expect(response.status).toBe(201);
  expect(payload.url).toMatch(/^\/media\/site\//);
  const filename = payload.url.split('/').at(-1);
  expect(await readFile(join(tempRoot, 'media', 'site', filename), 'utf8')).toBe('railway-image');
  expect(vi.mocked(put)).not.toHaveBeenCalled();
});
