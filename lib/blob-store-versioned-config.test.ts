import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_DATA } from './defaults';

const { getMock, headMock, listMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  headMock: vi.fn(),
  listMock: vi.fn(),
  putMock: vi.fn()
}));

vi.mock('@vercel/blob', () => ({
  BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {},
  del: vi.fn(),
  get: getMock,
  head: headMock,
  list: listMock,
  put: putMock
}));

import {
  SiteDataConflictError,
  configVersionPrefix,
  loadSiteData,
  saveSiteData
} from './blob-store';

const original = {
  dataDir: process.env.RAFAY_DATA_DIR,
  token: process.env.BLOB_READ_WRITE_TOKEN,
  storeId: process.env.BLOB_STORE_ID,
  oidc: process.env.VERCEL_OIDC_TOKEN,
  publicStore: process.env.RAFAY_PUBLIC_MEDIA_BLOB_STORE_ID,
  publicBlobStore: process.env.RAFAY_PUBLIC_BLOB_STORE_ID
};

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function publicTokenEnv() {
  delete process.env.RAFAY_DATA_DIR;
  process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.RAFAY_PUBLIC_MEDIA_BLOB_STORE_ID;
  delete process.env.RAFAY_PUBLIC_BLOB_STORE_ID;
}

function jsonResult(data: unknown) {
  return {
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(data)));
        controller.close();
      }
    })
  };
}

function blob(pathname: string, etag: string, uploadedAt: string) {
  return {
    pathname,
    url: `https://assets.public.blob.vercel-storage.com/${pathname}`,
    etag,
    uploadedAt: new Date(uploadedAt)
  };
}

afterEach(() => {
  getMock.mockReset();
  headMock.mockReset();
  listMock.mockReset();
  putMock.mockReset();
  restore('RAFAY_DATA_DIR', original.dataDir);
  restore('BLOB_READ_WRITE_TOKEN', original.token);
  restore('BLOB_STORE_ID', original.storeId);
  restore('VERCEL_OIDC_TOKEN', original.oidc);
  restore('RAFAY_PUBLIC_MEDIA_BLOB_STORE_ID', original.publicStore);
  restore('RAFAY_PUBLIC_BLOB_STORE_ID', original.publicBlobStore);
});

