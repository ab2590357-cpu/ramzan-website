import { afterEach, expect, it, vi } from 'vitest';
import { put } from '@vercel/blob';
import { POST, validateMediaFile } from './[secret]/media/route';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(async (pathname: string) => ({
    url: `https://assets.public.blob.vercel-storage.com/${pathname}`,
    pathname
  })),
  del: vi.fn(async () => undefined)
}));

const originalAdminKey = process.env.RAFAY_ADMIN_KEY;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalBlobStoreId = process.env.BLOB_STORE_ID;
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;

afterEach(() => {
  if (originalAdminKey === undefined) delete process.env.RAFAY_ADMIN_KEY;
  else process.env.RAFAY_ADMIN_KEY = originalAdminKey;
  if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  if (originalBlobStoreId === undefined) delete process.env.BLOB_STORE_ID;
  else process.env.BLOB_STORE_ID = originalBlobStoreId;
  if (originalOidcToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
  else process.env.VERCEL_OIDC_TOKEN = originalOidcToken;
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
