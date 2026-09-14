import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_DATA } from './defaults';

const { getMock, headMock, listMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  headMock: vi.fn(),
  listMock: vi.fn(async () => ({ blobs: [] })),
  putMock: vi.fn()
}));

vi.mock('@vercel/blob', () => ({
  BlobNotFoundError: class BlobNotFoundError extends Error {},
  BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {},
  del: vi.fn(),
  get: getMock,
  head: headMock,
  list: listMock,
  put: putMock
}));

import { loadSiteData, saveSiteData } from './blob-store';

const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalBlobStoreId = process.env.BLOB_STORE_ID;
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;
const originalDataDir = process.env.RAFAY_DATA_DIR;

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

afterEach(() => {
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
  if (originalDataDir === undefined) delete process.env.RAFAY_DATA_DIR;
  else process.env.RAFAY_DATA_DIR = originalDataDir;
});

describe('RAFAY Blob write ETag handling', () => {
  it('uses the ETag returned by the immutable seed put without a second head request', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';
    delete process.env.RAFAY_DATA_DIR;

    const notFound = new Error('Blob not found');
    notFound.name = 'BlobNotFoundError';
    headMock.mockRejectedValueOnce(notFound);
    putMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/versions/seed.json',
      etag: 'etag-from-put'
    });

    const result = await loadSiteData();

    expect(result.etag).toBe('etag-from-put');
    expect(headMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith(
      expect.stringMatching(/^rafay\/config\/versions\/.+\.json$/),
      expect.any(String),
      expect.objectContaining({ access: 'public', token: 'public_rw_ci' })
    );
  });

  it('uses the ETag returned by a successful immutable config put without a follow-up head request', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';
    delete process.env.RAFAY_DATA_DIR;
    const persisted = { ...DEFAULT_SITE_DATA, version: DEFAULT_SITE_DATA.version + 1, updatedAt: '2026-09-14T04:00:00.000Z' };
    listMock.mockResolvedValueOnce({
      blobs: [{
        pathname: 'rafay/config/versions/current.json',
        url: 'https://assets.public.blob.vercel-storage.com/rafay/config/versions/current.json',
        etag: 'etag-before-save',
        uploadedAt: new Date('2026-09-14T03:00:00.000Z')
      }]
    });
    getMock
      .mockResolvedValueOnce(jsonResult(DEFAULT_SITE_DATA))
      .mockResolvedValueOnce(jsonResult(persisted));
    putMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/versions/next.json',
      etag: 'etag-updated'
    });

    const result = await saveSiteData(DEFAULT_SITE_DATA, 'etag-before-save');

    expect(result.etag).toBe('etag-updated');
    expect(headMock).not.toHaveBeenCalled();
  });

  it('reads an immutable public config version directly by its unique URL', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';
    delete process.env.RAFAY_DATA_DIR;
    listMock.mockResolvedValueOnce({
      blobs: [{
        pathname: 'rafay/config/versions/current.json',
        url: 'https://assets.public.blob.vercel-storage.com/rafay/config/versions/current.json',
        etag: 'etag-current',
        uploadedAt: new Date('2026-09-14T03:00:00.000Z')
      }]
    });
    getMock.mockResolvedValue(jsonResult(DEFAULT_SITE_DATA));

    await loadSiteData();

    expect(getMock).toHaveBeenCalledWith(
      'https://assets.public.blob.vercel-storage.com/rafay/config/versions/current.json',
      expect.objectContaining({ access: 'public', useCache: false, token: 'public_rw_ci' })
    );
    expect(headMock).not.toHaveBeenCalled();
  });
});
