# RAFAY Booking

Premium, mobile-responsive 18+ booking experience for lawful adult event companionship and creator appearances. The product explicitly does not offer or facilitate sexual services.

## What is included

- Premium RAFAY public landing experience with 18+ age gate.
- Ten-step booking flow with server-side validation and WhatsApp handoff.
- Hidden no-login control route protected by a long server-side secret.
- Editable profiles, packages, booking options, payment preferences, website copy and settings.
- Profile image uploads through Vercel Blob with cover selection, reorder and removal controls.
- Booking request management with search, status filters, status updates, customer WhatsApp shortcut and deletion.
- Shared Vercel Blob persistence for site data, booking records and profile media.
- Automated tests, brand audit and Next.js production build in GitHub Actions.

## Environment

Copy `.env.example` to `.env.local` for local development and configure the same variables in the deployment environment:

- `RAFAY_ADMIN_KEY` — a private random secret at least 24 characters long. The admin route is `/control/<RAFAY_ADMIN_KEY>`. Treat the full URL like a password because there is intentionally no login screen.
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token used by site configuration, bookings and image uploads.

Do not expose either value in client-side environment variables or source code.

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
2. Edit profiles, offers, booking options, public content and settings.
3. Upload profile images in Media and choose/reorder the cover gallery.
4. Use Bookings to search requests and move them through Pending, Contacted, Confirmed, Completed or Cancelled.
5. Press **Save changes** after site/profile/media configuration edits so the shared public configuration is updated.

## Launch requirements

Before a public launch, set both required environment variables, connect a Vercel Blob store, configure the business WhatsApp number from the control center, verify all profile subjects are adults, and keep the lawful-use/no-sexual-services policy visible. The hidden admin URL must remain private and its secret should be rotated if exposed.
