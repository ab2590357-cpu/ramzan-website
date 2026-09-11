import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_DATA } from './defaults';
import { SiteDataSchema } from './domain';

const { getMock, headMock } = vi.hoisted(() => ({ getMock: vi.fn(), headMock: vi.fn() }));

vi.mock('@vercel/blob', () => ({
  BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {},
  del: vi.fn(),
  get: getMock,
  head: headMock,
  list: vi.fn(async () => ({ blobs: [] })),
  put: vi.fn()
}));

import { bookingPath, configPath, loadSiteData, mediaPath } from './blob-store';

const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalBlobStoreId = process.env.BLOB_STORE_ID;
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;

afterEach(() => {
  getMock.mockReset();
  headMock.mockReset();
  if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  if (originalBlobStoreId === undefined) delete process.env.BLOB_STORE_ID;
  else process.env.BLOB_STORE_ID = originalBlobStoreId;
  if (originalOidcToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
  else process.env.VERCEL_OIDC_TOKEN = originalOidcToken;
});

describe('RAFAY Blob paths', () => {
  it('uses the private booking namespace', () => {
    expect(bookingPath('abc')).toBe('rafay/bookings/abc.json');
  });

  it('uses one canonical shared site-data path', () => {
    expect(configPath()).toBe('rafay/config/site-data.json');
  });

  it('builds profile and site media paths inside RAFAY media namespace', () => {
    expect(mediaPath('profile', 'hero.webp', 'profile-1')).toBe('rafay/media/profiles/profile-1/hero.webp');
    expect(mediaPath('site', 'hero.webp')).toBe('rafay/media/site/hero.webp');
  });
});

describe('RAFAY runtime fallback', () => {
  it('returns default public data without calling Blob when storage credentials are missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL_OIDC_TOKEN;

    const result = await loadSiteData();

    expect(result.data.brandName).toBe(DEFAULT_SITE_DATA.brandName);
    expect(result.etag).toBe('blob-not-configured');
    expect(headMock).not.toHaveBeenCalled();
  });

  it('uses an OIDC-connected Blob store even when the legacy read-write token is absent', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_ci';
    process.env.VERCEL_OIDC_TOKEN = 'oidc_ci';
    headMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      etag: 'etag-oidc'
    });
    getMock.mockResolvedValue({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(DEFAULT_SITE_DATA)));
          controller.close();
        }
      })
    });

    const result = await loadSiteData();

    expect(result.data.brandName).toBe('RAFAY');
    expect(result.etag).toBe('etag-oidc');
    expect(headMock).toHaveBeenCalledOnce();
  });

  it('keeps legacy persisted site config readable after brand-media fields are introduced', () => {
    const legacy = structuredClone(DEFAULT_SITE_DATA) as unknown as Record<string, unknown>;
    const hero = { ...(legacy.hero as Record<string, unknown>) };
    delete hero.desktopImageUrl;
    delete hero.mobileImageUrl;
    delete hero.imageAlt;
    delete hero.whatsappCta;
    delete legacy.logoUrl;
    delete legacy.logoAlt;
    legacy.hero = hero;

    const parsed = SiteDataSchema.parse(legacy);
    expect(parsed.logoUrl).toBe('');
    expect(parsed.logoAlt).toBe('RAFAY');
    expect(parsed.hero.desktopImageUrl).toBe('');
    expect(parsed.hero.mobileImageUrl).toBe('');
    expect(parsed.hero.whatsappCta).toBe('WhatsApp');
  });
});
