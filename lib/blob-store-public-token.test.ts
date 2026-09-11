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

import { deleteMedia, hasBlobStorageConfig, listMedia, loadSiteData, saveMedia, saveSiteData } from './blob-store';

const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalStoreId = process.env.BLOB_STORE_ID;
const originalDataDir = process.env.RAFAY_DATA_DIR;

function restore(name: 'BLOB_READ_WRITE_TOKEN' | 'BLOB_STORE_ID' | 'RAFAY_DATA_DIR', value: string | undefined) {
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
  restore('BLOB_READ_WRITE_TOKEN', originalToken);
  restore('BLOB_STORE_ID', originalStoreId);
  restore('RAFAY_DATA_DIR', originalDataDir);
});

describe('RAFAY public Blob token handling', () => {
  it('does not treat BLOB_STORE_ID alone as writable public storage', () => {
    delete process.env.RAFAY_DATA_DIR;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_without_rw_token';

    expect(hasBlobStorageConfig()).toBe(false);
  });

  it('passes the public token explicitly when loading site data', async () => {
    delete process.env.RAFAY_DATA_DIR;
    process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';
    process.env.BLOB_STORE_ID = 'store_ci';
    headMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      etag: 'etag-ci'
    });
    getMock.mockResolvedValue({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(DEFAULT_SITE_DATA)));
          controller.close();
        }
      })
    });

    await loadSiteData();

    expect(headMock).toHaveBeenCalledWith('rafay/config/site-data.json', { token: 'public_rw_ci' });
    expect(getMock).toHaveBeenCalledWith(
      'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      { access: 'public', token: 'public_rw_ci' }
    );
  });

  it('passes the public token explicitly when saving site data and media', async () => {
    delete process.env.RAFAY_DATA_DIR;
    process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';
    putMock
      .mockResolvedValueOnce({ url: 'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json', pathname: 'rafay/config/site-data.json', etag: 'etag-next' })
      .mockResolvedValueOnce({ url: 'https://assets.public.blob.vercel-storage.com/rafay/media/site/hero.webp', pathname: 'rafay/media/site/hero.webp' });

    await saveSiteData(DEFAULT_SITE_DATA, 'etag-current');
    await saveMedia('site', 'hero.webp', new Blob(['image'], { type: 'image/webp' }), 'image/webp');

    expect(putMock).toHaveBeenNthCalledWith(
      1,
      'rafay/config/site-data.json',
      expect.any(String),
      expect.objectContaining({ token: 'public_rw_ci', access: 'public', ifMatch: 'etag-current' })
    );
    expect(putMock).toHaveBeenNthCalledWith(
      2,
      'rafay/media/site/hero.webp',
      expect.any(Blob),
      expect.objectContaining({ token: 'public_rw_ci', access: 'public' })
    );
  });

  it('passes the public token explicitly when listing and deleting media', async () => {
    delete process.env.RAFAY_DATA_DIR;
    process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';

    await listMedia();
    await deleteMedia('rafay/media/site/hero.webp');

    expect(listMock).toHaveBeenCalledWith({ prefix: 'rafay/media/', limit: 1000, token: 'public_rw_ci' });
    expect(delMock).toHaveBeenCalledWith('rafay/media/site/hero.webp', { token: 'public_rw_ci' });
  });
});
