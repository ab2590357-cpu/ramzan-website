import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_DATA } from './defaults';

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

import { loadSiteData } from './blob-store';

const trackedEnv = [
  'RAFAY_DATA_DIR',
  'BLOB_READ_WRITE_TOKEN',
  'BLOB_STORE_ID',
  'VERCEL_OIDC_TOKEN',
  'RAFAY_PUBLIC_MEDIA_BLOB_STORE_ID'
] as const;

const originalEnv = Object.fromEntries(trackedEnv.map((name) => [name, process.env[name]]));

function restoreEnv() {
  for (const name of trackedEnv) {
    const value = originalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

afterEach(() => {
  restoreEnv();
  delMock.mockReset();
  getMock.mockReset();
  headMock.mockReset();
  listMock.mockReset();
  listMock.mockResolvedValue({ blobs: [] });
  putMock.mockReset();
});

describe('RAFAY public Blob store selection', () => {
  it('prefers a public/media-named connected store over the ambiguous default store', async () => {
    delete process.env.RAFAY_DATA_DIR;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_default_may_be_private';
    process.env.RAFAY_PUBLIC_MEDIA_BLOB_STORE_ID = 'store_public_media';
    process.env.VERCEL_OIDC_TOKEN = 'oidc_ci';

    headMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      etag: 'etag-public'
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

    expect(result.etag).toBe('etag-public');
    expect(headMock).toHaveBeenCalledWith(
      'rafay/config/site-data.json',
      expect.objectContaining({ storeId: 'store_public_media', oidcToken: 'oidc_ci' })
    );
    expect(getMock).toHaveBeenCalledWith(
      'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      expect.objectContaining({ access: 'public', storeId: 'store_public_media', oidcToken: 'oidc_ci' })
    );
  });
});
