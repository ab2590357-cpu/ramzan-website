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
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;
const originalDataDir = process.env.RAFAY_DATA_DIR;

function restore(name: 'BLOB_READ_WRITE_TOKEN' | 'BLOB_STORE_ID' | 'VERCEL_OIDC_TOKEN' | 'RAFAY_DATA_DIR', value: string | undefined) {
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
  restore('VERCEL_OIDC_TOKEN', originalOidcToken);
  restore('RAFAY_DATA_DIR', originalDataDir);
});

describe('RAFAY public Blob authentication', () => {
  it('treats a connected BLOB_STORE_ID as configured for Vercel OIDC', () => {
    delete process.env.RAFAY_DATA_DIR;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_oidc_ci';

    expect(hasBlobStorageConfig()).toBe(true);
  });

  it('lets the Blob SDK use automatic OIDC when no static token is present', async () => {
    delete process.env.RAFAY_DATA_DIR;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_oidc_ci';
    process.env.VERCEL_OIDC_TOKEN = 'runtime_oidc_ci';
    headMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      etag: 'etag-oidc-ci'
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

    expect(headMock).toHaveBeenCalledWith('rafay/config/site-data.json');
    expect(getMock).toHaveBeenCalledWith(
      'https://assets.public.blob.vercel-storage.com/rafay/config/site-data.json',
      { access: 'public' }
    );
  });

  it('passes a legacy/static public token explicitly when it is present', async () => {
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

  it('passes a static token explicitly when saving site data and media', async () => {
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

  it('uses automatic OIDC for media operations when no static token is present', async () => {
    delete process.env.RAFAY_DATA_DIR;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'store_oidc_ci';
    process.env.VERCEL_OIDC_TOKEN = 'runtime_oidc_ci';
    putMock.mockResolvedValue({
      url: 'https://assets.public.blob.vercel-storage.com/rafay/media/site/hero.webp',
      pathname: 'rafay/media/site/hero.webp'
    });

    await saveMedia('site', 'hero.webp', new Blob(['image'], { type: 'image/webp' }), 'image/webp');
    await listMedia();
    await deleteMedia('rafay/media/site/hero.webp');

    expect(putMock).toHaveBeenCalledWith(
      'rafay/media/site/hero.webp',
      expect.any(Blob),
      expect.objectContaining({ access: 'public', addRandomSuffix: false, contentType: 'image/webp' })
    );
    expect(putMock.mock.calls[0]?.[2]).not.toHaveProperty('token');
    expect(listMock).toHaveBeenCalledWith({ prefix: 'rafay/media/', limit: 1000 });
    expect(delMock).toHaveBeenCalledWith('rafay/media/site/hero.webp');
  });
});
