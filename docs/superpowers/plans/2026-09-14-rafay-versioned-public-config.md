# RAFAY Versioned Public Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make RAFAY admin site-content saves immediately readable and persistent on Vercel by replacing same-path public Blob overwrites with immutable versioned config objects.

**Architecture:** Keep filesystem storage, public media storage, and private booking storage unchanged. For Vercel public site config, treat `rafay/config/site-data.json` as a legacy migration source only; all new saves go to unique objects under `rafay/config/versions/`, and loads select the newest immutable object. Conflict detection compares the client's ETag with the current latest config before writing a new version.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, `@vercel/blob`, Zod, Vercel production runtime.

**Spec:** `docs/superpowers/specs/2026-09-14-rafay-versioned-public-config-design.md`

## Global Constraints

- Deploy only the Vercel project `rafay-web` (`prj_gbwP0nd79BHQ3t2zOlOflM4w3eFn`) in team `abdulteam` (`team_fEVwZgvggPdA34BsTjeGU1E1`).
- Do not intentionally deploy, promote, or reconfigure the separate Vercel project `rafay`.
- Do not push the final implementation to `main` during this work because both Vercel projects are Git-connected to the same repository; keep the verified implementation on `rafay-versioned-config` and deploy `rafay-web` directly.
- Do not add a new paid service or a new Blob store.
- Public hero/logo/profile media remain in `rafay/media/` and keep current public-Blob behavior.
- Private booking storage remains separate and unchanged.
- Never log admin secrets, Blob tokens, OIDC tokens, or complete store credentials.
- Preserve `blob-not-configured`, `blob-read-error`, and `SiteDataConflictError` semantics.
- Temporary diagnostic endpoints must not exist in the final production build.

---

### Task 1: Add immutable config selection and migration tests

**Files:**
- Create: `lib/blob-store-versioned-config.test.ts`
- Modify later in Task 2: `lib/blob-store.ts`

**Interfaces:**
- Consumes: existing `loadSiteData()`, `configPath()`, Vercel Blob `list/head/get/put` mocks.
- Produces test expectations for `configVersionPrefix(): string`, immutable version selection, legacy fallback, and fresh-store seeding.

- [ ] **Step 1: Write the failing version-selection tests**

Create `lib/blob-store-versioned-config.test.ts` with isolated Blob mocks and environment restoration. The first tests must cover these exact behaviors:

```ts
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

import { configVersionPrefix, loadSiteData } from './blob-store';

const original = {
  dataDir: process.env.RAFAY_DATA_DIR,
  token: process.env.BLOB_READ_WRITE_TOKEN,
  storeId: process.env.BLOB_STORE_ID,
  oidc: process.env.VERCEL_OIDC_TOKEN,
  publicStore: process.env.RAFAY_PUBLIC_MEDIA_BLOB_STORE_ID
};

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
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
});

function publicTokenEnv() {
  delete process.env.RAFAY_DATA_DIR;
  process.env.BLOB_READ_WRITE_TOKEN = 'public_rw_ci';
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

describe('RAFAY immutable config versions', () => {
  it('uses the canonical version prefix', () => {
    expect(configVersionPrefix()).toBe('rafay/config/versions/');
  });

  it('loads the newest immutable version and never reads the legacy object when versions exist', async () => {
    publicTokenEnv();
    const older = { ...DEFAULT_SITE_DATA, version: 4, updatedAt: '2026-09-14T01:00:00.000Z' };
    const newer = { ...DEFAULT_SITE_DATA, version: 5, updatedAt: '2026-09-14T02:00:00.000Z' };

    listMock.mockResolvedValueOnce({
      blobs: [
        {
          pathname: 'rafay/config/versions/2026-09-14T01-00-00-000Z-a.json',
          url: 'https://assets.public.blob.vercel-storage.com/older.json',
          etag: 'etag-older',
          uploadedAt: new Date('2026-09-14T01:00:00.000Z')
        },
        {
          pathname: 'rafay/config/versions/2026-09-14T02-00-00-000Z-b.json',
          url: 'https://assets.public.blob.vercel-storage.com/newer.json',
          etag: 'etag-newer',
          uploadedAt: new Date('2026-09-14T02:00:00.000Z')
        }
      ],
      cursor: undefined
    });
    getMock.mockResolvedValueOnce(jsonResult(newer));

    const result = await loadSiteData();

    expect(result.data.version).toBe(5);
    expect(result.etag).toBe('etag-newer');
    expect(getMock).toHaveBeenCalledWith(
      'https://assets.public.blob.vercel-storage.com/newer.json',
      expect.objectContaining({ access: 'public', token: 'public_rw_ci' })
    );
    expect(headMock).not.toHaveBeenCalled();
  });

  it('falls back to the legacy stable object only when no immutable versions exist', async () => {
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
});
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```bash
npm test -- lib/blob-store-versioned-config.test.ts
```

Expected: FAIL because `configVersionPrefix()` does not exist and `loadSiteData()` still targets only `rafay/config/site-data.json`.

- [ ] **Step 3: Add the fresh-store seed test**

Add a test where `list()` returns no versions, `head(legacy)` throws a Blob-not-found shaped error, and `put()` returns a blob under `rafay/config/versions/`. Assert that the seed write:

```ts
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
```

Also assert the result uses the ETag returned by that immutable `put()`.

- [ ] **Step 4: Re-run and keep the test RED for the intended reason**

Run:

```bash
npm test -- lib/blob-store-versioned-config.test.ts
```

Expected: FAIL on immutable-version behavior, not on syntax or mock setup.

- [ ] **Step 5: Commit the RED tests**

```bash
git add lib/blob-store-versioned-config.test.ts
git commit -m "test: define RAFAY immutable config loading"
```

---

### Task 2: Implement immutable version loading and legacy migration

**Files:**
- Modify: `lib/blob-store.ts`
- Test: `lib/blob-store-versioned-config.test.ts`
- Test: `lib/blob-store.test.ts`
- Test: `lib/blob-store-public-token.test.ts`

**Interfaces:**
- Consumes: `publicBlobAuthCandidates()`, `readJson()`, `SiteDataSchema`, legacy `CONFIG_PATH`.
- Produces: `configVersionPrefix(): string`, immutable config discovery, deterministic newest-version selection, legacy fallback, first-version seeding.

- [ ] **Step 1: Add immutable config constants and path helper**

In `lib/blob-store.ts`, retain the legacy stable path and add:

```ts
const CONFIG_PATH = 'rafay/config/site-data.json';
const CONFIG_VERSION_PREFIX = 'rafay/config/versions/';

