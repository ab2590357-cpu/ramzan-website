# RAFAY Brand Media + WhatsApp Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-controlled desktop/mobile hero imagery and logo branding, wire the configured WhatsApp number into the public header and hero, and strengthen the responsive RAFAY public presentation without changing the existing 10-step booking flow.

**Architecture:** Extend the existing Zod `SiteData` model with backward-compatible media fields, reuse the existing hidden admin media API with `scope=site`, and add a focused site-media uploader component inside Website Content. Public header and hero receive the already-loaded `SiteData`, use one reusable direct-contact WhatsApp helper, and retain safe bundled fallbacks when custom media or WhatsApp is absent.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, `@vercel/blob`, Vitest, React Testing Library, existing RAFAY CSS system.

**Spec:** `docs/superpowers/specs/2026-09-11-rafay-brand-media-whatsapp-design.md`

## Global Constraints

- Brand remains **RAFAY** everywhere.
- Sensual/adult-oriented presentation must remain non-explicit and lawful; no nudity, explicit sexual content, or sexual-service language.
- All depicted people must be unmistakably adults.
- Existing 10-step booking flow, booking storage, profiles, payments, bookings admin, and hidden no-login admin access must remain intact.
- Desktop hero image and mobile hero image are separate editable fields.
- Custom logo is editable from admin; bundled `/rafay-mark.svg` remains the fallback.
- Header and hero direct-contact buttons use the existing admin-managed `whatsappNumber`.
- Direct WhatsApp buttons are hidden when no usable number exists.
- Hero main CTA remains Book Privately; WhatsApp is the secondary CTA.
- JPEG, PNG, and WebP only; maximum 5 MB; site uploads go under `rafay/media/site/`.
- Missing mobile hero image falls back to desktop hero image.
- Missing desktop hero image on desktop uses the existing abstract RAFAY fallback.
- Missing both hero images uses the existing abstract RAFAY fallback.
- Removing a hero/logo reference does not immediately delete the underlying Blob.
- Failed upload keeps the previous image and shows a retryable error.
- Mobile acceptance widths: approximately 390px, 768px, 1024px, and 1440px.
- No horizontal scroll; mobile header actions stay reachable; touch controls remain approximately 44px minimum height.
- Implement only on `rafay-brand-media-whatsapp` until verification passes.

---

## File Structure

```text
lib/
  domain.ts                         # Extend HeroContent/SiteData schemas with media fields
  defaults.ts                       # Default empty custom media + default WhatsApp CTA
  public-whatsapp.ts                # Reusable direct-contact WhatsApp URL helper
  public-whatsapp.test.ts           # Number normalization/link tests
  domain.test.ts                    # Backward-compatible schema/default tests
  blob-store.test.ts                # Old persisted config migration/parse test

components/
  admin/
    site-media-uploader.tsx         # Reusable logo/hero site image uploader + preview/remove
    site-media-uploader.test.tsx    # Uploader helper/component behavior
    content-editor.tsx              # Hero Media + Branding controls
    admin-client.tsx                # Pass secret into ContentEditor
    admin-client.test.tsx           # Admin media patching behavior
  public-header.tsx                 # Dynamic logo + WhatsApp button
  public-header.test.tsx            # Logo and WhatsApp fallback behavior
  sections.tsx                      # Dynamic hero media + WhatsApp CTA
  public-home.test.tsx              # Hero media selection/fallback assertions

app/
  page.tsx                          # Pass SiteData into PublicHeader
  globals.css                       # Responsive header/hero/media/admin styles

app/api/control/[secret]/media/
  route.ts                          # Reused unchanged unless a failing test exposes a scope bug

app/api/control/
  media-route.test.ts               # Preserve `rafay/media/site/` namespace contract
```

---

### Task 1: Extend RAFAY site data safely and add direct-contact WhatsApp helper

