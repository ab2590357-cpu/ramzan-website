import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveMedia } from '@/lib/blob-store';
import { GET } from './[...path]/route';

vi.mock('@vercel/blob', () => ({
  BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {},
  del: vi.fn(),
  get: vi.fn(),
  head: vi.fn(),
  list: vi.fn(),
  put: vi.fn()
}));

const originalDataDir = process.env.RAFAY_DATA_DIR;
let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'rafay-media-route-'));
  process.env.RAFAY_DATA_DIR = root;
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.RAFAY_DATA_DIR;
  else process.env.RAFAY_DATA_DIR = originalDataDir;
});

describe('RAFAY filesystem media route', () => {
  it('serves persisted media with its image content type', async () => {
    await saveMedia('site', 'hero.webp', new Blob([new Uint8Array([7, 8, 9])], { type: 'image/webp' }), 'image/webp');

    const response = await GET(new Request('https://rafay.test/media/site/hero.webp'), {
      params: Promise.resolve({ path: ['site', 'hero.webp'] })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toContain('immutable');
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([7, 8, 9]);
  });

  it('does not serve paths that escape the RAFAY media directory', async () => {
    const response = await GET(new Request('https://rafay.test/media/../config/site-data.json'), {
      params: Promise.resolve({ path: ['..', 'config', 'site-data.json'] })
    });

    expect([400, 404]).toContain(response.status);
  });
});
