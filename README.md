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
- Automated tests, brand audit and Next.js production build in GitHub Actions.

## Environment

Copy `.env.example` to `.env.local` for local development and configure the corresponding variables in the deployment environment:

- `RAFAY_ADMIN_KEY` — a private random secret at least 24 characters long. The admin route is `/control/<RAFAY_ADMIN_KEY>`. Treat the full URL like a password because there is intentionally no login screen.
- `RAFAY_DATA_DIR` — optional absolute persistent-volume path. When set, RAFAY stores site configuration, bookings and uploaded media on that filesystem and does not require Vercel Blob. Railway production uses `/data`.
- Public Blob store — used when `RAFAY_DATA_DIR` is absent for `rafay/config/site-data.json`, logo/hero media and profile images. A Vercel-connected public store can use OIDC (`BLOB_STORE_ID` plus the deployment OIDC token) automatically. `BLOB_READ_WRITE_TOKEN` remains supported for local development or token-based connections.
- `RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN` — used when `RAFAY_DATA_DIR` is absent; this is the read/write token from the separate private Blob store for `rafay/bookings/*.json`.

Never expose the admin key or storage credentials in client-side environment variables or source code.

## Commands

```bash
npm install
npm test
npm run check:brand
npm run build
npm run dev
```

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

When `RAFAY_DATA_DIR` is not set, RAFAY uses two Blob stores because Vercel Blob access mode is fixed when a store is created:

1. Create/connect a **Public** Blob store to the RAFAY Vercel project for public site data and media. New Vercel connections may use OIDC automatically.
2. Create a second **Private** Blob store for booking request records. Connect/copy its read-write token into the project as `RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN` for Production and Preview.
3. Redeploy after adding or changing storage environment bindings.

The public store is required for admin hero/logo/profile uploads and persistent website edits on Vercel. The private store is required for public booking submissions and the admin Bookings manager on Vercel.

## Failure behavior

Public pages fall back to default RAFAY site data if their configured storage backend has a transient read/bootstrap problem instead of crashing the whole site. Admin write/upload actions return explicit errors when storage is unavailable. Booking submissions return a structured service error when no writable booking backend is configured.

## Launch requirements

Before public launch, configure either the Railway persistent filesystem backend or both Vercel Blob stores, set `RAFAY_ADMIN_KEY`, configure the business WhatsApp number from the control center, verify all profile subjects are adults, and keep the lawful-use/no-sexual-services policy visible. The hidden admin URL must remain private and its secret should be rotated if exposed.
