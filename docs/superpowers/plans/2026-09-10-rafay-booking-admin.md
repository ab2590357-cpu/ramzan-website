# RAFAY Booking + Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-file RAFAY MVP with a premium Next.js/Vercel application containing a public 10-step booking flow, shared Vercel Blob persistence, and a hidden no-login admin dashboard that can manage profiles, media, packages, content, payments, settings, and booking requests.

**Architecture:** Use Next.js App Router with Server Components for public/admin reads and Route Handlers for writes. Store public site data in one public Vercel Blob JSON object with ETag conditional writes, profile/site images in public Blob paths, and booking requests as private Blob JSON records. Protect every admin page and admin API mutation with the same secret route segment validated against `RAFAY_ADMIN_KEY` from the server environment.

**Tech Stack:** Next.js App Router, React, TypeScript, `@vercel/blob`, Zod, Lucide React, Vitest, React Testing Library, plain global CSS/CSS modules.

**Spec:** `docs/superpowers/specs/2026-09-10-rafay-booking-admin-design.md`

## Global Constraints

- Canonical brand spelling is **RAFAY** everywhere; no visible `RAFE` copy may remain.
- Website is for lawful 18+ social companionship, event hosting, and creator appearances only; no sexual-service offers or explicit service language.
- No username/password login page.
- Admin lives at a long secret route and every admin mutation must verify the server-side `RAFAY_ADMIN_KEY`.
- Admin route must never be linked from public navigation, footer, sitemap, or metadata.
- Public profile records require `adultConfirmed=true` before they can render.
- Public booking flow remains exactly 10 steps.
- WhatsApp opens only after a booking record is successfully persisted.
- Profile/site media accepts JPEG, PNG, and WebP only, maximum 5 MB per file.
- Public content and profile/package data must not use browser `localStorage` as the source of truth.
- Existing default branch stays untouched until the feature branch is reviewed.
- Final deployment secrets stay in Vercel environment variables, never source control.

---

## Planned File Structure

```text
app/
  api/
    bookings/route.ts
    control/[secret]/site-data/route.ts
    control/[secret]/media/route.ts
    control/[secret]/bookings/route.ts
    control/[secret]/bookings/[id]/route.ts
  booking/page.tsx
  control/[secret]/page.tsx
  control/[secret]/admin-client.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  age-gate.tsx
  booking-wizard.tsx
  profile-card.tsx
  public-header.tsx
  public-footer.tsx
  sections.tsx
  admin/admin-shell.tsx
  admin/profile-editor.tsx
  admin/package-editor.tsx
  admin/content-editor.tsx
  admin/media-manager.tsx
  admin/bookings-manager.tsx
lib/
  admin-auth.ts
  blob-store.ts
  defaults.ts
  domain.ts
  whatsapp.ts
  validators.ts
public/
  rafay-mark.svg
  rafay-placeholder.svg
scripts/
  check-brand.mjs
  seed-rafay.mjs
vitest.config.ts
vitest.setup.ts
package.json
next.config.ts
tsconfig.json
```

---

### Task 1: Scaffold the Next.js application and test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `public/rafay-mark.svg`
- Create: `public/rafay-placeholder.svg`
- Test: `app/layout.test.tsx`

**Interfaces:**
- Produces a compilable Next.js App Router shell and reusable global RAFAY visual tokens.
- Later tasks rely on `app/layout.tsx`, `app/globals.css`, the package scripts, and the Vitest setup.

- [ ] **Step 1: Create package metadata and scripts**

Use dependencies installed with the current published versions and let `package-lock.json` pin exact versions:

```json
{
  "name": "rafay-booking",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "check:brand": "node scripts/check-brand.mjs"
  }
}
```

Install:

```bash
npm install next@latest react@latest react-dom@latest @vercel/blob@latest zod@latest lucide-react@latest
npm install -D typescript@latest @types/node@latest @types/react@latest @types/react-dom@latest vitest@latest jsdom@latest @testing-library/react@latest @testing-library/jest-dom@latest
```

- [ ] **Step 2: Write the failing layout test**

```tsx
import { render, screen } from '@testing-library/react';
import RootLayout from './layout';

it('publishes RAFAY metadata copy in the shell', () => {
  render(<RootLayout><main>content</main></RootLayout>);
  expect(screen.getByText('content')).toBeInTheDocument();
});
```

Run:

```bash
npm test -- app/layout.test.tsx
```

