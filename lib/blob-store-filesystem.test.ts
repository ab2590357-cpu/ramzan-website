import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_SITE_DATA } from './defaults';
import type { BookingRequest } from './domain';

const { delMock, getMock, headMock, listMock, putMock } = vi.hoisted(() => ({
  delMock: vi.fn(),
  getMock: vi.fn(),
  headMock: vi.fn(),
  listMock: vi.fn(),
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

import {
  SiteDataConflictError,
  createBooking,
  deleteBooking,
  deleteMedia,
  hasBlobStorageConfig,
  hasPrivateBookingStorageConfig,
  listBookings,
  loadSiteData,
  readMedia,
  saveMedia,
  saveSiteData,
  updateBooking
} from './blob-store';

const originalDataDir = process.env.RAFAY_DATA_DIR;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalBlobStoreId = process.env.BLOB_STORE_ID;
const originalPrivateBookingToken = process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN;

let root = '';

const bookingFixture: BookingRequest = {
  id: 'booking-fs-1',
  reference: 'RFY-FS000001',
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
  customerName: 'Filesystem Test',
  customerPhone: '+923001234567',
  notes: '',
  lawfulUseConfirmed: true,
  profileNameSnapshot: 'Ariana',
  packageNameSnapshot: 'Social Appearance',
  status: 'Pending',
  createdAt: '2026-09-12T00:00:00.000Z',
  updatedAt: '2026-09-12T00:00:00.000Z'
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'rafay-fs-'));
  process.env.RAFAY_DATA_DIR = root;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN;
  vi.clearAllMocks();
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.RAFAY_DATA_DIR;
  else process.env.RAFAY_DATA_DIR = originalDataDir;
  if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  if (originalBlobStoreId === undefined) delete process.env.BLOB_STORE_ID;
  else process.env.BLOB_STORE_ID = originalBlobStoreId;
  if (originalPrivateBookingToken === undefined) delete process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN;
  else process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN = originalPrivateBookingToken;
});

describe('RAFAY filesystem site data', () => {
  it('treats RAFAY_DATA_DIR as configured public and private storage', () => {
    expect(hasBlobStorageConfig()).toBe(true);
    expect(hasPrivateBookingStorageConfig()).toBe(true);
  });

  it('seeds defaults into a fresh filesystem store and returns a stable etag', async () => {
    const first = await loadSiteData();
    const persisted = JSON.parse(await readFile(join(root, 'config', 'site-data.json'), 'utf8'));
    const second = await loadSiteData();

    expect(first.data.brandName).toBe(DEFAULT_SITE_DATA.brandName);
    expect(first.etag).toMatch(/^[a-f0-9]{64}$/);
    expect(second.etag).toBe(first.etag);
    expect(persisted.brandName).toBe('RAFAY');
    expect(headMock).not.toHaveBeenCalled();
    expect(putMock).not.toHaveBeenCalled();
  });

  it('saves and reloads site data with optimistic concurrency', async () => {
    const first = await loadSiteData();
    const saved = await saveSiteData({ ...first.data, publicContact: 'Railway contact' }, first.etag);
    const reloaded = await loadSiteData();

    expect(saved.etag).not.toBe(first.etag);
    expect(reloaded.data.publicContact).toBe('Railway contact');
    expect(reloaded.etag).toBe(saved.etag);
    await expect(saveSiteData({ ...reloaded.data, publicContact: 'stale write' }, first.etag)).rejects.toBeInstanceOf(SiteDataConflictError);
  });
});

describe('RAFAY filesystem bookings', () => {
  it('supports booking create, list, update and delete without a Blob token', async () => {
    await createBooking(bookingFixture);
    const listed = await listBookings();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(bookingFixture.id);

    const updated = await updateBooking(bookingFixture.id, { status: 'Contacted' });
    expect(updated.status).toBe('Contacted');
    expect((await listBookings())[0].status).toBe('Contacted');

    await deleteBooking(bookingFixture.id);
    expect(await listBookings()).toEqual([]);
    expect(putMock).not.toHaveBeenCalled();
    expect(listMock).not.toHaveBeenCalled();
    expect(delMock).not.toHaveBeenCalled();
  });
});

describe('RAFAY filesystem media', () => {
  it('saves, reads and deletes site media without Vercel Blob', async () => {
    const saved = await saveMedia('site', 'hero.webp', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }), 'image/webp');
    expect(saved.url).toBe('/media/site/hero.webp');
    expect(saved.pathname).toBe('rafay/media/site/hero.webp');
    expect(Array.from(await readFile(join(root, 'media', 'site', 'hero.webp')))).toEqual([1, 2, 3]);

    const loaded = await readMedia('site/hero.webp');
    expect(Array.from(loaded?.body || [])).toEqual([1, 2, 3]);
    expect(loaded?.contentType).toBe('image/webp');

    await deleteMedia(saved.pathname);
    expect(await readMedia('site/hero.webp')).toBeNull();
    expect(putMock).not.toHaveBeenCalled();
    expect(delMock).not.toHaveBeenCalled();
  });

  it('rejects filesystem media traversal attempts', async () => {
    await expect(readMedia('../config/site-data.json')).rejects.toThrow('Invalid RAFAY media path');
  });
});
