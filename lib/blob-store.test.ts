import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_DATA } from './defaults';
import { SiteDataSchema, type BookingRequest } from './domain';

const { delMock, getMock, headMock, listMock, putMock } = vi.hoisted(() => ({
  delMock: vi.fn(),
  getMock: vi.fn(),
  headMock: vi.fn(),
  listMock: vi.fn(async () => ({ blobs: [] })),
  putMock: vi.fn()
}));

vi.mock('@vercel/blob', () => ({
  BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {},
  del: delMock,
  get: getMock,
  head: headMock,
  list: listMock,
  put: putMock
}));

import { bookingPath, configPath, createBooking, loadSiteData, mediaPath } from './blob-store';

const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalBlobStoreId = process.env.BLOB_STORE_ID;
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;
const originalPrivateBookingToken = process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN;

const bookingFixture: BookingRequest = {
  id: 'booking-1',
  reference: 'RFY-BOOKING1',
  profileId: 'ariana',
  packageId: 'social',
  date: '2026-12-01',
  time: '20:00',
  city: 'Lahore',
  venueType: 'Restaurant / dinner',
  occasion: 'Dinner / social',
  duration: '1 hour',
  addOn: 'No add-on',
  paymentPreference: 'Bank transfer',
  customerName: 'Test User',
  customerPhone: '+923001234567',
  notes: '',
  lawfulUseConfirmed: true,
  profileNameSnapshot: 'Ariana',
  packageNameSnapshot: 'Social Appearance',
  status: 'Pending',
  createdAt: '2026-09-11T01:00:00.000Z',
  updatedAt: '2026-09-11T01:00:00.000Z'
};

afterEach(() => {
  delMock.mockReset();
  getMock.mockReset();
  headMock.mockReset();
  listMock.mockReset();
  listMock.mockResolvedValue({ blobs: [] });
  putMock.mockReset();
  if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  if (originalBlobStoreId === undefined) delete process.env.BLOB_STORE_ID;
  else process.env.BLOB_STORE_ID = originalBlobStoreId;
  if (originalOidcToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
  else process.env.VERCEL_OIDC_TOKEN = originalOidcToken;
  if (originalPrivateBookingToken === undefined) delete process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN;
  else process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN = originalPrivateBookingToken;
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

  it('treats a Vercel-connected Blob store id as configured when OIDC is runtime-managed', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_ci';
    delete process.env.VERCEL_OIDC_TOKEN;
    headMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      etag: 'etag-store-id'
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
    expect(result.etag).toBe('etag-store-id');
    expect(headMock).toHaveBeenCalledOnce();
  });

  it('seeds default site data when a connected Blob store is fresh and head throws BlobNotFoundError', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_ci';
    delete process.env.VERCEL_OIDC_TOKEN;

    const notFound = new Error('Blob not found');
    notFound.name = 'BlobNotFoundError';
    headMock.mockRejectedValueOnce(notFound);
    putMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      etag: 'etag-seeded'
    });

    const result = await loadSiteData();

    expect(result.data.brandName).toBe('RAFAY');
    expect(result.etag).toBe('etag-seeded');
    expect(headMock).toHaveBeenCalledOnce();
    expect(putMock).toHaveBeenCalledWith(
      'rafay/config/site-data.json',
      expect.any(String),
      expect.objectContaining({ access: 'public', addRandomSuffix: false, contentType: 'application/json' })
    );
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

describe('RAFAY private booking storage', () => {
  it('refuses to write bookings when the separate private store token is missing', async () => {
    delete process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN;

    await expect(createBooking(bookingFixture)).rejects.toThrow('Private booking storage is not configured');
    expect(putMock).not.toHaveBeenCalled();
  });

  it('writes bookings with the separate private store token', async () => {
    process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN = 'private_rw_ci';

    await createBooking(bookingFixture);

    expect(putMock).toHaveBeenCalledWith(
      'rafay/bookings/booking-1.json',
      expect.any(String),
      expect.objectContaining({ access: 'private', token: 'private_rw_ci' })
    );
  });
});