Expected: FAIL until the layout and test environment exist.

- [ ] **Step 3: Implement the app shell**

`app/layout.tsx` must export metadata with title `RAFAY — Private Event & Creator Booking`, import `./globals.css`, and render children inside `<body>`. Use `next/font` with one serif display font and one sans-serif UI font; expose them through CSS variables.

- [ ] **Step 4: Add brand tokens and responsive base CSS**

Define CSS variables for near-black background, warm white text, wine/magenta/rose accents, border opacity, 20px card radius, 14px control radius, shadows, content max-width, and responsive breakpoints. Do not use explicit imagery in CSS.

- [ ] **Step 5: Configure image hosts**

`next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.blob.vercel-storage.com' }
    ]
  }
};

export default nextConfig;
```

- [ ] **Step 6: Run tests and build**

```bash
npm test
npm run build
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts vitest.setup.ts app public
git commit -m "chore: scaffold RAFAY Next.js app"
```

---

### Task 2: Define domain schemas, defaults, and Blob persistence

**Files:**
- Create: `lib/domain.ts`
- Create: `lib/defaults.ts`
- Create: `lib/blob-store.ts`
- Create: `lib/validators.ts`
- Create: `scripts/seed-rafay.mjs`
- Test: `lib/domain.test.ts`
- Test: `lib/blob-store.test.ts`

**Interfaces:**
- Produces `SiteData`, `Profile`, `Package`, `BookingRequest`, `BookingInput`, `BookingStatus` types.
- Produces `loadSiteData()`, `saveSiteData(next, expectedEtag)`, `createBooking(input)`, `listBookings()`, `updateBooking(id, patch)`, `deleteBooking(id)`, `listMedia(prefix)`, `deleteMedia(pathname)`.
- All public/admin pages and APIs consume these exact functions.

- [ ] **Step 1: Write schema tests first**

```ts
import { ProfileSchema, BookingInputSchema } from './domain';

it('rejects a profile that is not confirmed adult', () => {
  const result = ProfileSchema.safeParse({
    id: 'p1', name: 'Alex', label: 'Host', bio: 'Bio', tags: [], images: [],
    coverImageUrl: '', active: true, adultConfirmed: false, displayOrder: 0,
    availabilityNote: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  expect(result.success).toBe(true);
  if (result.success) expect(result.data.adultConfirmed).toBe(false);
});

it('rejects an invalid booking phone/date payload', () => {
  expect(BookingInputSchema.safeParse({ customerName: '', customerPhone: '1' }).success).toBe(false);
});
```

- [ ] **Step 2: Implement Zod schemas and inferred types**

`lib/domain.ts` must export:

```ts
export const BookingStatusSchema = z.enum(['Pending','Contacted','Confirmed','Completed','Cancelled']);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  label: z.string().max(80),
  bio: z.string().max(1200),
  tags: z.array(z.string().max(40)).max(12),
  images: z.array(z.string().url()).max(12),
  coverImageUrl: z.string().url().or(z.literal('')),
  active: z.boolean(),
  adultConfirmed: z.boolean(),
  displayOrder: z.number().int().min(0),
  availabilityNote: z.string().max(300),
  createdAt: z.string(),
  updatedAt: z.string()
});
```

Define equivalent schemas for `Package`, `PaymentMethod`, `BookingOptions`, `HeroContent`, `SiteData`, `BookingInput`, and `BookingRequest`. `BookingInput` must require consent `lawfulUseConfirmed: z.literal(true)` and length-limit free text.

- [ ] **Step 3: Add safe defaults**

`lib/defaults.ts` exports `DEFAULT_SITE_DATA` with brand `RAFAY`, three tasteful demo packages, six adult-confirmed demo profile shells using `/rafay-placeholder.svg`, lawful booking options, and no live payment secrets.

- [ ] **Step 4: Write Blob storage tests with mocked SDK calls**

Test that a conflicting ETag maps to a typed conflict error and that private booking paths use `rafay/bookings/`.

```ts
it('builds private booking path', () => {
  expect(bookingPath('abc')).toBe('rafay/bookings/abc.json');
});
```

- [ ] **Step 5: Implement Blob storage**

Use `@vercel/blob` `list`, `get`, `head`, `put`, and `del`.

