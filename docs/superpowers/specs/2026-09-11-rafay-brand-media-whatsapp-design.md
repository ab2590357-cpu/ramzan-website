# RAFAY Brand Media + WhatsApp Controls — Design Spec

Date: 2026-09-11
Branch: `rafay-brand-media-whatsapp`

## Goal

Upgrade the existing RAFAY booking platform so the public experience looks unmistakably premium, adult-oriented, private, and nightlife/luxury focused while remaining non-explicit and lawful. Add full admin control for the hero imagery and logo, and connect the admin-configured WhatsApp number to both the public header and hero.

The existing 10-step booking flow, booking storage, profile management, payments, bookings admin, and hidden no-login admin access must remain intact.

## Canonical visual direction

- Brand remains **RAFAY** everywhere.
- Dark luxury base: near-black / charcoal.
- Accent family: wine, magenta, rose, restrained violet.
- Cinematic adult nightlife/fashion imagery.
- Sensual and seductive presentation is allowed, but no nudity, explicit sexual content, or sexual-service language.
- All depicted people must be unmistakably adults.
- Editorial display typography + clean interface typography.
- Stronger image-led hero and profile presence than the current abstract hero treatment.
- Mobile must feel intentionally designed, not merely scaled down.

## Data model changes

Extend `HeroContent` with:

- `desktopImageUrl: string`
- `mobileImageUrl: string`
- `imageAlt: string`
- `whatsappCta: string`

Extend `SiteData` with:

- `logoUrl: string`
- `logoAlt: string`

All new URL fields accept either a valid URL or an empty string.

Existing fields remain compatible. Defaults use current built-in RAFAY artwork when custom media is empty.

## Admin — Website Content

The `Website Content` view will keep all existing hero text controls and add a dedicated **Hero Media** panel.

Hero Media controls:

- Upload / replace desktop hero image.
- Upload / replace mobile hero image.
- Remove desktop hero image.
- Remove mobile hero image.
- Preview current desktop image.
- Preview current mobile image.
- Edit hero image alt text.
- Edit WhatsApp CTA label.

Desktop and mobile hero images are separate so the mobile composition can be intentionally cropped/framed instead of relying on one responsive crop.

Hero media uploads reuse the existing hidden admin media API and Vercel Blob storage. They are stored under the site-media namespace, not profile-media paths.

## Admin — Branding / Logo

Add a compact **Branding** block in `Website Content` or `Settings` containing:

- Upload / replace logo.
- Remove custom logo.
- Logo preview.
- Logo alt text.

The uploaded logo automatically appears in the public header. If no custom logo is set, the existing bundled RAFAY mark remains the fallback.

No separate public logo-editing route is created.

## Public header

The public header will receive `SiteData` rather than being completely static.

Header behavior:

- Left: custom uploaded logo when configured, otherwise RAFAY fallback mark.
- Center/desktop: existing navigation.
- Right: `18+`, WhatsApp icon/button, and `Book privately` button.
- WhatsApp button uses the same admin-managed `whatsappNumber` field already used by the booking flow.
- If no WhatsApp number is configured, the WhatsApp control is hidden instead of linking to an invalid destination.
- The WhatsApp link uses `wa.me` with a short prefilled RAFAY inquiry message.

Mobile header:

- Preserve the logo/wordmark.
- Keep a compact WhatsApp icon/button visible.
- Keep booking CTA reachable without horizontal overflow.
- Navigation may collapse/hide according to the existing responsive pattern.
- Minimum interactive control height remains approximately 44px.

## Public hero

The abstract RAFAY silhouette/orbit treatment will become the fallback only. When admin-configured images exist:

- Desktop uses `desktopImageUrl`.
- Mobile prefers `mobileImageUrl`; if missing, falls back to desktop image.
- If neither exists, use the existing RAFAY abstract fallback artwork.

Hero layout:

- Large editorial RAFAY headline and supporting copy.
- Image occupies the visual/right side on desktop.
- On mobile, text and media stack cleanly without clipping or horizontal scrolling.
- Image uses an intentional dark/wine overlay so text remains readable and the visual stays cohesive with RAFAY branding.
- Main CTA remains **Book Privately**.
- Secondary CTA becomes **WhatsApp**.
- WhatsApp button is hidden when no configured number exists.
- The existing proof strip remains and can be visually strengthened.

## WhatsApp helper

Create one reusable public helper for direct contact links so header and hero never implement number formatting differently.

Behavior:

- Normalize the configured number to digits.
- Return no link if the normalized number is empty.
- Prefill a short non-booking message such as: `Hi RAFAY, I would like to make a private booking inquiry.`
- Existing final booking WhatsApp summary generation remains separate and unchanged.

## Media API reuse

Reuse the existing hidden admin media endpoint.

Site media upload rules remain:

- JPEG, PNG, WebP only.
- Maximum 5 MB.
- Secret admin route validation before upload/delete.
- Hero/logo files are written to `rafay/media/site/...`.

The admin may remove a hero/logo reference without deleting the Blob immediately. Permanent deletion remains handled through media management so shared assets are not accidentally destroyed.

## Responsive behavior

The redesign must be tested at approximately:

- 390px mobile
- 768px tablet
- 1024px small desktop
- 1440px desktop

Acceptance criteria:

- No horizontal scroll.
- Header actions do not collide or overflow.
- WhatsApp control remains reachable on mobile.
- Hero media is never stretched.
- Mobile hero uses its dedicated image when configured.
- Desktop hero uses its dedicated image when configured.
- Text remains readable over imagery.
- Buttons meet usable touch-target sizing.
- Admin media controls remain usable at mobile width.

## Error and fallback handling

- Missing custom logo → bundled RAFAY mark.
- Missing mobile hero image → desktop hero image.
- Missing both hero images → current abstract RAFAY fallback visual.
- Missing WhatsApp number → hide direct WhatsApp buttons.
- Failed media upload → keep prior image, show upload error, allow retry.
- Invalid media type or oversize file → reject through existing media validation.
- Failed config save → keep unsaved draft and show existing admin save error/conflict behavior.

## Files expected to change

Primary:

- `lib/domain.ts`
- `lib/defaults.ts`
- `components/admin/content-editor.tsx`
- `components/admin/admin-client.tsx`
- `components/admin/media-manager.tsx` or a small reusable site-media uploader component
- `components/public-header.tsx`
- `components/sections.tsx`
- `app/page.tsx`
- `app/globals.css`
- relevant tests

Potential small helper:

- `lib/public-whatsapp.ts`

No redesign of the 10-step booking wizard is included in this change.

## Testing

Add/extend tests before implementation for:

- New schema/default fields.
- Hero desktop/mobile fallback selection.
- Header custom-logo fallback behavior.
- Header WhatsApp hidden when no number exists.
- Header/hero WhatsApp link when number exists.
- Admin hero/logo patching behavior.
- Site-media upload namespace remains `rafay/media/site/`.
- Production build passes.
- RAFAY brand audit passes.

## Release strategy

Implement on `rafay-brand-media-whatsapp` only. After tests, brand audit, production build, and live preview checks pass, merge into `main` so Vercel can deploy the update.

Do not alter the current production branch before verification.

## Self-review

- No TBD/TODO placeholders remain.
- Desktop + mobile hero media is explicit.
- Logo upload and fallback behavior are explicit.
- Header and hero WhatsApp behavior both use the existing admin-managed number.
- Fully mobile-responsive behavior is an acceptance requirement.
- Existing booking/storage/admin systems remain in scope-safe boundaries and are not redesigned.
