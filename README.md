# RAFAY Booking

Premium, mobile-responsive 18+ booking experience for lawful adult event companionship and creator appearances. The product explicitly does not offer or facilitate sexual services.

## What is included

- Premium RAFAY public landing experience with 18+ age gate.
- Ten-step booking flow with server-side validation and WhatsApp handoff.
- Hidden no-login control route protected by a long server-side secret.
- Editable profiles, packages, booking options, payment preferences, website copy and settings.
- Admin-controlled RAFAY logo plus separate desktop and mobile hero images.
- Portable persistent storage: Railway filesystem volume or Vercel Blob.
- Booking request management with search, status filters, status updates, customer WhatsApp shortcut and deletion.
- Safe client response parsing so empty/malformed server failures never become browser JSON parser errors.
- Safe `/api/health` release identity plus a production smoke command.
- Automated tests, brand audit and Next.js production build in GitHub Actions on pull requests and `main` pushes.

## Environment

Copy `.env.example` to `.env.local` for local development and configure the corresponding variables in the deployment environment:

- `RAFAY_ADMIN_KEY` — a private random secret at least 24 characters long. The admin route is `/control/<RAFAY_ADMIN_KEY>`. Treat the full URL like a password because there is intentionally no login screen.
- `RAFAY_DATA_DIR` — optional absolute persistent-volume path. When set, RAFAY stores site configuration, bookings and uploaded media on that filesystem and does not require Vercel Blob. Railway production can use `/data`.
- Public Vercel Blob — used for `rafay/config/site-data.json`, logo/hero media and profile images when `RAFAY_DATA_DIR` is absent. New connected Vercel Blob stores use OIDC by default: Vercel supplies `BLOB_STORE_ID` and runtime credentials automatically. Legacy/token-based connections and local development can instead provide `BLOB_READ_WRITE_TOKEN`; RAFAY supports both authentication modes.
- `RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN` — used when `RAFAY_DATA_DIR` is absent; this explicitly selects the separate **Private** Blob store for `rafay/bookings/*.json`.

Never expose the admin key or storage credentials in client-side environment variables or source code.

## Commands

```bash
npm install
npm test
npm run check:brand
npm run build
npm run dev
npm run smoke:production -- https://your-production-domain.example [expected-commit]
```

The smoke command requires successful responses from `/api/health`, `/`, and `/booking`. If an expected commit SHA/prefix is supplied, it also verifies that production is actually serving that release.

## Deployment health

`GET /api/health` returns only safe release metadata:

```json
{
  "ok": true,
  "commit": "deployment-commit-sha",
  "runtime": "vercel",
  "time": "2026-09-12T00:00:00.000Z"
}
```

It never returns the admin key or storage tokens. Use this endpoint before treating a merged fix as live; a Git merge and a production deployment are separate states.

## Admin workflow

1. Open the private `/control/<secret>` route.
2. In **Website Content**, upload/replace/remove the RAFAY logo, desktop hero and mobile hero, edit hero copy and WhatsApp CTA, then save changes.
3. Edit profiles, offers, booking options, payment preferences, public content and settings.
4. Upload profile images in Media and choose/reorder the cover gallery.
5. Use Bookings to search requests and move them through Pending, Contacted, Confirmed, Completed or Cancelled.
6. Press **Save changes** after site/profile/media configuration edits so the public configuration is persisted.

## Railway persistent deployment

Railway can run RAFAY independently of Vercel Blob:

1. Deploy this repository as a Next.js service from `main`.
2. Attach a persistent volume to the service and mount it at `/data`.
3. Set `RAFAY_DATA_DIR=/data` and a fresh private `RAFAY_ADMIN_KEY` in the production environment.
4. Build with `npm run build` and start with `npm start` (Railway may infer these from `package.json`).
5. Generate a public Railway domain.

With `RAFAY_DATA_DIR=/data`, site configuration is stored at `/data/config/site-data.json`, bookings at `/data/bookings/*.json`, and uploaded media below `/data/media/`. Uploaded media is served through the same-origin `/media/...` route. Site-data writes use optimistic ETag conflict protection and atomic file replacement.

## Vercel storage setup

When `RAFAY_DATA_DIR` is not set, RAFAY uses two Blob stores because public media and private booking records have different access requirements:

1. Create/connect a **Public** Blob store to the RAFAY Vercel project for public site data and media. Current Vercel connections use OIDC by default; the project receives `BLOB_STORE_ID` and the Blob SDK authenticates from the function automatically. A static `BLOB_READ_WRITE_TOKEN` is also supported for legacy/token-based connections and local development.
2. Create/connect a separate **Private** Blob store for booking request records. RAFAY currently selects this second store explicitly through `RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN`.
3. Redeploy after adding/changing storage connections or variables.
4. Verify `/api/health` is serving the intended commit before retesting the admin.

The public store is required for admin hero/logo/profile uploads and persistent website edits on Vercel. The private store is required for public booking submissions and the admin Bookings manager on Vercel. A connected public `BLOB_STORE_ID` is a valid RAFAY public-storage configuration because the Vercel Blob SDK can authenticate it with runtime OIDC; a static public token remains a fallback.

## Failure behavior

Public pages fall back to default RAFAY site data if their configured storage backend has a transient read/bootstrap problem instead of crashing the whole site. Admin save, uploads, booking management and public booking submission use guarded response parsing, so empty or malformed upstream failures are converted into readable status-aware messages instead of `Unexpected end of JSON input`. Expected storage failures are returned as structured JSON service errors.

## Launch requirements

Before public launch, configure either the Railway persistent filesystem backend or both Vercel Blob stores, set `RAFAY_ADMIN_KEY`, configure the business WhatsApp number from the control center, verify all profile subjects are adults, and keep the lawful-use/no-sexual-services policy visible. The hidden admin URL must remain private and its secret should be rotated if exposed.