export function configVersionPrefix(): string {
  return CONFIG_VERSION_PREFIX;
}

function configVersionPath(now = new Date(), id = crypto.randomUUID()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `${CONFIG_VERSION_PREFIX}${stamp}-${id}.json`;
}
```

Do not change `configPath()`; it remains the legacy migration path for compatibility with existing tests/callers.

- [ ] **Step 2: Add complete version listing and deterministic newest selection**

Add helpers that page through all config versions and choose newest by `uploadedAt`, with pathname as deterministic tie-breaker:

```ts
type PublicBlob = Awaited<ReturnType<typeof list>>['blobs'][number];

async function listConfigVersions(auth: BlobAuthOptions): Promise<PublicBlob[]> {
  const blobs: PublicBlob[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({
      prefix: CONFIG_VERSION_PREFIX,
      limit: 1000,
      ...(cursor ? { cursor } : {}),
      ...auth
    });
    blobs.push(...page.blobs);
    cursor = page.cursor;
  } while (cursor);

  return blobs;
}

function newestConfigVersion(blobs: PublicBlob[]): PublicBlob | null {
  if (blobs.length === 0) return null;
  return [...blobs].sort((a, b) => {
    const time = new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    if (time !== 0) return time;
    return b.pathname.localeCompare(a.pathname);
  })[0] ?? null;
}
```

- [ ] **Step 3: Add a single public-config loader for one auth candidate**

Implement a helper returning both data and ETag:

```ts
async function loadPublicSiteDataWithAuth(
  auth: BlobAuthOptions,
  seedWhenMissing: boolean
): Promise<{ data: SiteData; etag: string }> {
  const newest = newestConfigVersion(await listConfigVersions(auth));
  if (newest) {
    const raw = await readJson<unknown>(newest.url, 'public', auth);
    return { data: SiteDataSchema.parse(raw), etag: newest.etag };
  }

  try {
    const legacy = await head(CONFIG_PATH, auth);
    const raw = await readJson<unknown>(legacy.url, 'public', auth);
    return { data: SiteDataSchema.parse(raw), etag: legacy.etag };
  } catch (error) {
    if (!isBlobNotFound(error) || !seedWhenMissing) throw error;
  }

  const seeded = SiteDataSchema.parse({
    ...DEFAULT_SITE_DATA,
    updatedAt: new Date().toISOString()
  });
  const blob = await put(configVersionPath(), JSON.stringify(seeded), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    ...auth
  });
  return { data: seeded, etag: blob.etag };
}
```

Remove `versionedPublicBlobUrl()` and public-config dependence on query-string cache busting; immutable URLs make that workaround unnecessary.

- [ ] **Step 4: Route `loadSiteData()` through the new helper**

Preserve filesystem and unconfigured fallbacks. For each public auth candidate:

```ts
for (const auth of candidates) {
  try {
    return await loadPublicSiteDataWithAuth(auth, true);
  } catch (error) {
    lastError = error;
  }
}
```

If every candidate fails, keep `logPublicBlobFailure('site-data read/bootstrap', lastError)` and return `blob-read-error` exactly as today.

- [ ] **Step 5: Update existing expectations that assumed same-path config reads**

In `lib/blob-store.test.ts` and `lib/blob-store-public-token.test.ts`, update only site-config expectations so they first mock `list({ prefix: 'rafay/config/versions/', ... })`. Keep media and booking expectations unchanged.

- [ ] **Step 6: Run focused tests**

```bash
npm test -- lib/blob-store-versioned-config.test.ts lib/blob-store.test.ts lib/blob-store-public-token.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the loading/migration implementation**

