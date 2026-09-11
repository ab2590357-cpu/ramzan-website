# RAFAY Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate RAFAY's repeated empty-JSON failures, make storage authentication reliable across current Vercel OIDC and legacy token connections, and make the deployed production revision verifiable.

**Architecture:** Keep the existing Next.js application and its two storage backends, but centralize client JSON parsing, support both Vercel public Blob OIDC and static-token authentication, wrap persistence errors in structured API responses, and expose a safe release health endpoint. Add CI and smoke coverage so a merged-but-not-deployed release cannot be mistaken for a live fix.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, `@vercel/blob`, Vitest, React Testing Library, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-12-rafay-production-hardening-design.md`

## Global Constraints

- Preserve the hidden `/control/<RAFAY_ADMIN_KEY>` no-login admin design.
- Preserve `RAFAY_DATA_DIR` filesystem storage as highest-priority backend.
- Public site config/media use the public Blob store; booking records use the separate private Blob store.
- Never expose storage tokens or the admin key to client code or health responses.
- Invalid admin secrets remain hidden 404 responses.
- Public pages must keep default-data fallback behavior during site-data read failures.
- All implementation work follows red-green TDD and is merged only after full verification.

---

### Task 1: Shared safe response reader

**Files:**
- Create: `lib/http-response.ts`
- Create: `lib/http-response.test.ts`
- Modify: `components/admin/admin-client.tsx`
- Modify: `components/admin/site-media-uploader.tsx`
- Modify: `components/admin/media-manager.tsx`
- Modify: `components/admin/bookings-manager.tsx`
- Modify: `components/booking-wizard.tsx`
- Modify/remove: `components/admin/admin-save-response.test.ts`

**Interfaces:**
- Produces: `readJsonResponse<T>(response: Response, fallbackPrefix?: string): Promise<T & { error?: string }>`.
- Consumers: every browser fetch flow that currently expects JSON.

- [ ] **Step 1: Add failing tests** covering empty 500, malformed 502, valid JSON error, and valid JSON success.
- [ ] **Step 2: Run the focused tests** and verify they fail because the shared helper is missing.
- [ ] **Step 3: Implement `readJsonResponse`** using `response.text()` and guarded `JSON.parse`; empty/malformed responses return a status-aware `error` field.
- [ ] **Step 4: Replace every direct browser `response.json()`** in admin save, site/profile media upload, booking manager load/update, and public booking submit with the shared helper.
- [ ] **Step 5: Run all focused client tests** and verify no fetch flow can throw a JSON parser exception.

### Task 2: Public Blob OIDC/static-token compatibility and storage diagnostics

**Files:**
- Modify: `lib/blob-store.ts`
- Modify: `lib/blob-store.test.ts`
- Create/modify: `lib/blob-store-public-token.test.ts`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Produces: `hasBlobStorageConfig()` that is true for filesystem storage, a connected `BLOB_STORE_ID`, or a non-empty `BLOB_READ_WRITE_TOKEN`.
- Produces public Blob calls that omit a token for automatic Vercel OIDC or pass the static token explicitly when one is configured.

- [ ] **Step 1: Add failing tests** proving a connected `BLOB_STORE_ID` works through automatic OIDC and a static `BLOB_READ_WRITE_TOKEN` is still supported.
- [ ] **Step 2: Run focused Blob tests** and verify failure against any implementation that disables either authentication mode.
- [ ] **Step 3: Implement dual-mode public Blob authentication** while keeping `RAFAY_DATA_DIR` first and the private booking token unchanged.
- [ ] **Step 4: Add sanitized storage logs** on site-data read/bootstrap/write failures without logging secrets.
- [ ] **Step 5: Update env/docs** to document Vercel OIDC as the default current connection mode and the static token as a legacy/local fallback.
- [ ] **Step 6: Run Blob/storage tests** and verify filesystem, OIDC public Blob, static-token public Blob, and private booking paths all remain green.

### Task 3: Structured API failure envelopes

**Files:**
- Modify: `app/api/control/[secret]/bookings/route.ts`
- Modify: `app/api/control/[secret]/media/route.ts` only if tests expose an uncovered path
- Modify: `app/api/control/[secret]/site-data/route.ts` only if needed for consistency
- Modify: `app/api/bookings/route.ts` only if needed for consistency
- Modify: corresponding route tests under `app/api/**`

**Interfaces:**
- Produces: all expected storage failures as JSON 503/404/409 responses.

- [ ] **Step 1: Add failing route tests** for admin booking list/update/delete storage failures and malformed/empty downstream cases.
- [ ] **Step 2: Verify the tests fail** where current routes allow thrown persistence errors to become framework 500 responses.
- [ ] **Step 3: Wrap persistence calls** and return stable JSON errors with `Cache-Control: no-store` where appropriate.
- [ ] **Step 4: Run all API route tests** and verify hidden invalid-secret 404 behavior is unchanged.

### Task 4: Release identity and production smoke checks

**Files:**
- Create: `app/api/health/route.ts`
- Create: `app/api/health/route.test.ts`
- Create: `scripts/smoke-production.mjs`
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Produces: `GET /api/health` -> `{ ok: true, commit: string, runtime: string, time: string }`.
- Produces: `npm run smoke:production -- <base-url> [expected-commit]`.

- [ ] **Step 1: Add failing health tests** proving secrets are absent and commit identity is exposed safely.
- [ ] **Step 2: Implement the health route** using `VERCEL_GIT_COMMIT_SHA`, `RAILWAY_GIT_COMMIT_SHA`, or `GITHUB_SHA`, falling back to `unknown`.
- [ ] **Step 3: Add a smoke script** that requires HTTP 200 from `/api/health`, `/`, and `/booking`; when an expected commit is provided, require the live commit to match it.
- [ ] **Step 4: Update CI** to run verification on pull requests and pushes to `main`; keep deployment smoke as an explicit script so deployment timing cannot make ordinary CI flaky.
- [ ] **Step 5: Run health/smoke unit tests and production build**.

### Task 5: Full application verification and integration

**Files:**
- All changed files from Tasks 1-4.

**Interfaces:**
- Consumes all prior task behavior.

- [ ] **Step 1: Run `npm test`** and require zero failing tests.
- [ ] **Step 2: Run `npm run check:brand`** and require success.
- [ ] **Step 3: Run `npm run build`** and require success.
- [ ] **Step 4: Review the PR diff** for accidental secret exposure, unsafe admin-route changes, and unrelated edits.
- [ ] **Step 5: Merge to `main` only after CI is green.**
- [ ] **Step 6: Verify the deployed production commit** with `/api/health`; if Vercel has not deployed the merge, treat that as a deployment problem rather than another application-code bug.
- [ ] **Step 7: Run live smoke checks** against homepage and booking page, then manually verify admin Save changes, hero/logo persistence, WhatsApp links, and a test booking visible in Admin → Bookings.
