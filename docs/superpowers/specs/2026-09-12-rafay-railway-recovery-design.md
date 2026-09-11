# RAFAY Railway Recovery Design

## Goal
Restore the RAFAY public site, booking flow, and hidden admin on a host that is not blocked by the current Vercel deployment rate limit, while keeping the existing Vercel deployment path intact.

## Approved approach
Deploy the same Next.js application to Railway and add a second storage backend selected by `RAFAY_DATA_DIR`. On Vercel, the existing Vercel Blob behavior remains unchanged. On Railway, site configuration, booking JSON records, and uploaded images are stored on a Railway persistent volume mounted at `/data`.

## Storage selection
- If `RAFAY_DATA_DIR` is a non-empty absolute path, the app uses filesystem storage.
- Otherwise the existing Vercel Blob configuration is used.
- Public pages must always render from `DEFAULT_SITE_DATA` if their configured storage backend is temporarily unavailable; a storage problem must never 500 the entire site.

## Filesystem layout
Under `RAFAY_DATA_DIR`:
- `config/site-data.json` — editable site configuration.
- `bookings/<booking-id>.json` — private booking records.
- `media/site/...` — logo, desktop hero, mobile hero and other site media.
- `media/profiles/<profile-id>/...` — profile media.

## Site configuration
`loadSiteData()` reads the local JSON file when filesystem storage is active. If the file does not exist it seeds `DEFAULT_SITE_DATA`. The local ETag is a SHA-256 hash of the stored JSON. `saveSiteData()` checks the expected ETag before replacing the file so the existing admin conflict behavior remains intact.

Writes are atomic: write to a temporary sibling file and rename over the destination.

## Bookings
When filesystem storage is active, booking create/list/update/delete operations use the local `bookings` directory. The public booking API retains all existing validation and lawful-use requirements. The admin bookings screen continues to use the same API and domain types.

## Media
The media API will use storage helper functions instead of calling `@vercel/blob` directly. On Railway it writes uploaded JPEG/PNG/WebP files to the persistent volume and returns a same-origin `/media/...` URL. On Vercel it continues to upload to public Vercel Blob.

A new catch-all route serves only files below the storage `media` directory. Path traversal is rejected after normalization. Content-Type is derived from the file extension and the response is cacheable because uploaded filenames are UUID-prefixed.

## Admin security
`RAFAY_ADMIN_KEY` remains the hidden admin credential. The Railway deployment receives a newly generated key because the previous secret appeared in screenshots. The key is not committed to GitHub.

## Railway infrastructure
Create a dedicated Railway project/service from `ab2590357-cpu/ramzan-website` `main`, attach a persistent volume mounted at `/data`, and set:
- `RAFAY_DATA_DIR=/data`
- `RAFAY_ADMIN_KEY=<new random secret>`
- `NODE_ENV=production`

Use normal Next.js build/start commands. Generate a Railway public domain.

## Compatibility
No Vercel-only environment variable is removed. When `RAFAY_DATA_DIR` is absent, existing Vercel Blob public media/site-data and private booking Blob token behavior remains the active backend.

## Failure behavior
- Public homepage and booking page: never 500 solely because storage is unavailable; use default site data.
- Admin initial page: loads default data if storage reads fail; save/upload actions surface explicit errors.
- Booking submission: returns structured JSON 503 if its active writable backend is unavailable.
- Media upload: returns structured JSON error rather than crashing the route.

## Verification
Automated tests must cover local site-data seed/read/write/conflict, local booking CRUD, local media save/delete and path safety, plus existing Blob tests. Run the full Vitest suite, brand audit, and production build. After Railway deployment, smoke-test `/`, `/booking`, the hidden admin route, site-content save, image upload, reload persistence, booking submission, and admin booking visibility.