```ts
export async function saveSiteData(next: SiteData, expectedEtag: string) {
  const current = await head('rafay/config/site-data.json');
  if (current.etag !== expectedEtag) throw new SiteDataConflictError();
  const blob = await put('rafay/config/site-data.json', JSON.stringify(next), {
    access: 'public', allowOverwrite: true, ifMatch: expectedEtag,
    contentType: 'application/json'
  });
  return { data: next, etag: blob.etag };
}
```

`loadSiteData()` must seed with `DEFAULT_SITE_DATA` only when the config blob does not exist. `createBooking()` writes a private JSON blob. `listBookings()` lists `rafay/bookings/`, uses `get(blob.url,{access:'private'})`, parses each record, and sorts newest first.

- [ ] **Step 6: Add a seed script**

`seed-rafay.mjs` writes the initial `rafay/config/site-data.json` only after an explicit `--force` flag when the object already exists.

- [ ] **Step 7: Run focused tests**

```bash
npm test -- lib/domain.test.ts lib/blob-store.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib scripts
npm test
git commit -m "feat: add RAFAY domain and Blob persistence"
```

---

### Task 3: Protect the hidden admin route and admin APIs

**Files:**
- Create: `lib/admin-auth.ts`
- Create: `app/control/[secret]/page.tsx`
- Create: `app/api/control/[secret]/site-data/route.ts`
- Test: `lib/admin-auth.test.ts`
- Test: `app/api/control/site-data-route.test.ts`

**Interfaces:**
- Produces `isValidAdminSecret(secret: string): boolean` and `requireAdminSecret(secret: string): void`.
- Admin page and all admin APIs consume these functions.

- [ ] **Step 1: Write secret validation tests**

```ts
it('accepts the configured admin key only', () => {
  process.env.RAFAY_ADMIN_KEY = 'a-very-long-test-secret';
  expect(isValidAdminSecret('a-very-long-test-secret')).toBe(true);
  expect(isValidAdminSecret('wrong')).toBe(false);
});
```

- [ ] **Step 2: Implement constant-time comparison**

Use Node `crypto.timingSafeEqual` after checking equal byte lengths. Reject missing environment configuration with a server error; do not fall back to a hard-coded key.

- [ ] **Step 3: Implement hidden admin page behavior**

`app/control/[secret]/page.tsx` must await `params`, call `isValidAdminSecret`, and call `notFound()` on failure. It must not export SEO metadata that reveals the route and must set `robots: { index: false, follow: false }`.

- [ ] **Step 4: Implement admin site-data API**

`GET` returns `{data,etag}` only after secret validation. `PUT` parses `{data,etag}`, validates `SiteDataSchema`, forces `brandName` to `RAFAY`, and calls `saveSiteData`. Return HTTP 409 for `SiteDataConflictError`.

- [ ] **Step 5: Verify invalid routes**

Tests must assert bad secret => 404-equivalent for page logic and 404/403 without data for APIs. No response body should say “admin exists”.

- [ ] **Step 6: Commit**

```bash
git add lib/admin-auth.ts app/control app/api/control tests
npm test
git commit -m "feat: protect RAFAY hidden admin route"
```

---

### Task 4: Build the premium public RAFAY website

**Files:**
- Create: `app/page.tsx`
- Create: `components/public-header.tsx`
- Create: `components/public-footer.tsx`
- Create: `components/age-gate.tsx`
- Create: `components/profile-card.tsx`
- Create: `components/sections.tsx`
- Modify: `app/globals.css`
- Test: `components/public-home.test.tsx`

**Interfaces:**
- Consumes `loadSiteData()` and `SiteData`.
- Produces public profile cards and booking CTAs linked to `/booking`.

- [ ] **Step 1: Write public rendering tests**

Render with test data containing one active/adult profile, one inactive profile, and one non-adult-confirmed profile. Assert only the active adult-confirmed profile renders.

- [ ] **Step 2: Implement public data filtering**

Before rendering:

```ts
const visibleProfiles = data.profiles
  .filter((p) => p.active && p.adultConfirmed)
  .sort((a,b) => a.displayOrder - b.displayOrder);
const visiblePackages = data.packages
  .filter((p) => p.active)
  .sort((a,b) => a.displayOrder - b.displayOrder);
```

- [ ] **Step 3: Implement age gate**

Client component stores only `rafay_age_confirmed=yes` in session/local browser storage. It must clearly say 18+ and lawful social/event booking. The public page should remain readable to search engines only through non-sensitive brand copy; the interactive booking CTA stays behind the gate in the browser.

