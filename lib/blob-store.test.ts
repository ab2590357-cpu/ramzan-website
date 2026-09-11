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
const originalDataDir = process.env.RAFAY_DATA_DIR;

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

function restore(name: 'BLOB_READ_WRITE_TOKEN' | 'BLOB_STORE_ID' | 'VERCEL_OIDC_TOKEN' | 'RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN' | 'RAFAY_DATA_DIR', value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  delMock.mockReset();
  getMock.mockReset();
  headMock.mockReset();
  listMock.mockReset();
  listMock.mockResolvedValue({ blobs: [] });
  putMock.mockReset();
  restore('BLOB_READ_WRITE_TOKEN', originalBlobToken);
  restore('BLOB_STORE_ID', originalBlobStoreId);
  restore('VERCEL_OIDC_TOKEN', originalOidcToken);
  restore('RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN', originalPrivateBookingToken);
  restore('RAFAY_DATA_DIR', originalDataDir);
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
    delete process.env.RAFAY_DATA_DIR;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL_OIDC_TOKEN;

    const result = await loadSiteData();

    expect(result.data.brandName).toBe(DEFAULT_SITE_DATA.brandName);
    expect(result.etag).toBe('blob-not-configured');
    expect(headMock).not.toHaveBeenCalled();
  });

  it('uses a connected store id with runtime-managed OIDC authentication', async () => {
    delete process.env.RAFAY_DATA_DIR;
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
    expect(headMock).toHaveBeenCalledWith('rafay/config/site-data.json');
    expect(getMock).toHaveBeenCalledWith(
      'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      { access: 'public' }
    );
  });

  it('seeds default site data when a token-authenticated Blob store is fresh', async () => {
    delete process.env.RAFAY_DATA_DIR;
    process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';

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
      expect.objectContaining({ access: 'public', addRandomSuffix: false, contentType: 'application/json', token: 'public_rw_ci' })
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
    delete process.env.RAFAY_DATA_DIR;
    delete process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN;

    await expect(createBooking(bookingFixture)).rejects.toThrow('Private booking storage is not configured');
    expect(putMock).not.toHaveBeenCalled();
  });

  it('writes bookings with the separate private store token', async () => {
    delete process.env.RAFAY_DATA_DIR;
    process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN = 'private_rw_ci';

    await createBooking(bookingFixture);

    expect(putMock).toHaveBeenCalledWith(
      'rafay/bookings/booking-1.json',
      expect.any(String),
      expect.objectContaining({ access: 'private', token: 'private_rw_ci' })
    );
  });
});
