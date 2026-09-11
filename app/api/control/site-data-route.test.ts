import { afterEach, expect, it } from 'vitest';
import { GET, PUT } from './[secret]/site-data/route';
import { DEFAULT_SITE_DATA } from '@/lib/defaults';

const originalAdminKey = process.env.RAFAY_ADMIN_KEY;
const originalDataDir = process.env.RAFAY_DATA_DIR;

afterEach(() => {
  if (originalAdminKey === undefined) delete process.env.RAFAY_ADMIN_KEY;
  else process.env.RAFAY_ADMIN_KEY = originalAdminKey;
  if (originalDataDir === undefined) delete process.env.RAFAY_DATA_DIR;
  else process.env.RAFAY_DATA_DIR = originalDataDir;
});

it('does not reveal admin data for an invalid secret', async () => {
  process.env.RAFAY_ADMIN_KEY = 'rafay-ci-secret-key-that-is-long-enough';
  const response = await GET(new Request('https://example.test/api/control/wrong/site-data'), {
    params: Promise.resolve({ secret: 'wrong' })
  });
  expect(response.status).toBe(404);
  expect(await response.text()).not.toMatch(/admin|site-data/i);
});

it('returns JSON when persistence fails instead of letting the route become an empty 500 response', async () => {
  const secret = 'rafay-ci-secret-key-that-is-long-enough';
  process.env.RAFAY_ADMIN_KEY = secret;
  process.env.RAFAY_DATA_DIR = '/tmp/rafay-site-data-route-test';

  const response = await PUT(
    new Request(`https://example.test/api/control/${secret}/site-data`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: DEFAULT_SITE_DATA, etag: 'blob-read-error' })
    }),
    { params: Promise.resolve({ secret }) }
  );

  expect(response.status).toBe(503);
  expect(response.headers.get('content-type')).toMatch(/application\/json/i);
  expect(await response.json()).toEqual({ error: 'Site content storage is temporarily unavailable. Please reload and try again.' });
});