**Files:**
- Modify: `lib/domain.ts`
- Modify: `lib/defaults.ts`
- Modify: `lib/domain.test.ts`
- Modify: `lib/blob-store.test.ts`
- Create: `lib/public-whatsapp.ts`
- Create: `lib/public-whatsapp.test.ts`

**Interfaces:**
- Produces `hero.desktopImageUrl`, `hero.mobileImageUrl`, `hero.imageAlt`, `hero.whatsappCta` on `SiteData`.
- Produces `logoUrl` and `logoAlt` on `SiteData`.
- Produces `buildPublicWhatsAppUrl(number: string, message?: string): string | null`.
- Later public/admin tasks consume these exact fields/helper.

- [ ] **Step 1: Add failing schema compatibility tests**

Extend `lib/domain.test.ts` with a test that parses an old-format `SiteData` object that does not contain the new hero/logo fields and expects defaults to be injected:

```ts
it('fills new brand-media fields when parsing old site data', () => {
  const legacy = structuredClone(DEFAULT_SITE_DATA) as Record<string, unknown>;
  const hero = { ...(legacy.hero as Record<string, unknown>) };
  delete hero.desktopImageUrl;
  delete hero.mobileImageUrl;
  delete hero.imageAlt;
  delete hero.whatsappCta;
  delete legacy.logoUrl;
  delete legacy.logoAlt;
  legacy.hero = hero;

  const parsed = SiteDataSchema.parse(legacy);
  expect(parsed.hero.desktopImageUrl).toBe('');
  expect(parsed.hero.mobileImageUrl).toBe('');
  expect(parsed.hero.imageAlt).toBe('');
  expect(parsed.hero.whatsappCta).toBe('WhatsApp');
  expect(parsed.logoUrl).toBe('');
  expect(parsed.logoAlt).toBe('RAFAY');
});
```

- [ ] **Step 2: Run the schema test and verify RED**

Run:

```bash
npm test -- lib/domain.test.ts
```

Expected: FAIL because the new fields do not yet exist.

- [ ] **Step 3: Extend the Zod schemas with backward-compatible defaults**

In `lib/domain.ts`, change `HeroContentSchema` to include:

```ts
export const HeroContentSchema = z.object({
  eyebrow: shortText(100),
  heading: requiredText(180),
  body: shortText(900),
  primaryCta: requiredText(60),
  secondaryCta: shortText(60),
  desktopImageUrl: z.string().url().or(z.literal('')).default(''),
  mobileImageUrl: z.string().url().or(z.literal('')).default(''),
  imageAlt: shortText(180).default(''),
  whatsappCta: shortText(60).default('WhatsApp')
});
```

Add immediately after `brandName` in `SiteDataSchema`:

```ts
logoUrl: z.string().url().or(z.literal('')).default(''),
logoAlt: shortText(120).default('RAFAY'),
```

Use Zod defaults instead of a one-off data migration so existing Vercel Blob JSON continues to parse on the first deployment after this change.

- [ ] **Step 4: Update defaults explicitly**

In `lib/defaults.ts`, add:

```ts
logoUrl: '',
logoAlt: 'RAFAY',
```

and inside `hero`:

```ts
desktopImageUrl: '',
mobileImageUrl: '',
imageAlt: '',
whatsappCta: 'WhatsApp'
```

Do not add a hard-coded remote image URL.

- [ ] **Step 5: Add a persisted-config compatibility test**

Extend `lib/blob-store.test.ts` so a legacy object missing these fields is parsed through `SiteDataSchema` and yields the same defaults. This test protects production Vercel Blob data from becoming unreadable after deploy.

- [ ] **Step 6: Write failing WhatsApp helper tests**

Create `lib/public-whatsapp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildPublicWhatsAppUrl } from './public-whatsapp';

describe('buildPublicWhatsAppUrl', () => {
  it('returns null when no usable number exists', () => {
    expect(buildPublicWhatsAppUrl('')).toBeNull();
    expect(buildPublicWhatsAppUrl(' + () - ')).toBeNull();
  });

  it('normalizes the number and encodes the RAFAY inquiry', () => {
    const url = buildPublicWhatsAppUrl('+92 300-1234567');
    expect(url).toContain('https://wa.me/923001234567?text=');
    expect(decodeURIComponent(url!.split('text=')[1])).toContain('Hi RAFAY');
  });
});
```

