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

import { loadSiteData } from './blob-store';

const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalBlobStoreId = process.env.BLOB_STORE_ID;
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;

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
});

describe('RAFAY Blob read resilience', () => {
  it('keeps site data readable when Blob bootstrap fails after a fresh-store not-found', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_ci';
    delete process.env.VERCEL_OIDC_TOKEN;

    const notFound = new Error('Blob not found');
    notFound.name = 'BlobNotFoundError';
    headMock.mockRejectedValueOnce(notFound);
    putMock.mockRejectedValueOnce(new Error('Blob bootstrap failed'));

    const result = await loadSiteData();

    expect(result.data.brandName).toBe(DEFAULT_SITE_DATA.brandName);
    expect(result.etag).toBe('blob-read-error');
  });

  it('keeps site data readable when Blob authentication or store routing fails', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_ci';
    delete process.env.VERCEL_OIDC_TOKEN;
    headMock.mockRejectedValueOnce(new Error('Blob authentication failed'));

    const result = await loadSiteData();

    expect(result.data.brandName).toBe(DEFAULT_SITE_DATA.brandName);
    expect(result.etag).toBe('blob-read-error');
    expect(putMock).not.toHaveBeenCalled();
  });
});
