import { BlobPreconditionFailedError, del, get, head, list, put } from '@vercel/blob';
import { BookingRequestSchema, SiteDataSchema, type BookingRequest, type SiteData } from './domain';
import { DEFAULT_SITE_DATA } from './defaults';
import { safeFileName } from './validators';

const CONFIG_PATH = 'rafay/config/site-data.json';
const BOOKING_PREFIX = 'rafay/bookings/';
const MEDIA_PREFIX = 'rafay/media/';
const UNCONFIGURED_ETAG = 'blob-not-configured';

export class SiteDataConflictError extends Error {
  constructor() {
    super('Site data changed since it was loaded.');
    this.name = 'SiteDataConflictError';
  }
}

export function hasBlobStorageConfig(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  return Boolean(process.env.BLOB_STORE_ID?.trim());
}

export function hasPrivateBookingStorageConfig(): boolean {
  return Boolean(process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN?.trim());
}

function privateBookingToken(): string {
  const token = process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error('Private booking storage is not configured.');
  return token;
}

export function configPath(): string {
  return CONFIG_PATH;
}

export function bookingPath(id: string): string {
  return `${BOOKING_PREFIX}${safeFileName(id)}.json`;
}

export function mediaPath(scope: 'profile' | 'site', filename: string, profileId?: string): string {
  const name = safeFileName(filename);
  if (scope === 'profile') {
    if (!profileId) throw new Error('profileId is required for profile media');
    return `${MEDIA_PREFIX}profiles/${safeFileName(profileId)}/${name}`;
  }
  return `${MEDIA_PREFIX}site/${name}`;
}

async function readJson<T>(urlOrPathname: string, access: 'public' | 'private', token?: string): Promise<T | null> {
  const result = await get(urlOrPathname, token ? { access, token } : { access });
  if (!result) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

export async function loadSiteData(): Promise<{ data: SiteData; etag: string }> {
  if (!hasBlobStorageConfig()) {
    return { data: DEFAULT_SITE_DATA, etag: UNCONFIGURED_ETAG };
  }

  try {
    const metadata = await head(CONFIG_PATH);
    const raw = await readJson<unknown>(metadata.url, 'public');
    return { data: SiteDataSchema.parse(raw), etag: metadata.etag };
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: unknown }).status) : undefined;
    if (status !== 404) throw error;
    const seeded = { ...DEFAULT_SITE_DATA, updatedAt: new Date().toISOString() };
    const blob = await put(CONFIG_PATH, JSON.stringify(seeded), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json'
    });
    const metadata = await head(blob.url);
    return { data: seeded, etag: metadata.etag };
  }
}

export async function saveSiteData(next: SiteData, expectedEtag: string): Promise<{ data: SiteData; etag: string }> {
  const validated = SiteDataSchema.parse({ ...next, brandName: 'RAFAY', updatedAt: new Date().toISOString(), version: next.version + 1 });
  try {
    await put(CONFIG_PATH, JSON.stringify(validated), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      ifMatch: expectedEtag,
      contentType: 'application/json'
    });
    const metadata = await head(CONFIG_PATH);
    return { data: validated, etag: metadata.etag };
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) throw new SiteDataConflictError();
    throw error;
  }
}

export async function createBooking(booking: BookingRequest): Promise<BookingRequest> {
  const token = privateBookingToken();
  const validated = BookingRequestSchema.parse(booking);
  await put(bookingPath(validated.id), JSON.stringify(validated), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    token
  });
  return validated;
}

export async function listBookings(): Promise<BookingRequest[]> {
  const token = privateBookingToken();
  const result = await list({ prefix: BOOKING_PREFIX, limit: 1000, token });
  const bookings = await Promise.all(result.blobs.map(async (blob) => {
    const raw = await readJson<unknown>(blob.url, 'private', token);
    return BookingRequestSchema.parse(raw);
  }));
  return bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateBooking(id: string, patch: Partial<Pick<BookingRequest, 'status'>>): Promise<BookingRequest> {
  const token = privateBookingToken();
  const path = bookingPath(id);
  const current = await readJson<unknown>(path, 'private', token);
  if (!current) throw new Error('Booking not found');
  const existing = BookingRequestSchema.parse(current);
  const next = BookingRequestSchema.parse({ ...existing, ...patch, updatedAt: new Date().toISOString() });
  await put(path, JSON.stringify(next), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', token });
  return next;
}

export async function deleteBooking(id: string): Promise<void> {
  const token = privateBookingToken();
  await del(bookingPath(id), { token });
}

export async function listMedia(prefix = MEDIA_PREFIX) {
  const result = await list({ prefix, limit: 1000 });
  return result.blobs;
}

export async function deleteMedia(pathname: string): Promise<void> {
  if (!pathname.startsWith(MEDIA_PREFIX)) throw new Error('Invalid RAFAY media path');
  await del(pathname);
}