- [ ] **Step 7: Run helper test and verify RED**

```bash
npm test -- lib/public-whatsapp.test.ts
```

Expected: FAIL because `lib/public-whatsapp.ts` does not exist.

- [ ] **Step 8: Implement the helper**

Create `lib/public-whatsapp.ts`:

```ts
const DEFAULT_PUBLIC_MESSAGE = 'Hi RAFAY, I would like to make a private booking inquiry.';

export function buildPublicWhatsAppUrl(number: string, message = DEFAULT_PUBLIC_MESSAGE): string | null {
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
```

Do not reuse or change `lib/whatsapp.ts`; that helper remains dedicated to final booking summaries.

- [ ] **Step 9: Run focused tests**

```bash
npm test -- lib/domain.test.ts lib/blob-store.test.ts lib/public-whatsapp.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add lib/domain.ts lib/defaults.ts lib/domain.test.ts lib/blob-store.test.ts lib/public-whatsapp.ts lib/public-whatsapp.test.ts
git commit -m "feat: add RAFAY brand media fields and contact helper"
```

---

### Task 2: Add reusable site-media upload controls to Admin Website Content

**Files:**
- Create: `components/admin/site-media-uploader.tsx`
- Create: `components/admin/site-media-uploader.test.tsx`
- Modify: `components/admin/content-editor.tsx`
- Modify: `components/admin/admin-client.tsx`
- Modify: `components/admin/admin-client.test.tsx`
- Modify: `components/admin/admin.module.css`
- Modify: `app/api/control/media-route.test.ts`

**Interfaces:**
- Produces `<SiteMediaUploader secret label currentUrl previewAlt onChange />`.
- `SiteMediaUploader` calls existing `POST /api/control/[secret]/media` with `scope=site` and reports only the returned URL via `onChange(url)`.
- `ContentEditor` changes signature to `ContentEditor({ data, secret, onChange })`.
- No Blob is deleted when an editor clicks Remove; Remove only clears the SiteData reference.

- [ ] **Step 1: Add failing site namespace coverage to the media API test**

Extend `app/api/control/media-route.test.ts`:

```ts
it('stores site media in the RAFAY site namespace', async () => {
  const secret = 'ci-test-admin-key-at-least-32-characters';
  process.env.RAFAY_ADMIN_KEY = secret;
  const form = new FormData();
  form.set('scope', 'site');
  form.set('file', new File(['image-bytes'], 'hero.webp', { type: 'image/webp' }));

  const response = await POST(
    new Request('https://example.test/api/control/key/media', { method: 'POST', body: form }),
    { params: Promise.resolve({ secret }) }
  );
  const payload = await response.json();

  expect(response.status).toBe(201);
  expect(payload.pathname).toContain('rafay/media/site/');
});
```

- [ ] **Step 2: Run the existing media API test**

```bash
npm test -- app/api/control/media-route.test.ts
```

Expected: PASS. If this fails, fix only the discovered site-scope defect in `app/api/control/[secret]/media/route.ts` before continuing.

- [ ] **Step 3: Write failing uploader helper/component tests**

Create `components/admin/site-media-uploader.test.tsx` to assert:

```tsx
it('uploads site media and returns the new URL', async () => {
  // mock fetch => 201 { url: 'https://assets.public.blob.vercel-storage.com/rafay/media/site/hero.webp' }
  // render SiteMediaUploader
  // fire change with one WebP file
  // expect FormData scope === 'site'
  // expect onChange(newUrl)
});

it('does not clear the previous URL after a failed upload', async () => {
  // mock fetch => 400 { error: 'Image upload failed.' }
  // expect onChange not called and existing preview still rendered
});
```

- [ ] **Step 4: Run uploader test and verify RED**