```bash
git add lib/blob-store.ts lib/blob-store-versioned-config.test.ts lib/blob-store.test.ts lib/blob-store-public-token.test.ts
git commit -m "fix: load RAFAY config from immutable Blob versions"
```

---

### Task 3: Make saves append-only and preserve optimistic conflicts

**Files:**
- Modify: `lib/blob-store.ts`
- Modify: `lib/blob-store-versioned-config.test.ts`
- Modify if needed: `lib/blob-store-write-etag.test.ts`

**Interfaces:**
- Consumes: `loadPublicSiteDataWithAuth(auth, false)`, `configVersionPath()`, `SiteDataConflictError`.
- Produces: `saveSiteData(next, expectedEtag)` that creates a unique public Blob and never overwrites an existing config object.

- [ ] **Step 1: Write the failing append-only save test**

Add a test that exposes one existing immutable version with ETag `etag-current`, calls `saveSiteData(DEFAULT_SITE_DATA, 'etag-current')`, and asserts:

```ts
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

const options = putMock.mock.calls.at(-1)?.[2];
expect(options).not.toHaveProperty('allowOverwrite');
expect(options).not.toHaveProperty('ifMatch');
```

Also assert the returned `data.version` is `current.data.version + 1` and the returned ETag is the new Blob ETag.

- [ ] **Step 2: Write the failing stale-ETag conflict test**

Mock current latest ETag `etag-server`, call:

```ts
await expect(saveSiteData(DEFAULT_SITE_DATA, 'etag-client-old')).rejects.toBeInstanceOf(SiteDataConflictError);
expect(putMock).not.toHaveBeenCalled();
```

- [ ] **Step 3: Run focused test and verify RED**

```bash
npm test -- lib/blob-store-versioned-config.test.ts
```

Expected: FAIL because current `saveSiteData()` still overwrites `CONFIG_PATH` with `allowOverwrite` + `ifMatch`.

- [ ] **Step 4: Implement append-only save**

For each public auth candidate, first resolve current server state without seeding:

```ts
for (const auth of candidates) {
  try {
    const current = await loadPublicSiteDataWithAuth(auth, false);
    if (current.etag !== expectedEtag) {
      sawConflict = true;
      continue;
    }

    const validated = SiteDataSchema.parse({
      ...next,
      brandName: 'RAFAY',
      updatedAt: new Date().toISOString(),
      version: current.data.version + 1
    });

    const blob = await put(configVersionPath(), JSON.stringify(validated), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      ...auth
    });

    return { data: validated, etag: blob.etag };
  } catch (error) {
    if (error instanceof SiteDataConflictError) sawConflict = true;
    else lastError = error;
  }
}
```

If `sawConflict` is true and no candidate succeeds, throw `SiteDataConflictError`. Otherwise preserve the existing storage failure logging/throw behavior.

- [ ] **Step 5: Add immediate read-after-save regression coverage**

After the save mock returns a unique URL/ETag, make the next `list()` expose that newly written version and make `get()` return its body. Assert:

```ts
const saved = await saveSiteData(DEFAULT_SITE_DATA, 'etag-current');
const reread = await loadSiteData();
expect(reread.etag).toBe(saved.etag);
expect(reread.data.version).toBe(saved.data.version);
```

The test must not require query-string cache busting because the saved URL is unique.

- [ ] **Step 6: Run focused tests**

