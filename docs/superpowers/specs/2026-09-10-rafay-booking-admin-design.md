# RAFAY Booking Website + No-Login Admin — Design Spec

Date: 2026-09-10
Branch: `rafay-booking-admin`

## 1. Goal

Build a premium, seductive-but-tasteful **RAFAY** branded 18+ event companion / creator appearance booking website with a separate hidden admin dashboard. The public website must support a guided 10-step booking flow and WhatsApp handoff. The admin must be able to manage all important public content without editing code.

The website must not offer or facilitate sexual services. Visuals can be fashion-forward and sensual, but must remain non-explicit and only depict clearly adult talent.

## 2. Brand rule

The canonical brand spelling is **RAFAY** everywhere: page title, logo, navigation, hero copy, metadata, WhatsApp summary, admin dashboard and generated booking references/copy.

All existing `RAFE` branding in the current MVP will be migrated to `RAFAY` during implementation.

## 3. Technical architecture

The current single-file static MVP will be upgraded to a Next.js App Router application suitable for Vercel.

Core pieces:

- Public RAFAY website: Next.js pages/components.
- Hidden admin dashboard: private unlisted route inside the same app.
- Server mutation routes: validate the admin route secret before any create/update/delete operation.
- Vercel Blob: shared persistence for profile images, editable site JSON, payment configuration and booking request JSON records.
- GitHub: application source and version history.
- Vercel: hosting, server functions, environment secret and Blob storage.

This keeps the runtime stack limited to GitHub + Vercel and avoids requiring a separate database service for the first production version.

## 4. Admin access without login

There will be no username/password login screen.

Admin access uses a long random secret route key stored in Vercel environment variables, for example conceptually:

`/control/<long-random-secret>`

The exact secret is never committed to GitHub and never linked from the public website. The server verifies the route secret before rendering admin data and before accepting admin mutation requests.

Security limitation: anyone who obtains the complete secret admin URL effectively has admin access. The UI must explain this to the owner. The secret can be rotated by changing the Vercel environment variable.

## 5. Public website experience

### Visual direction

- Dark luxury base: near-black / charcoal.
- Accent family: deep wine, muted magenta, warm rose and restrained violet glow.
- Editorial typography: elegant display serif paired with a clean sans-serif.
- Large cinematic hero composition.
- Premium glass/soft-border cards with restrained animation.
- Tasteful adult portrait imagery; no explicit nudity or sexual-service language.
- Mobile-first responsive behavior.
- Consistent rounded corners and spacing.

### Main public sections

1. 18+ entry gate.
2. RAFAY branded hero.
3. Featured adult profiles.
4. Packages / appearance types.
5. Why choose RAFAY / trust and expectations.
6. How booking works.
7. Booking CTA.
8. Terms / consent / lawful-use notice.
9. Premium footer.

### 10-step booking flow

1. Choose profile.
2. Choose package.
3. Select date and time.
4. Select city and venue type.
5. Choose occasion.
6. Choose duration.
7. Select add-ons.
8. Choose payment preference.
9. Enter customer contact details and notes.
10. Review and continue to WhatsApp.

The booking is first saved as a shared booking request, then a pre-filled WhatsApp message is opened using the business WhatsApp number configured in admin.

No card payment is processed inside v1. Admin can publish payment methods/instructions and the customer can select a preferred method. A real payment gateway can be added later as a separate feature.

## 6. Admin dashboard

The admin UI is completely separate in navigation and styling from the public booking experience, while retaining the RAFAY brand system.

### Admin navigation

- Overview
- Profiles
- Packages
- Booking Options
- Payments
- Bookings
- Website Content
- Media
- Settings

### Overview

Show compact stats such as active profiles, total packages, total booking requests, pending requests and latest activity.

### Profiles

Admin can:

- Add profile.
- Edit profile.
- Remove profile with confirmation.
- Upload multiple profile images.
- Choose cover image.
- Reorder images.
- Edit name, short label, bio, vibe/style tags and display order.
- Set active/inactive visibility.
- Configure profile-specific availability note if needed.

Every public profile must be marked 18+ in data. The UI will not accept an age value below 18.

### Packages

Admin can add/edit/remove/reorder packages and manage:

- Name.
- Short description.
- Display price / starting price text.
- Optional duration note.
- Active/inactive state.
- Display order.

### Booking Options

Admin can manage option lists used in the 10-step wizard:

- Venue types.
- Occasions.
- Durations.
- Add-ons.
- Cities or free-text city mode.

### Payments

Admin can manage payment choices shown to customers:

- Method name.
- Public instruction text.
- Active/inactive state.
- Display order.
- Deposit/payment note used in the WhatsApp summary.

Sensitive account secrets must not be exposed in public JSON. If the owner enters bank/payment instructions intended for customers, only that explicitly public text is displayed.

### Bookings

Admin can view shared booking requests with:

- Reference ID.
- Customer name and phone.
- Selected profile.
- Package.
- Date/time.
- City/venue.
- Occasion.
- Duration.
- Add-on.
- Payment preference.
- Notes.
- Created time.
- Status.

Statuses: `Pending`, `Contacted`, `Confirmed`, `Completed`, `Cancelled`.

Admin can update status and delete a booking with confirmation.

### Website Content

Admin can edit:

- Hero eyebrow.
- Hero heading.
- Hero body copy.
- CTA labels.
- Trust/benefit cards.
- How-it-works copy.
- Footer copy.
- Legal/consent notice text within safe allowed boundaries.