```bash
npm test -- components/admin/site-media-uploader.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 5: Implement `SiteMediaUploader`**

Create a focused client component with props:

```ts
type Props = {
  secret: string;
  label: string;
  currentUrl: string;
  previewAlt: string;
  onChange: (url: string) => void;
};
```

Behavior:

```ts
const upload = async (file: File | undefined) => {
  if (!file) return;
  setState('uploading');
  setError('');
  const form = new FormData();
  form.set('scope', 'site');
  form.set('file', file);
  const response = await fetch(`/api/control/${encodeURIComponent(secret)}/media`, { method: 'POST', body: form });
  const payload = await response.json();
  if (!response.ok) {
    setState('error');
    setError(payload.error || 'Image upload failed.');
    return;
  }
  onChange(payload.url);
  setState('idle');
};
```

Render the current image preview when present, file input restricted to `image/jpeg,image/png,image/webp`, an Upload/Replace label, and a Remove button that calls `onChange('')` only.

- [ ] **Step 6: Add Hero Media and Branding blocks to `ContentEditor`**

Change signature:

```ts
export function ContentEditor({ data, secret, onChange }: {
  data: SiteData;
  secret: string;
  onChange: (next: Partial<SiteData>) => void;
})
```

Add before existing hero text fields:

```tsx
<h3 className={styles.subhead}>Branding</h3>
<SiteMediaUploader
  secret={secret}
  label="RAFAY logo"
  currentUrl={data.logoUrl}
  previewAlt={data.logoAlt || 'RAFAY logo'}
  onChange={(logoUrl) => onChange({ logoUrl })}
/>
<Field label="Logo alt text">
  <input value={data.logoAlt} maxLength={120} onChange={(e) => onChange({ logoAlt: e.target.value })} />
</Field>

<h3 className={styles.subhead}>Hero Media</h3>
<SiteMediaUploader
  secret={secret}
  label="Desktop hero"
  currentUrl={data.hero.desktopImageUrl}
  previewAlt={data.hero.imageAlt || 'RAFAY hero desktop'}
  onChange={(desktopImageUrl) => onChange({ hero: { ...data.hero, desktopImageUrl } })}
/>
<SiteMediaUploader
  secret={secret}
  label="Mobile hero"
  currentUrl={data.hero.mobileImageUrl}
  previewAlt={data.hero.imageAlt || 'RAFAY hero mobile'}
  onChange={(mobileImageUrl) => onChange({ hero: { ...data.hero, mobileImageUrl } })}
/>
```

Add fields for `imageAlt` and `whatsappCta` next to the existing hero copy controls.

- [ ] **Step 7: Pass `secret` from AdminClient**

Change:

```tsx
{view === 'website-content' && <ContentEditor data={draft} secret={secret} onChange={patch} />}
```

- [ ] **Step 8: Extend admin behavior tests**

In `components/admin/admin-client.test.tsx`, add assertions that media URL patch helpers leave unrelated `SiteData` fields unchanged and that clearing a custom logo/hero field results in an empty string, not removal of the parent object.

- [ ] **Step 9: Add responsive admin media styles**

In `components/admin/admin.module.css`, add classes for a preview card, fixed `aspect-ratio`, `object-fit: cover`, upload state, and stacked controls below approximately 700px. Ensure buttons remain at least 44px high on mobile.

- [ ] **Step 10: Run focused admin/media tests**

```bash
npm test -- app/api/control/media-route.test.ts components/admin/site-media-uploader.test.tsx components/admin/admin-client.test.tsx
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add app/api/control/media-route.test.ts components/admin
git commit -m "feat: add RAFAY hero and logo media controls"
```

---

### Task 3: Make the public header use admin logo and WhatsApp settings

**Files:**
- Modify: `components/public-header.tsx`
- Create: `components/public-header.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `PublicHeader` changes from `PublicHeader()` to `PublicHeader({ data }: { data: SiteData })`.
- Consumes `data.logoUrl`, `data.logoAlt`, `data.whatsappNumber`.
- Consumes `buildPublicWhatsAppUrl()` from Task 1.

