# RAFAY Production Hardening Design

## Problem

RAFAY production has repeatedly shown `Unexpected end of JSON input` in the admin while the repository contains newer error-handling code. The current evidence separates two problems that must be solved independently:

1. **Release drift:** `main` contains safe admin response parsing, but the live screenshot still shows the exact browser exception produced by the older `response.json()` implementation. The current `main` merge commit has no Vercel deployment status while the previous merge commit does. Production therefore needs a verifiable release identity instead of assuming a merge is live.
2. **Storage reliability:** public media upload, site-data reads/writes, and private booking records use different storage paths. Current Vercel Blob connections use short-lived OIDC authentication by default, while legacy/local connections may use `BLOB_READ_WRITE_TOKEN`. RAFAY must support both without mistaking a connected OIDC store for an unconfigured store. Private booking records remain isolated behind their separate explicit token.

## Goals

- Never surface browser JSON parser exceptions to an admin or customer.
- Never return an accidental empty 500 from RAFAY API routes.
- Make the exact deployed revision observable from a safe health endpoint.
- Support current Vercel Blob OIDC authentication and legacy/static public Blob tokens.
- Preserve the separate private booking store through `RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN`.
- Keep the Railway filesystem backend supported through `RAFAY_DATA_DIR`.
- Keep public pages available with default data during transient storage read failures.
- Add CI coverage for production-critical flows and run verification on both pull requests and `main` pushes.

## Architecture

### Release identity

Add `GET /api/health` returning JSON with `ok`, `commit`, `runtime`, and `time`. `commit` is read from deployment-provided server environment variables and never contains secrets. This endpoint is the source of truth for whether `rafay-web.vercel.app` is serving the intended commit.

### Client response handling

Introduce a shared pure helper for reading JSON responses through `response.text()` followed by guarded `JSON.parse`. Empty or malformed responses become a status-aware message such as `Request failed (503).`. Admin save, profile media, booking manager, and public booking submission all use this helper.

### Public Blob authentication

`RAFAY_DATA_DIR` remains highest priority. Otherwise a connected `BLOB_STORE_ID` is a valid public Blob configuration on Vercel because the Blob SDK uses Vercel's short-lived runtime OIDC credential automatically. A legacy/static `BLOB_READ_WRITE_TOKEN` is also supported. When a static token exists RAFAY passes it explicitly; otherwise RAFAY calls the SDK without a token so OIDC remains available. Private booking operations continue to select the separate private store with `RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN`.

### Server error envelopes

API routes catch expected persistence/service failures and return JSON with 4xx/503 status codes. Hidden invalid-admin-secret routes remain intentionally blank 404 responses. Successful DELETE routes may remain 204 because their clients do not parse a body.

### Observability

Storage fallback paths log short structured messages containing operation and error type/status/code, never credentials or admin secrets. Health reporting and logs allow deployment/storage problems to be distinguished without patching blindly.

### CI / production smoke

GitHub Actions runs tests, brand audit, and build on pull requests and on pushes to `main`. A production smoke script checks `/api/health`, `/`, and `/booking`; when used after a deployment it confirms both release identity and basic availability.

## Acceptance criteria

- Exact `Unexpected end of JSON input` is covered by regression tests and cannot be emitted by RAFAY client fetch flows.
- Site-data save failures produce readable JSON errors.
- Admin bookings storage failures produce readable JSON errors.
- Media upload failures produce readable errors.
- Public booking failures produce readable errors.
- A connected `BLOB_STORE_ID` works through automatic Vercel OIDC without a static public token.
- A configured `BLOB_READ_WRITE_TOKEN` also works and is passed explicitly.
- `/api/health` reports a commit identifier without exposing secrets.
- Homepage and booking page still use fallback data if site-data reads fail.
- Full `npm test`, `npm run check:brand`, and `npm run build` pass before merge.