```bash
npm test -- lib/blob-store-versioned-config.test.ts lib/blob-store-write-etag.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit append-only save behavior**

```bash
git add lib/blob-store.ts lib/blob-store-versioned-config.test.ts lib/blob-store-write-etag.test.ts
git commit -m "fix: save RAFAY config as immutable Blob versions"
```

---

### Task 4: Remove temporary diagnostics and restore the production API surface

**Files:**
- Modify: `app/api/control/[secret]/site-data/route.ts`
- Delete: `app/api/control/[secret]/private-blob-probe/route.ts`
- Test: existing route/API tests through the full suite

**Interfaces:**
- Consumes: `loadSiteData()`, `saveSiteData()`, `SiteDataConflictError`.
- Produces: only the normal authenticated GET/PUT site-data API; no `diagnose`, `saveprobe`, or private-Blob probe endpoints.

- [ ] **Step 1: Restore `site-data/route.ts` to normal GET/PUT responsibilities**

The final imports must be only:

```ts
import { NextResponse } from 'next/server';
import { isValidAdminSecret } from '@/lib/admin-auth';
import { loadSiteData, saveSiteData, SiteDataConflictError } from '@/lib/blob-store';
import { SiteDataSchema } from '@/lib/domain';
```

The final GET must be:

```ts
export async function GET(_request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();
  return NextResponse.json(await loadSiteData(), {
    headers: { 'Cache-Control': 'no-store' }
  });
}
```

Keep the existing PUT validation, 409 conflict response, 503 storage response, and safe error logging; remove diagnostic query handling and Blob probe helpers.

- [ ] **Step 2: Delete the private Blob probe route**

```bash
git rm 'app/api/control/[secret]/private-blob-probe/route.ts'
```

- [ ] **Step 3: Run the complete automated verification suite**

```bash
npm test
npm run check:brand
npm run build
```

Expected:
- all Vitest tests pass;
- brand audit exits 0;
- Next.js production build exits 0;
- build route list does not contain `/api/control/[secret]/private-blob-probe`.

- [ ] **Step 4: Commit diagnostic cleanup**

```bash
git add 'app/api/control/[secret]/site-data/route.ts' 'app/api/control/[secret]/private-blob-probe/route.ts'
git commit -m "chore: remove RAFAY storage diagnostics"
```

---

### Task 5: Directly deploy only `rafay-web` and verify production persistence

**Files:**
- No source changes expected after Task 4.
- Inspect: production deployment/build/runtime logs.

**Interfaces:**
- Consumes: verified `rafay-versioned-config` commit.
- Produces: READY production deployment for `rafay-web` with persistent admin content and no diagnostic routes.

- [ ] **Step 1: Deploy the exact verified feature-branch commit directly to `rafay-web` production**

Use the Vercel project ID and team ID from Global Constraints. Do not use a `main` Git push as the deployment trigger.

Expected: a new `rafay-web` production deployment enters `BUILDING` and then `READY`; build logs identify the exact verified branch commit.

- [ ] **Step 2: Verify health**

Fetch:

```text
https://rafay-web.vercel.app/api/health
```

Expected: HTTP 200, `ok: true`, `runtime: "vercel"`.

- [ ] **Step 3: Verify initial admin config read**

Using the already-authorized production admin route, GET site data.

Expected:
- HTTP 200;
- ETag is neither `blob-read-error` nor `blob-not-configured`;
- data validates and `brandName` is `RAFAY`.

- [ ] **Step 4: Perform a no-visible-change Save Changes roundtrip**

Read current data + ETag, submit the same visible data through the normal save flow, then immediately reread.

Expected:
- save returns HTTP 200;
- returned version increments by exactly 1;
- returned ETag changes;
- immediate reread returns the same new version and same new ETag;
- no 503 and no stale previous body.

- [ ] **Step 5: Verify media still works**

Upload a small valid site image through the existing admin media endpoint/UI and save its returned URL into hero/logo content, then reread site data.

Expected:
- media upload HTTP 201;
- saved URL remains persisted in the immediate reread;
- public media URL is reachable;
- no change to booking storage behavior.

- [ ] **Step 6: Verify no temporary diagnostic route remains**

Request the former private probe route with the authenticated admin path.

Expected: HTTP 404 because the route no longer exists.

- [ ] **Step 7: Check runtime errors**

Inspect `rafay-web` production runtime errors/logs for the deployment window.

Expected:
- no Blob storage 5xx cluster caused by site-data load/save;
- no `blob-read-error` bootstrap loop;
- no new unhandled exception cluster.

- [ ] **Step 8: Record final verified commit/deployment**

Report the exact feature-branch commit SHA, Vercel deployment ID, health result, Save roundtrip result, media result, and runtime error result. Do not claim success if any of these checks fail.