- [ ] **Step 1: Write failing header tests**

Create `components/public-header.test.tsx` with three tests:

```tsx
it('uses bundled RAFAY logo when no custom logo exists', () => {
  render(<PublicHeader data={{ ...DEFAULT_SITE_DATA, logoUrl: '' }} />);
  expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('rafay-mark.svg'));
});

it('uses admin custom logo when configured', () => {
  render(<PublicHeader data={{ ...DEFAULT_SITE_DATA, logoUrl: 'https://example.com/logo.webp' }} />);
  expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('logo.webp'));
});

it('hides WhatsApp when the configured number is empty', () => {
  render(<PublicHeader data={{ ...DEFAULT_SITE_DATA, whatsappNumber: '' }} />);
  expect(screen.queryByRole('link', { name: /whatsapp/i })).toBeNull();
});
```

Add a fourth test with a valid number and expect the WhatsApp link `href` to contain `wa.me/`.

- [ ] **Step 2: Run test and verify RED**

```bash
npm test -- components/public-header.test.tsx
```

Expected: FAIL because the current header accepts no `data` prop and always uses the bundled logo.

- [ ] **Step 3: Implement dynamic branding/contact header**

In `components/public-header.tsx`:

```ts
const logoSrc = data.logoUrl || '/rafay-mark.svg';
const whatsappUrl = buildPublicWhatsAppUrl(data.whatsappNumber);
```

Render custom `logoAlt` when using custom media; keep the fallback mark alt behavior appropriate for the adjacent RAFAY wordmark. On the right render:

```tsx
{whatsappUrl && (
  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="header-whatsapp" aria-label="WhatsApp RAFAY">
    <span aria-hidden="true">...</span>
    <span className="header-whatsapp__label">WhatsApp</span>
  </a>
)}
```

Use a simple inline SVG WhatsApp-style chat/phone icon owned by the app rather than adding another icon dependency.

- [ ] **Step 4: Pass `data` from homepage**

Change `app/page.tsx`:

```tsx
return <>
  <AgeGate />
  <PublicHeader data={data} />
  ...
</>;
```

- [ ] **Step 5: Make header actions intentionally responsive**

In `app/globals.css`:

- Desktop keeps `18+`, WhatsApp, and Book Privately in one right-side row.
- Below ~760px hide the text label inside the WhatsApp control but keep the icon/button visible.
- Below ~560px hide the decorative `18+` pill before hiding either action.
- Keep logo and both action controls within the viewport.
- Use `min-height:44px` and compact horizontal padding.
- Do not create horizontal page overflow.

- [ ] **Step 6: Run focused header/public tests**

```bash
npm test -- components/public-header.test.tsx components/public-home.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/public-header.tsx components/public-header.test.tsx app/page.tsx app/globals.css
git commit -m "feat: connect RAFAY header branding and WhatsApp"
```

---

### Task 4: Render admin-controlled hero media and WhatsApp CTA responsively

**Files:**
- Modify: `components/sections.tsx`
- Modify: `components/public-home.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces `selectHeroImage(hero: SiteData['hero'], viewport: 'desktop' | 'mobile'): string` as a pure tested helper.
- Hero consumes `buildPublicWhatsAppUrl(data.whatsappNumber)`.
- Existing package/profile/trust/how sections remain behaviorally unchanged.

- [ ] **Step 1: Add failing hero-selection tests**

Extend `components/public-home.test.tsx`:

```ts
it('selects the desktop hero only for desktop', () => {
  const hero = { ...DEFAULT_SITE_DATA.hero, desktopImageUrl: 'https://example.com/desktop.webp', mobileImageUrl: 'https://example.com/mobile.webp' };
  expect(selectHeroImage(hero, 'desktop')).toBe('https://example.com/desktop.webp');
});

