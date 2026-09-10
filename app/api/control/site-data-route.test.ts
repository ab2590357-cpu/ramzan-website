import { afterEach, expect, it } from 'vitest';
import { GET } from './[secret]/site-data/route';

const original = process.env.RAFAY_ADMIN_KEY;

afterEach(() => {
  if (original === undefined) delete process.env.RAFAY_ADMIN_KEY;
  else process.env.RAFAY_ADMIN_KEY = original;
});

it('does not reveal admin data for an invalid secret', async () => {
  process.env.RAFAY_ADMIN_KEY = 'rafay-ci-secret-key-that-is-long-enough';
  const response = await GET(new Request('https://example.test/api/control/wrong/site-data'), {
    params: Promise.resolve({ secret: 'wrong' })
  });
  expect(response.status).toBe(404);
  expect(await response.text()).not.toMatch(/admin|site-data/i);
});