- [ ] **Step 4: Implement visual sections**

Create: sticky transparent header, cinematic RAFAY hero, featured profiles, packages, trust cards, how-it-works timeline, final CTA, legal notice, premium footer. Use `next/image` for profile media with placeholder fallback and `sizes` attributes.

- [ ] **Step 5: Style responsive states**

Desktop: editorial split layouts and 3-column cards. Mobile: single-column cards, 44px+ tap targets, no horizontal overflow, hero text below 54px, cards with 20px radius.

- [ ] **Step 6: Run test and build**

```bash
npm test -- components/public-home.test.tsx
npm run build
```

Expected: PASS / exit 0.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/globals.css components public
 git commit -m "feat: build premium RAFAY public site"
```

---

### Task 5: Build the 10-step booking wizard and WhatsApp handoff

**Files:**
- Create: `app/booking/page.tsx`
- Create: `components/booking-wizard.tsx`
- Create: `lib/whatsapp.ts`
- Create: `app/api/bookings/route.ts`
- Test: `components/booking-wizard.test.tsx`
- Test: `lib/whatsapp.test.ts`
- Test: `app/api/bookings-route.test.ts`

**Interfaces:**
- Consumes public `SiteData`, `BookingInputSchema`, and `createBooking()`.
- Produces `buildWhatsAppUrl(number: string, booking: BookingRequest, paymentNote: string): string`.

- [ ] **Step 1: Write wizard progression test**

Create a test that selects profile/package/options, fills date/time/city/contact fields, checks lawful-use consent, and asserts the UI reaches `Step 10 of 10` without skipping a step.

- [ ] **Step 2: Implement the exact 10 steps**

State shape:

```ts
type BookingDraft = {
  profileId: string; packageId: string; date: string; time: string;
  city: string; venueType: string; occasion: string; duration: string;
  addOn: string; paymentPreference: string; customerName: string;
  customerPhone: string; notes: string; lawfulUseConfirmed: boolean;
};
```

Reject “Continue” on incomplete required data and show inline validation without clearing previous input.

- [ ] **Step 3: Implement public booking API**

`POST /api/bookings` validates `BookingInputSchema`, loads current site data, verifies selected profile is active/adult-confirmed and selected package is active, creates snapshots, persists the private booking record, and returns `{booking, whatsappUrl}`.

- [ ] **Step 4: Implement WhatsApp URL generation**

Normalize the business number to digits and create a message beginning `RAFAY BOOKING REQUEST` with reference, profile, package, date/time, city/venue, occasion, duration, add-on, payment preference, customer details, public payment note, and lawful 18+ usage notice.

- [ ] **Step 5: Ensure persistence precedes WhatsApp**

The client may call `window.location.assign(whatsappUrl)` or `window.open` only after the POST returns 201. On failure, keep draft state and show retry.

- [ ] **Step 6: Run focused tests**

```bash
npm test -- components/booking-wizard.test.tsx lib/whatsapp.test.ts app/api/bookings-route.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/booking app/api/bookings components/booking-wizard.tsx lib/whatsapp.ts
npm test
git commit -m "feat: add RAFAY 10-step booking flow"
```

---

### Task 6: Build the editable admin dashboard for profiles, packages, options, payments, content, and settings

**Files:**
- Create: `app/control/[secret]/admin-client.tsx`
- Create: `components/admin/admin-shell.tsx`
- Create: `components/admin/profile-editor.tsx`
- Create: `components/admin/package-editor.tsx`
- Create: `components/admin/content-editor.tsx`
- Modify: `app/control/[secret]/page.tsx`
- Modify: `app/globals.css`
- Test: `components/admin/admin-client.test.tsx`

**Interfaces:**
- Consumes admin `GET/PUT /api/control/[secret]/site-data`.
- Updates a single typed `SiteData` draft and persists with the latest ETag.

- [ ] **Step 1: Write CRUD behavior tests**

Test profile add, profile edit, profile active toggle, delete confirmation, package add/remove, option-list add/remove, payment-method add/remove, hero copy edit, and WhatsApp number edit.

- [ ] **Step 2: Implement admin shell navigation**

Tabs/drawer: Overview, Profiles, Packages, Booking Options, Payments, Bookings, Website Content, Media, Settings. On mobile the sidebar becomes a drawer; desktop keeps a fixed sidebar.

- [ ] **Step 3: Implement profile editor**

Profile create defaults:

```ts
{
  id: crypto.randomUUID(), name: '', label: '', bio: '', tags: [], images: [],
  coverImageUrl: '', active: false, adultConfirmed: true, displayOrder: nextOrder,
  availabilityNote: '', createdAt: now, updatedAt: now
}
```

The editor must not allow publishing while `adultConfirmed` is false. Delete uses a confirmation dialog.

- [ ] **Step 4: Implement package/options/payment editors**

Use reorder buttons (`Move up`, `Move down`) rather than adding drag-and-drop dependencies. Persist display order as consecutive integers after reordering.

- [ ] **Step 5: Implement content/settings editor**

Allow hero, CTA, trust cards, how-it-works, footer, legal notice, WhatsApp number, public contact, social links, and deposit/payment note. Render brand name as locked `RAFAY` text in v1.

- [ ] **Step 6: Implement save/conflict states**

On save, send `{data:draft,etag}`. HTTP 409 shows `This content changed in another tab. Refresh before saving again.` and does not overwrite.

- [ ] **Step 7: Run focused tests**

```bash
npm test -- components/admin/admin-client.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/control components/admin app/globals.css
npm test
git commit -m "feat: add editable RAFAY admin dashboard"
```

---

### Task 7: Add profile/site media upload and management

**Files:**
- Create: `app/api/control/[secret]/media/route.ts`
- Create: `components/admin/media-manager.tsx`
- Modify: `components/admin/profile-editor.tsx`
- Test: `app/api/control/media-route.test.ts`
- Test: `components/admin/media-manager.test.tsx`

**Interfaces:**
- `POST /api/control/[secret]/media` consumes multipart `file`, `scope`, optional `profileId` and returns `{url,pathname}`.
- `GET` returns media metadata under `rafay/media/`.
- `DELETE` consumes `{pathname}` and removes an unused blob after validation.

- [ ] **Step 1: Write upload validation tests**

Assert JPEG/PNG/WebP under 5 MB pass; GIF/PDF/SVG executable uploads and files above 5 MB fail with 400/413.

- [ ] **Step 2: Implement upload route**

Validate secret first. Path profile images as `rafay/media/profiles/<profileId>/<uuid>-<safe-name>` and site images as `rafay/media/site/<uuid>-<safe-name>`. Use:

```ts
await put(pathname, file, {
  access: 'public',
  addRandomSuffix: false,
  contentType: file.type
});
```

- [ ] **Step 3: Implement profile gallery controls**

Upload multiple images one at a time with progress/loading state. Add `Set cover`, `Move left`, `Move right`, and `Remove from profile` controls. Removing from a profile does not immediately delete the Blob if another record still references it.

- [ ] **Step 4: Implement central media manager**

List thumbnail, pathname, size, uploaded time, and usage status. Only show permanent delete for unreferenced media and require confirmation.

- [ ] **Step 5: Run tests**

```bash
npm test -- app/api/control/media-route.test.ts components/admin/media-manager.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/control components/admin
npm test
git commit -m "feat: add RAFAY media management"
```

---

### Task 8: Add shared booking management in admin

**Files:**
- Create: `app/api/control/[secret]/bookings/route.ts`
- Create: `app/api/control/[secret]/bookings/[id]/route.ts`
- Create: `components/admin/bookings-manager.tsx`
- Modify: `app/control/[secret]/admin-client.tsx`
- Test: `app/api/control/bookings-route.test.ts`
- Test: `components/admin/bookings-manager.test.tsx`

**Interfaces:**
- `GET /api/control/[secret]/bookings` returns `BookingRequest[]` newest-first.
- `PATCH /api/control/[secret]/bookings/[id]` consumes `{status: BookingStatus}`.
- `DELETE /api/control/[secret]/bookings/[id]` permanently removes that booking blob.

- [ ] **Step 1: Write API tests**

Assert invalid status fails, valid status changes persist, invalid secret cannot list records, and delete requires the exact booking id path.

- [ ] **Step 2: Implement list/status/delete handlers**

Validate secret before touching Blob. Parse status with `BookingStatusSchema`. Return 404 for unknown booking IDs.

- [ ] **Step 3: Implement admin booking table**

Columns: Ref, Customer, Phone, Profile, Package, Date/Time, City, Payment, Status, Actions. Row expansion shows venue, occasion, duration, add-on, and notes.

- [ ] **Step 4: Implement status and delete UI**

Status dropdown options are exactly `Pending`, `Contacted`, `Confirmed`, `Completed`, `Cancelled`. Delete requires confirmation text `Delete booking <reference>?`.

- [ ] **Step 5: Add overview metrics**

Admin Overview shows total bookings, Pending count, Confirmed count, active profiles, active packages, and latest five booking references.

- [ ] **Step 6: Run tests**

```bash
npm test -- app/api/control/bookings-route.test.ts components/admin/bookings-manager.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/control components/admin
npm test
git commit -m "feat: manage RAFAY bookings in admin"
```

---

### Task 9: Brand audit, migration cleanup, full QA, and deployment handoff

**Files:**
- Create: `scripts/check-brand.mjs`
- Create: `.env.example`
- Create: `README.md`
- Modify: `app/layout.tsx`
- Delete after successful migration: `index.html`
- Keep untouched unless explicitly approved: default branch and original uploaded legacy file `index.html_style.css_script.js`

**Interfaces:**
- Produces repeatable brand check, environment setup instructions, and final deployment checklist.

- [ ] **Step 1: Add brand audit script**

`check-brand.mjs` recursively scans source files while excluding `.git`, `.next`, `node_modules`, docs/spec/history files, and fails on the regex `/\bRAFE\b/g`.

Example failure behavior:

```js
if (hits.length) {
  console.error(hits.join('\n'));
  process.exit(1);
}
```

- [ ] **Step 2: Add environment template**

`.env.example`:

```dotenv
RAFAY_ADMIN_KEY=replace-with-a-long-random-secret
BLOB_READ_WRITE_TOKEN=configure-through-vercel-storage
```

Do not commit actual values.

- [ ] **Step 3: Write README deployment instructions**

Include: install, test, build, create/link Vercel project, attach Vercel Blob store, set `RAFAY_ADMIN_KEY`, seed config, deploy, verify public `/`, verify `/booking`, verify invalid `/control/wrong-key` returns not-found, verify real secret route, submit a test booking, verify it appears in admin, and verify WhatsApp message composition.

- [ ] **Step 4: Remove the migrated legacy `index.html` only after the Next build passes**

Run first:

```bash
npm test
npm run check:brand
npm run build
```

Expected: all exit 0. Then remove only the feature-branch legacy `index.html` so Next.js becomes the sole app entrypoint.

- [ ] **Step 5: Re-run complete verification after deletion**

```bash
npm test
npm run check:brand
npm run build
```

Expected: all exit 0 with zero failing tests and no `RAFE` brand hits.

- [ ] **Step 6: Manual responsive acceptance pass**

Verify at approximately 390px, 768px, 1024px, and 1440px widths:

- no horizontal scroll;
- admin drawer works on mobile;
- public CTA and wizard controls are at least 44px high;
- profile images retain readable aspect ratios;
- Step 1 through Step 10 are usable without clipped controls;
- admin profile/media forms remain usable on phone width.

- [ ] **Step 7: Verify security behavior**

Check public source/navigation does not expose the secret route, invalid secret yields not-found, admin APIs reject invalid secret, actual secret is absent from Git history, and booking blobs use private access.

- [ ] **Step 8: Commit final QA/docs changes**

```bash
git add README.md .env.example scripts app components lib package.json package-lock.json
 git rm index.html
npm test && npm run check:brand && npm run build
git commit -m "chore: finalize RAFAY booking platform QA"
```

- [ ] **Step 9: Deployment checkpoint**

When the correct Vercel project becomes visible/linked, deploy the `rafay-booking-admin` branch as a preview first. Do not promote to production until the preview passes the public/admin/manual booking checks above.

---

## Plan Self-Review

- Spec coverage: public brand, 10-step flow, shared persistence, hidden admin, profile/package/content/payment editing, image uploads, booking management, conflict handling, age/consent safeguards, mobile responsiveness, and deployment are all mapped to tasks above.
- Placeholder scan: no `TBD`, `TODO`, “implement later”, or unspecified test step remains.
- Type consistency: `SiteData`, `BookingInput`, `BookingRequest`, `BookingStatus`, `loadSiteData`, `saveSiteData`, `createBooking`, `listBookings`, `updateBooking`, and `deleteBooking` are defined once in Task 2 and consumed consistently by later tasks.