it('prefers mobile hero and falls back to desktop on mobile', () => {
  expect(selectHeroImage({ ...DEFAULT_SITE_DATA.hero, desktopImageUrl: 'https://example.com/desktop.webp', mobileImageUrl: 'https://example.com/mobile.webp' }, 'mobile')).toContain('mobile.webp');
  expect(selectHeroImage({ ...DEFAULT_SITE_DATA.hero, desktopImageUrl: 'https://example.com/desktop.webp', mobileImageUrl: '' }, 'mobile')).toContain('desktop.webp');
});

it('returns empty desktop media when no desktop image exists', () => {
  expect(selectHeroImage({ ...DEFAULT_SITE_DATA.hero, desktopImageUrl: '', mobileImageUrl: 'https://example.com/mobile.webp' }, 'desktop')).toBe('');
});
```

- [ ] **Step 2: Run test and verify RED**

```bash
npm test -- components/public-home.test.tsx
```

Expected: FAIL because `selectHeroImage` does not exist.

- [ ] **Step 3: Implement the media selector**

In `components/sections.tsx`:

```ts
export function selectHeroImage(hero: SiteData['hero'], viewport: 'desktop' | 'mobile'): string {
  if (viewport === 'desktop') return hero.desktopImageUrl.trim();
  return hero.mobileImageUrl.trim() || hero.desktopImageUrl.trim();
}
```

- [ ] **Step 4: Replace the static hero-art with image-aware media**

Calculate:

```ts
const desktopImage = selectHeroImage(data.hero, 'desktop');
const mobileImage = selectHeroImage(data.hero, 'mobile');
const whatsappUrl = buildPublicWhatsAppUrl(data.whatsappNumber);
```

Render a `hero-media` wrapper. When `desktopImage` exists, render a desktop `<img>` with `object-fit: cover`. When `mobileImage` exists, render a separate mobile `<img>` hidden above the mobile breakpoint. If the relevant image is absent at a viewport, keep the current `hero-orbit` / `hero-silhouette` fallback for that viewport.

Keep the overlay as a separate pseudo-element/CSS layer so custom images remain readable and consistent with the RAFAY wine/magenta palette.

- [ ] **Step 5: Replace hero secondary action with WhatsApp**

Keep:

```tsx
<Link href="/booking" className="rafay-button rafay-button--primary">{data.hero.primaryCta}</Link>
```

Then conditionally render:

```tsx
{whatsappUrl && (
  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rafay-button rafay-button--whatsapp">
    {data.hero.whatsappCta || 'WhatsApp'}
  </a>
)}
```

Do not change final booking WhatsApp summary behavior.

- [ ] **Step 6: Strengthen hero/proof styling without changing content model**

In `app/globals.css`:

- Give custom hero media a cinematic 4:5/right-column treatment on large screens.
- Add subtle black/wine gradient overlays.
- Keep text column contrast high.
- Strengthen proof strip visually with separators/pills while preserving `18+ only`, `Private requests`, `Consent & boundaries`.
- Mobile stacks text then media, uses mobile image, preserves image aspect ratio, and avoids clipping.
- No image stretching: use `width:100%`, `height:100%`, `object-fit:cover`.
- At ~390px, buttons may stack full-width if needed; WhatsApp remains visible.

- [ ] **Step 7: Extend render tests for WhatsApp visibility**

Add tests asserting no hero WhatsApp link when `whatsappNumber=''`, and a `wa.me` link with the configured `hero.whatsappCta` label when a number exists.

- [ ] **Step 8: Run focused hero tests**

```bash
npm test -- components/public-home.test.tsx lib/public-whatsapp.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/sections.tsx components/public-home.test.tsx app/globals.css
git commit -m "feat: add editable responsive RAFAY hero media"
```

---

### Task 5: Full regression, responsive acceptance, and release handoff

**Files:**
- Modify only if verification exposes a defect: `app/globals.css`, related component/test files
- No schema/booking redesign in this task

**Interfaces:**
- Produces a verified feature branch ready for preview and merge.

- [ ] **Step 1: Run all automated tests**

```bash
npm test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run RAFAY brand audit**

