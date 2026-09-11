# RAFAY Booking

Premium, mobile-responsive 18+ booking experience for lawful adult event companionship and creator appearances. The product explicitly does not offer or facilitate sexual services.

## What is included

- Premium RAFAY public landing experience with 18+ age gate.
- Ten-step booking flow with server-side validation and WhatsApp handoff.
- Hidden no-login control route protected by a long server-side secret.
- Editable profiles, packages, booking options, payment preferences, website copy and settings.
- Admin-controlled RAFAY logo plus separate desktop and mobile hero images.
- Profile and site image uploads through a public Vercel Blob store.
- Booking request management with search, status filters, status updates, customer WhatsApp shortcut and deletion.
- Separate private Vercel Blob persistence for booking request records.
- Automated tests, brand audit and Next.js production build in GitHub Actions.

## Environment

Copy `.env.example` to `.env.local` for local development and configure the corresponding variables in the deployment environment:

- `RAFAY_ADMIN_KEY` — a private random secret at least 24 characters long. The admin route is `/control/<RAFAY_ADMIN_KEY>`. Treat the full URL like a password because there is intentionally no login screen.
- Public Blob store — used for `rafay/config/site-data.json`, logo/hero media and profile images. A Vercel-connected public store can use OIDC (`BLOB_STORE_ID` + the deployment's `VERCEL_OIDC_TOKEN`) automatically. `BLOB_READ_WRITE_TOKEN` remains supported for local development or token-based connections.
- `RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN` — read/write token from a separate **private** Blob store, used only for `rafay/bookings/*.json`.

Never expose the admin key or Blob credentials in client-side environment variables or source code.

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

## Vercel storage setup

RAFAY intentionally uses two Blob stores because Vercel Blob access mode is fixed when a store is created:

1. Create/connect a **Public** Blob store to the RAFAY Vercel project for public site data and media. New Vercel connections may use OIDC automatically.
2. Create a second **Private** Blob store for booking request records. Connect/copy its read-write token into the project as `RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN` for Production and Preview.
3. Redeploy after adding or changing storage environment bindings.

The public store is required for admin hero/logo/profile uploads and persistent website edits. The private store is required for public booking submissions and the admin Bookings manager.

## Launch requirements

Before public launch, configure both Blob stores, set `RAFAY_ADMIN_KEY`, configure the business WhatsApp number from the control center, verify all profile subjects are adults, and keep the lawful-use/no-sexual-services policy visible. The hidden admin URL must remain private and its secret should be rotated if exposed.