### Media

A central image library lists uploaded profile/website images, their filenames and usage. Unused media can be deleted after confirmation.

### Settings

Editable settings:

- Brand name (default locked/displayed as RAFAY in v1).
- Business WhatsApp number.
- Public contact text.
- Default payment/deposit note.
- Social links if provided.
- Site visibility for profiles/packages.

## 7. Shared data model

### SiteConfig

- `brandName`
- `whatsappNumber`
- `hero`
- `trustCards[]`
- `howItWorks[]`
- `footer`
- `legalNotice`
- `bookingOptions`
- `paymentMethods[]`
- `updatedAt`
- `version`

### Profile

- `id`
- `name`
- `label`
- `bio`
- `tags[]`
- `images[]`
- `coverImageUrl`
- `active`
- `adultConfirmed`
- `displayOrder`
- `availabilityNote`
- `createdAt`
- `updatedAt`

### Package

- `id`
- `name`
- `description`
- `priceLabel`
- `durationNote`
- `active`
- `displayOrder`

### BookingRequest

- `id`
- `reference`
- `profileId`
- `profileNameSnapshot`
- `packageId`
- `packageNameSnapshot`
- `date`
- `time`
- `city`
- `venueType`
- `occasion`
- `duration`
- `addOn`
- `paymentPreference`
- `customerName`
- `customerPhone`
- `notes`
- `status`
- `createdAt`
- `updatedAt`

Snapshot names are stored so historical bookings remain readable even if a profile/package is later renamed or removed.

## 8. Vercel Blob layout

Use separate namespaces:

- `rafay/config/site-data.json` — editable public configuration and references.
- `rafay/media/profiles/<profile-id>/...` — public profile images.
- `rafay/media/site/...` — public site artwork.
- `rafay/bookings/<booking-id>.json` — private booking records.

Admin uploads go through a server-authorized Vercel Blob upload path with image MIME restrictions and file-size limits. Admin delete operations remove the related Blob only when it is safe to do so.

For the shared config JSON, updates use version/ETag-style conflict protection so two open admin tabs do not silently overwrite each other. On conflict the admin sees a refresh/retry message.

## 9. API boundaries

Public endpoints/actions:

- Read public site configuration.
- Read active profiles/packages.
- Create booking request.

Admin-only endpoints/actions protected by the secret route key:

- Create/update/delete profile.
- Create/update/delete package.
- Update booking options.
- Update payment methods.
- Update website content/settings.
- Upload/delete media.
- List booking requests.
- Update/delete booking request.

Server-side validation must reject malformed payloads and must never trust a client-supplied admin flag.

## 10. Validation and safety behavior

- Public age gate confirms visitor is 18+ before entering.
- Every publishable profile record requires `adultConfirmed=true`.
- Admin profile age validation never permits an under-18 value.
- Booking form requires explicit lawful-use/consent confirmation.
- Public and WhatsApp copy remains focused on social companionship, event hosting and creator appearances.
- No sexual services, explicit acts or illegal services are listed as packages/options.
- Phone/date/text fields are validated and length-limited server-side.
- Media uploads accept approved image MIME types only and have an enforced size limit.

## 11. Error handling

Public site:

- Friendly empty states if no profiles/packages are active.
- Booking submit failures retain the user's entered data and show a retry action.
- WhatsApp opens only after the booking record is successfully created.

Admin:

- Save buttons show loading/success/error states.
- Delete actions require confirmation.
- Failed uploads remain retryable.
- Data conflicts prompt refresh rather than overwriting newer data.
- Missing/invalid secret route returns a normal not-found response instead of revealing an admin page exists.

## 12. Responsive UI

Public and admin must be usable on desktop and mobile.

Public booking wizard uses large tap targets and sticky next/back controls on small screens. Admin navigation becomes a slide-out drawer on mobile. Profile image management uses a responsive sortable grid.

## 13. Migration from current MVP

Implementation will:

- Preserve the existing 10-step concept.
- Replace all visible `RAFE` branding with **RAFAY**.
- Replace browser-only localStorage content/bookings with Vercel-backed shared persistence.
- Split the large single HTML file into focused Next.js components/modules.
- Keep the old branch untouched as a fallback snapshot.
- Use the corrected implementation branch `rafay-booking-admin`.

## 14. Testing and acceptance criteria

Before calling the build complete:

- Production build exits successfully.
- No visible `RAFE` misspelling remains in the new app.
- Public profiles/packages come from shared storage rather than hard-coded arrays/localStorage.
- Admin can add, edit, hide and delete a profile.
- Admin can upload multiple profile images and choose a cover.
- Admin can add/edit/remove packages and booking options.
- Admin can edit public content and WhatsApp/payment settings.
- Public booking flow completes all 10 steps.
- A booking appears in admin after submission.
- Booking WhatsApp summary contains the selected booking details.
- Invalid admin route cannot read or mutate admin data.
- Delete actions require confirmation.
- Mobile layouts are tested at phone widths.
- Existing default branch remains untouched until the new branch is reviewed.

## 15. Deployment

Source remains in GitHub. Vercel deploys the Next.js project from the approved branch/project connection. Required runtime secrets such as the admin route key and Vercel Blob credentials live only in Vercel environment variables, not in source control.

The Vercel connector currently does not expose a usable project/team in this chat, so implementation can be committed to GitHub first. Final production deployment and live verification require the correct Vercel project connection to become visible or be linked to this repository.