describe('RAFAY immutable config versions', () => {
  it('uses the canonical version prefix', () => {
    expect(configVersionPrefix()).toBe('rafay/config/versions/');
  });

  it('loads the newest immutable version and skips the legacy object', async () => {
    publicTokenEnv();
    const newer = { ...DEFAULT_SITE_DATA, version: 5, updatedAt: '2026-09-14T02:00:00.000Z' };
    listMock.mockResolvedValueOnce({
      blobs: [
        blob('rafay/config/versions/2026-09-14T01-00-00-000Z-a.json', 'etag-older', '2026-09-14T01:00:00.000Z'),
        blob('rafay/config/versions/2026-09-14T02-00-00-000Z-b.json', 'etag-newer', '2026-09-14T02:00:00.000Z')
      ],
      cursor: undefined
    });
    getMock.mockResolvedValueOnce(jsonResult(newer));

    const result = await loadSiteData();

    expect(result.data.version).toBe(5);
    expect(result.etag).toBe('etag-newer');
    expect(getMock).toHaveBeenCalledWith(
      'https://assets.public.blob.vercel-storage.com/rafay/config/versions/2026-09-14T02-00-00-000Z-b.json',
      expect.objectContaining({ access: 'public', token: 'public_rw_ci' })
    );
    expect(headMock).not.toHaveBeenCalled();
  });

  it('falls back to the legacy stable object only when no immutable version exists', async () => {
    publicTokenEnv();
    listMock.mockResolvedValueOnce({ blobs: [], cursor: undefined });
    headMock.mockResolvedValueOnce({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      etag: 'etag-legacy'
    });
    getMock.mockResolvedValueOnce(jsonResult(DEFAULT_SITE_DATA));

    const result = await loadSiteData();

    expect(result.etag).toBe('etag-legacy');
    expect(result.data.brandName).toBe('RAFAY');
  });

  it('seeds the first immutable version when both versioned and legacy config are absent', async () => {
    publicTokenEnv();
    listMock.mockResolvedValueOnce({ blobs: [], cursor: undefined });
    const notFound = new Error('Vercel Blob: The requested blob does not exist');
    notFound.name = 'BlobNotFoundError';
    headMock.mockRejectedValueOnce(notFound);
    putMock.mockResolvedValueOnce({
      pathname: 'rafay/config/versions/seed.json',
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/versions/seed.json',
      etag: 'etag-seeded'
    });

    const result = await loadSiteData();

    expect(result.etag).toBe('etag-seeded');
    expect(result.data.brandName).toBe('RAFAY');
    expect(putMock).toHaveBeenCalledWith(
      expect.stringMatching(/^rafay\/config\/versions\/.+\.json$/),
      expect.any(String),
      expect.objectContaining({
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
        token: 'public_rw_ci'
      })
    );
  });

  it('saves by creating a new immutable object without overwrite options', async () => {
    publicTokenEnv();
    const current = { ...DEFAULT_SITE_DATA, version: 4, updatedAt: '2026-09-14T02:00:00.000Z' };
    listMock.mockResolvedValueOnce({
      blobs: [blob('rafay/config/versions/current.json', 'etag-current', '2026-09-14T02:00:00.000Z')],
      cursor: undefined
    });
    getMock.mockResolvedValueOnce(jsonResult(current));
    putMock.mockResolvedValueOnce({
      pathname: 'rafay/config/versions/next.json',
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/versions/next.json',
      etag: 'etag-next'
    });

    const result = await saveSiteData(current, 'etag-current');

    expect(result.etag).toBe('etag-next');
    expect(result.data.version).toBe(5);
    expect(putMock).toHaveBeenCalledWith(
      expect.stringMatching(/^rafay\/config\/versions\/.+\.json$/),
      expect.any(String),
      expect.objectContaining({ access: 'public', addRandomSuffix: false, token: 'public_rw_ci' })
    );
    const options = putMock.mock.calls.at(-1)?.[2];
    expect(options).not.toHaveProperty('allowOverwrite');
    expect(options).not.toHaveProperty('ifMatch');
  });

  it('rejects a stale client etag before writing another version', async () => {
    publicTokenEnv();
    const current = { ...DEFAULT_SITE_DATA, version: 4, updatedAt: '2026-09-14T02:00:00.000Z' };
    listMock.mockResolvedValueOnce({
      blobs: [blob('rafay/config/versions/current.json', 'etag-server', '2026-09-14T02:00:00.000Z')],
      cursor: undefined
    });
    getMock.mockResolvedValueOnce(jsonResult(current));

    await expect(saveSiteData(current, 'etag-client-old')).rejects.toBeInstanceOf(SiteDataConflictError);
    expect(putMock).not.toHaveBeenCalled();
  });

  it('immediately reloads the newly saved immutable version', async () => {
    publicTokenEnv();
    const current = { ...DEFAULT_SITE_DATA, version: 7, updatedAt: '2026-09-14T02:00:00.000Z' };
    const next = { ...current, version: 8, updatedAt: '2026-09-14T03:00:00.000Z' };

    listMock
      .mockResolvedValueOnce({
        blobs: [blob('rafay/config/versions/current.json', 'etag-current', '2026-09-14T02:00:00.000Z')],
        cursor: undefined
      })
      .mockResolvedValueOnce({
        blobs: [
          blob('rafay/config/versions/current.json', 'etag-current', '2026-09-14T02:00:00.000Z'),
          blob('rafay/config/versions/next.json', 'etag-next', '2026-09-14T03:00:00.000Z')
        ],
        cursor: undefined
      });
    getMock
      .mockResolvedValueOnce(jsonResult(current))
      .mockResolvedValueOnce(jsonResult(next));
    putMock.mockResolvedValueOnce({
      pathname: 'rafay/config/versions/next.json',
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/versions/next.json',
      etag: 'etag-next'
    });

    const saved = await saveSiteData(current, 'etag-current');
    const reread = await loadSiteData();

    expect(saved.data.version).toBe(8);
    expect(saved.etag).toBe('etag-next');
    expect(reread.data.version).toBe(8);
    expect(reread.etag).toBe('etag-next');
  });
});