```bash
npm run check:brand
```

Expected: exit 0 with no unintended standalone `RAFE` runtime/product references.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: exit 0 with successful Next.js TypeScript build.

- [ ] **Step 4: Verify no booking-flow regression**

Run the existing booking-specific tests explicitly:

```bash
npm test -- components/booking-wizard.test.tsx lib/whatsapp.test.ts app/api/bookings-route.test.ts
```

Expected: PASS; existing 10-step booking logic and final WhatsApp summary remain unchanged.

- [ ] **Step 5: Deploy/inspect a feature-branch preview before merge**

Verify the branch deployment for `rafay-brand-media-whatsapp`. Do not merge based only on a green build.

- [ ] **Step 6: Manual responsive acceptance at 390px**

Check:

- logo fits without stretching;
- WhatsApp icon remains reachable;
- Book Privately remains reachable;
- no horizontal scroll;
- hero copy does not overlap media;
- mobile hero image is used when configured;
- if mobile image is cleared, desktop image is used on mobile;
- both hero actions are usable touch targets;
- admin hero/logo upload controls stack cleanly.

- [ ] **Step 7: Manual responsive acceptance at 768px, 1024px, and 1440px**

Confirm header actions never collide, desktop hero image appears at desktop widths, image is not stretched, and RAFAY overlay/text contrast remains readable.

- [ ] **Step 8: Verify admin behavior against live/shared data**

Using the hidden admin route:

1. Upload a desktop hero WebP.
2. Upload a different mobile hero WebP.
3. Upload a logo.
4. Edit hero alt and WhatsApp CTA label.
5. Ensure Business WhatsApp contains a valid number.
6. Save changes.
7. Refresh public site and confirm all three media references render.
8. Open header WhatsApp and hero WhatsApp; confirm both target the same normalized number.
9. Clear the mobile hero reference, save, and confirm mobile falls back to desktop.
10. Clear logo reference, save, and confirm `/rafay-mark.svg` fallback returns.

- [ ] **Step 9: Verify failure/fallback behavior**

Attempt an unsupported/oversized site image and confirm the existing image remains. Clear the WhatsApp number and confirm both direct WhatsApp controls disappear while Book Privately remains.

- [ ] **Step 10: Fresh final verification after any acceptance fixes**

```bash
npm test && npm run check:brand && npm run build
```

Expected: all three commands exit 0.

- [ ] **Step 11: Commit any QA-only fixes separately**

```bash
git add <only-files-changed-by-qa>
git commit -m "fix: polish RAFAY brand media responsiveness"
```

Skip this commit when no QA changes are required.

- [ ] **Step 12: Merge only after preview acceptance**

Open a PR from `rafay-brand-media-whatsapp` to `main`. Merge only when the fresh tests, brand audit, build, and responsive/live preview checks above are all green.

---

## Plan Self-Review

- **Spec coverage:** Data fields, backward compatibility, desktop/mobile hero images, image alt text, WhatsApp CTA, logo upload/fallback, header WhatsApp, hero WhatsApp, existing media API reuse, site namespace, failure behavior, and 390/768/1024/1440 responsive acceptance all map to tasks above.
- **Booking safety:** The existing final booking WhatsApp helper and 10-step wizard are explicitly left unchanged and re-tested in Task 5.
- **Persistence compatibility:** New Zod fields use defaults so existing Vercel Blob JSON without those fields remains readable.
- **Media safety:** Remove in Website Content clears references only; permanent Blob deletion remains in media management.
- **Placeholder scan:** No TBD/TODO/“implement later” placeholders remain.
- **Type consistency:** `desktopImageUrl`, `mobileImageUrl`, `imageAlt`, `whatsappCta`, `logoUrl`, `logoAlt`, `buildPublicWhatsAppUrl`, `SiteMediaUploader`, and `selectHeroImage` are defined once and consumed consistently by later tasks.
