# RAFAY Railway Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore RAFAY on Railway with persistent filesystem storage while preserving the existing Vercel Blob backend.

**Architecture:** `RAFAY_DATA_DIR` selects a filesystem backend for site config, bookings, and media. Without it, current Vercel Blob behavior remains unchanged. Public page reads fail open to `DEFAULT_SITE_DATA`, while writes return explicit errors.

**Tech Stack:** Next.js App Router, TypeScript, Node `fs/promises`, Node `crypto`, Vitest, Railway persistent volumes, existing `@vercel/blob` fallback.

**Spec:** `docs/superpowers/specs/2026-09-12-rafay-railway-recovery-design.md`

## Global Constraints

- Keep RAFAY 18+ lawful social/event/creator-booking positioning unchanged.
- Do not enable commercial sexual services.
- Preserve Vercel Blob behavior whenever `RAFAY_DATA_DIR` is absent.
- Railway persistent volume mount path is `/data` and runtime variable is `RAFAY_DATA_DIR=/data`.
- Never commit `RAFAY_ADMIN_KEY` or any storage credential.
- Media remains JPEG/PNG/WebP, maximum 5 MB.

---

### Task 1: Filesystem site-data and booking backend

**Files:**
- Modify: `lib/blob-store.ts`
- Test: `lib/blob-store-filesystem.test.ts`

**Interfaces:**
- Consumes: existing `SiteData`, `BookingRequest`, `DEFAULT_SITE_DATA`, and `SiteDataConflictError` behavior.
- Produces: existing exported `loadSiteData`, `saveSiteData`, `createBooking`, `listBookings`, `updateBooking`, `deleteBooking`, `hasBlobStorageConfig`, `hasPrivateBookingStorageConfig` with filesystem support.

- [ ] **Step 1: Write failing filesystem tests**

Create tests using a temporary directory and set `process.env.RAFAY_DATA_DIR`:

```ts
const root = await mkdtemp(join(tmpdir(), 'rafay-fs-'));
process.env.RAFAY_DATA_DIR = root;
const first = await loadSiteData();
expect(first.data.brandName).toBe('RAFAY');
expect(await readFile(join(root, 'config/site-data.json'), 'utf8')).toContain('RAFAY');
```

Also test save/reload, stale ETag conflict, and booking create/list/update/delete without `RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- lib/blob-store-filesystem.test.ts`

Expected: failures because `RAFAY_DATA_DIR` is not yet a storage backend.

- [ ] **Step 3: Implement filesystem helpers in `lib/blob-store.ts`**

Add imports and backend selection:

```ts
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';

function filesystemRoot(): string | null {
  const root = process.env.RAFAY_DATA_DIR?.trim();
  return root && isAbsolute(root) ? root : null;
}

function localEtag(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

async function atomicWrite(path: string, body: string | Uint8Array) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmp, body);
  await rename(tmp, path);
}
```

When filesystem mode is active, seed/read `config/site-data.json`, return SHA-256 ETags, enforce stale ETag conflicts, and store booking JSON under `bookings/`. `hasBlobStorageConfig()` and `hasPrivateBookingStorageConfig()` return true in filesystem mode.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- lib/blob-store-filesystem.test.ts`

Expected: all filesystem storage tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/blob-store.ts lib/blob-store-filesystem.test.ts
git commit -m "feat: add persistent filesystem storage backend"
```

---

### Task 2: Filesystem media persistence and delivery

**Files:**
- Modify: `lib/blob-store.ts`
- Create: `app/media/[...path]/route.ts`
- Test: `lib/blob-store-filesystem.test.ts`
- Test: `app/media/media-route.test.ts`

**Interfaces:**
- Produces: `saveMedia(scope, filename, bytes, contentType, profileId?)`, `readMedia(relativePath)`, and existing `deleteMedia()` with filesystem support.

- [ ] **Step 1: Write failing media tests**

```ts
const saved = await saveMedia('site', 'hero.webp', new Uint8Array([1,2,3]), 'image/webp');
expect(saved.url).toBe('/media/site/hero.webp');
const loaded = await readMedia('site/hero.webp');
expect(Array.from(loaded!.body)).toEqual([1,2,3]);
expect(loaded!.contentType).toBe('image/webp');
```

