import { afterEach, expect, it } from 'vitest';
import { GET } from './route';

const originalVercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
const originalRailwaySha = process.env.RAILWAY_GIT_COMMIT_SHA;
const originalGithubSha = process.env.GITHUB_SHA;
const originalAdminKey = process.env.RAFAY_ADMIN_KEY;
const originalPublicToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalPrivateToken = process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN;

afterEach(() => {
  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  restore('VERCEL_GIT_COMMIT_SHA', originalVercelSha);
  restore('RAILWAY_GIT_COMMIT_SHA', originalRailwaySha);
  restore('GITHUB_SHA', originalGithubSha);
  restore('RAFAY_ADMIN_KEY', originalAdminKey);
  restore('BLOB_READ_WRITE_TOKEN', originalPublicToken);
  restore('RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN', originalPrivateToken);
});

it('reports the deployed commit without exposing secrets', async () => {
  process.env.VERCEL_GIT_COMMIT_SHA = 'abc123production';
  process.env.RAFAY_ADMIN_KEY = 'super-secret-admin-key-never-return-this';
  process.env.BLOB_READ_WRITE_TOKEN = 'public-token-never-return-this';
  process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN = 'private-token-never-return-this';

  const response = await GET();
  const text = await response.text();
  const payload = JSON.parse(text) as { ok: boolean; commit: string; runtime: string; time: string };

  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  expect(payload.commit).toBe('abc123production');
  expect(payload.runtime).toBe('vercel');
  expect(Number.isNaN(Date.parse(payload.time))).toBe(false);
  expect(text).not.toContain('super-secret-admin-key-never-return-this');
  expect(text).not.toContain('public-token-never-return-this');
  expect(text).not.toContain('private-token-never-return-this');
});

it('falls back to a non-secret unknown commit when deployment metadata is absent', async () => {
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  delete process.env.RAILWAY_GIT_COMMIT_SHA;
  delete process.env.GITHUB_SHA;

  const response = await GET();
  const payload = await response.json() as { ok: boolean; commit: string; runtime: string };

  expect(payload).toMatchObject({ ok: true, commit: 'unknown', runtime: 'node' });
});
