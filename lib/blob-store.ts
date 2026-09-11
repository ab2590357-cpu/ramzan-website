import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { BlobPreconditionFailedError, del, get, head, list, put } from '@vercel/blob';
import { BookingRequestSchema, SiteDataSchema, type BookingRequest, type SiteData } from './domain';
import { DEFAULT_SITE_DATA } from './defaults';
import { safeFileName } from './validators';

const CONFIG_PATH = 'rafay/config/site-data.json';
const BOOKING_PREFIX = 'rafay/bookings/';
const MEDIA_PREFIX = 'rafay/media/';
const UNCONFIGURED_ETAG = 'blob-not-configured';
const READ_ERROR_ETAG = 'blob-read-error';

export class SiteDataConflictError extends Error {
  constructor() {
    super('Site data changed since it was loaded.');
    this.name = 'SiteDataConflictError';
  }
}

function filesystemRoot(): string | null {
  const root = process.env.RAFAY_DATA_DIR?.trim();
  return root && isAbsolute(root) ? root : null;
}

function localEtag(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function localConfigFile(root: string): string {
  return join(root, 'config', 'site-data.json');
}

function localBookingFile(root: string, id: string): string {
  return join(root, 'bookings', `${safeFileName(id)}.json`);
}

function isMissingFile(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'ENOENT');
}

async function atomicWrite(path: string, body: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.${crypto.randomUUID()}.tmp`;
  await writeFile(tempPath, body);
  await rename(tempPath, path);
}

async function seedLocalSiteData(root: string): Promise<{ data: SiteData; etag: string }> {
  const seeded = SiteDataSchema.parse({ ...DEFAULT_SITE_DATA, updatedAt: new Date().toISOString() });
  const text = JSON.stringify(seeded);
  await atomicWrite(localConfigFile(root), text);
  return { data: seeded, etag: localEtag(text) };
}

async function loadLocalSiteData(root: string): Promise<{ data: SiteData; etag: string }> {
  try {
    const text = await readFile(localConfigFile(root), 'utf8');
    return { data: SiteDataSchema.parse(JSON.parse(text)), etag: localEtag(text) };
  } catch (error) {
    if (isMissingFile(error)) return seedLocalSiteData(root);
    throw error;
  }
}

async function saveLocalSiteData(root: string, next: SiteData, expectedEtag: string): Promise<{ data: SiteData; etag: string }> {
  if (expectedEtag === READ_ERROR_ETAG) {
    throw new Error('Persistent storage is temporarily unavailable. Reload after the storage connection is healthy.');
  }

  const current = await loadLocalSiteData(root);
  if (current.etag !== expectedEtag) throw new SiteDataConflictError();

  const validated = SiteDataSchema.parse({
    ...next,
    brandName: 'RAFAY',
    updatedAt: new Date().toISOString(),
    version: next.version + 1
  });
  const text = JSON.stringify(validated);
  await atomicWrite(localConfigFile(root), text);
  return { data: validated, etag: localEtag(text) };
}

async function listLocalBookings(root: string): Promise<BookingRequest[]> {
  const directory = join(root, 'bookings');
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }

  const bookings = await Promise.all(
    names
      .filter((name) => name.endsWith('.json'))
      .map(async (name) => {
        const text = await readFile(join(directory, name), 'utf8');
        return BookingRequestSchema.parse(JSON.parse(text));
      })
  );
  return bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function hasBlobStorageConfig(): boolean {
  if (filesystemRoot()) return true;
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  return Boolean(process.env.BLOB_STORE_ID?.trim());
}

export function hasPrivateBookingStorageConfig(): boolean {
  if (filesystemRoot()) return true;
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

function defaultSiteDataAfterReadError(): { data: SiteData; etag: string } {
  return { data: DEFAULT_SITE_DATA, etag: READ_ERROR_ETAG };
}

export async function loadSiteData(): Promise<{ data: SiteData; etag: string }> {
  const root = filesystemRoot();
  if (root) {
    try {
      return await loadLocalSiteData(root);
    } catch {
      return defaultSiteDataAfterReadError();
    }
  }

  if (!hasBlobStorageConfig()) {
    return { data: DEFAULT_SITE_DATA, etag: UNCONFIGURED_ETAG };
  }

  try {
    const metadata = await head(CONFIG_PATH);
    const raw = await readJson<unknown>(metadata.url, 'public');
    return { data: SiteDataSchema.parse(raw), etag: metadata.etag };
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: unknown }).status) : undefined;
    const name = typeof error === 'object' && error && 'name' in error ? String((error as { name?: unknown }).name) : undefined;
    if (status !== 404 && name !== 'BlobNotFoundError') return defaultSiteDataAfterReadError();

    try {
      const seeded = { ...DEFAULT_SITE_DATA, updatedAt: new Date().toISOString() };
      const blob = await put(CONFIG_PATH, JSON.stringify(seeded), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json'
      });
      const metadata = await head(blob.url);
      return { data: seeded, etag: metadata.etag };
    } catch {
      return defaultSiteDataAfterReadError();
    }
  }
}

export async function saveSiteData(next: SiteData, expectedEtag: string): Promise<{ data: SiteData; etag: string }> {
  const root = filesystemRoot();
  if (root) return saveLocalSiteData(root, next, expectedEtag);

  if (expectedEtag === READ_ERROR_ETAG) {
    throw new Error('Blob storage is temporarily unavailable. Reload after the storage connection is healthy.');
  }
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
  const validated = BookingRequestSchema.parse(booking);
  const root = filesystemRoot();
  if (root) {
    await atomicWrite(localBookingFile(root, validated.id), JSON.stringify(validated));
    return validated;
  }

  const token = privateBookingToken();
  await put(bookingPath(validated.id), JSON.stringify(validated), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    token
  });
  return validated;
}

export async function listBookings(): Promise<BookingRequest[]> {
  const root = filesystemRoot();
  if (root) return listLocalBookings(root);

  const token = privateBookingToken();
  const result = await list({ prefix: BOOKING_PREFIX, limit: 1000, token });
  const bookings = await Promise.all(result.blobs.map(async (blob) => {
    const raw = await readJson<unknown>(blob.url, 'private', token);
    return BookingRequestSchema.parse(raw);
  }));
  return bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateBooking(id: string, patch: Partial<Pick<BookingRequest, 'status'>>): Promise<BookingRequest> {
  const root = filesystemRoot();
  if (root) {
    const path = localBookingFile(root, id);
    let current: BookingRequest;
    try {
      current = BookingRequestSchema.parse(JSON.parse(await readFile(path, 'utf8')));
    } catch (error) {
      if (isMissingFile(error)) throw new Error('Booking not found');
      throw error;
    }
    const next = BookingRequestSchema.parse({ ...current, ...patch, updatedAt: new Date().toISOString() });
    await atomicWrite(path, JSON.stringify(next));
    return next;
  }

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
  const root = filesystemRoot();
  if (root) {
    await rm(localBookingFile(root, id), { force: true });
    return;
  }

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