Add a route test proving `../` traversal returns 400/404 and a valid stored image returns 200 with the correct Content-Type.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- lib/blob-store-filesystem.test.ts app/media/media-route.test.ts`

Expected: missing helper/route failures.

- [ ] **Step 3: Implement media helpers and route**

Filesystem media path must resolve below `<root>/media` and reject escapes:

```ts
function localMediaFile(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some((part) => part === '..' || part === '.')) throw new Error('Invalid media path');
  return join(filesystemRoot()!, 'media', ...normalized.split('/'));
}
```

The new route reads `params.path`, joins it with `/`, calls `readMedia()`, and returns:

```ts
return new Response(body, {
  headers: {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable'
  }
});
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- lib/blob-store-filesystem.test.ts app/media/media-route.test.ts`

Expected: all media tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/blob-store.ts app/media lib/blob-store-filesystem.test.ts
git commit -m "feat: persist and serve RAFAY media on filesystem"
```

---

### Task 3: Route integration and deployment documentation

**Files:**
- Modify: `app/api/control/[secret]/media/route.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Test: `app/api/control/media-route.test.ts`

**Interfaces:**
- Consumes: `saveMedia()` and `deleteMedia()` from `lib/blob-store.ts`.
- Produces: unchanged admin uploader response shape `{ url, pathname, contentType, size }`.

- [ ] **Step 1: Add failing route test for filesystem mode**

Set `RAFAY_DATA_DIR` to a temp directory, clear Blob variables, POST a WebP `File`, and assert 201 plus a `/media/site/` URL and a real file on disk.

- [ ] **Step 2: Run route test and verify RED**

Run: `npm test -- app/api/control/media-route.test.ts`

Expected: current route still calls Vercel Blob directly.

- [ ] **Step 3: Integrate storage helpers**

Replace direct `put()`/`del()` calls with:

```ts
const blob = await saveMedia(scope, filename, new Uint8Array(await file.arrayBuffer()), file.type, profileIdValue);
return NextResponse.json({ url: blob.url, pathname: blob.pathname, contentType: file.type, size: file.size }, { status: 201 });
```

Document:

```env
RAFAY_DATA_DIR=/data
RAFAY_ADMIN_KEY=use-a-long-random-secret
```

and explain that Railway uses the persistent volume backend while Vercel continues to use Blob when `RAFAY_DATA_DIR` is absent.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run check:brand
npm run build
```

Expected: zero failing tests, brand audit success, production build exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/api/control/[secret]/media/route.ts .env.example README.md app/api/control/media-route.test.ts
git commit -m "feat: wire admin media to portable storage"
```

---

### Task 4: Merge and Railway production recovery

**Files:** no application file changes expected.

**Interfaces:** Railway project/service, persistent volume, runtime variables, public domain.

- [ ] **Step 1: Open PR and confirm CI**

Create a PR from `rafay-railway-recovery` to `main`; require RAFAY CI tests/brand/build success before merge.

- [ ] **Step 2: Merge to `main`**

Merge only after CI success. Vercel deployment failure caused solely by its build-rate limit is not a blocker for Railway recovery.

- [ ] **Step 3: Create Railway project and deploy**

Create a dedicated Railway project named `rafay-recovery`, deploy `ab2590357-cpu/ramzan-website` branch `main`, and configure normal Next.js build/start behavior.

- [ ] **Step 4: Attach persistent volume and variables**

Attach a Railway volume to the web service at `/data`. Set:

```env
RAFAY_DATA_DIR=/data
RAFAY_ADMIN_KEY=<new cryptographically random secret of at least 32 characters>
NODE_ENV=production
```

- [ ] **Step 5: Generate public domain and smoke-test**

Verify HTTP success for `/` and `/booking`; verify the new secret admin route loads; upload an image, save site content, reload and confirm persistence; submit one lawful test booking and confirm it appears in admin Bookings.

- [ ] **Step 6: Final production check**

Review Railway build/runtime/http logs for 5xx errors after smoke tests. Report the working public URL and admin access instructions without exposing the secret in public artifacts.
