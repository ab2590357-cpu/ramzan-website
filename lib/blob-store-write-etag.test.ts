import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_DATA } from './defaults';

const { getMock, headMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  headMock: vi.fn(),
  putMock: vi.fn()
}));

vi.mock('@vercel/blob', () => ({
  BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {},
  del: vi.fn(),
  get: getMock,
  head: headMock,
  list: vi.fn(async () => ({ blobs: [] })),
  put: putMock
}));

import { loadSiteData, saveSiteData } from './blob-store';

const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalBlobStoreId = process.env.BLOB_STORE_ID;
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;
const originalDataDir = process.env.RAFAY_DATA_DIR;

afterEach(() => {
  getMock.mockReset();
  headMock.mockReset();
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
  it('uses the ETag returned by the seed put without a second head request', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';
    delete process.env.RAFAY_DATA_DIR;

    const notFound = new Error('Blob not found');
    notFound.name = 'BlobNotFoundError';
    headMock.mockRejectedValueOnce(notFound);
    putMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      etag: 'etag-from-put'
    });

    const result = await loadSiteData();

    expect(result.etag).toBe('etag-from-put');
    expect(headMock).toHaveBeenCalledTimes(1);
  });

  it('uses the ETag returned by a successful config put without a follow-up head request', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';
    delete process.env.RAFAY_DATA_DIR;
    putMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      etag: 'etag-updated'
    });

    const result = await saveSiteData(DEFAULT_SITE_DATA, 'etag-before-save');

    expect(result.etag).toBe('etag-updated');
    expect(headMock).not.toHaveBeenCalled();
  });
});
