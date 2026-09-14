# RAFAY Versioned Public Config Design

## Goal

Fix RAFAY admin content persistence on Vercel without adding a new paid service or changing the public media flow.

## Problem

RAFAY currently stores site configuration at a stable public Blob pathname (`rafay/config/site-data.json`) and overwrites that object on save. Vercel Blob writes and metadata updates succeed, but public Blob content can still be served from CDN cache after an overwrite. This creates a bad state where the new ETag is visible but the JSON body can be one version behind immediately after Save Changes.

The public Blob store cannot be used for private objects, so private consistent-read behavior is not available on this store.

## Approved Architecture

Store every site-config save as a new immutable public Blob instead of overwriting a stable pathname.

Canonical version prefix:

`rafay/config/versions/`

Each successful save writes a unique pathname, for example:

`rafay/config/versions/2026-09-14T01-55-00-000Z-<uuid>.json`

Because each pathname is immutable, every read uses a unique Blob URL and cannot receive a stale body from an older overwrite at the same URL.

## Load Flow

1. If `RAFAY_DATA_DIR` is configured, keep the existing filesystem behavior unchanged.
2. Otherwise, list public Blob objects under `rafay/config/versions/`.
3. Select the newest valid version deterministically by Blob upload timestamp/path ordering.
4. Read and validate that immutable JSON object.
5. Use that version object's ETag as the optimistic-concurrency token returned to the admin UI.
6. If no versioned config exists yet, fall back to the legacy `rafay/config/site-data.json` object for migration compatibility.
7. If neither versioned nor legacy config exists, seed the first immutable version using default site data.

## Save Flow

1. Validate incoming site data as today and force `brandName = RAFAY`.
2. Resolve the current latest config and compare its ETag with the client-provided ETag.
3. If they differ, return the existing content-conflict behavior instead of silently overwriting another session's changes.
4. Increment `version`, update `updatedAt`, and write a new unique immutable Blob under `rafay/config/versions/`.
5. Return the newly written data and its Blob ETag.
6. Never overwrite the previous version object.

## Migration

No destructive migration is required.

The existing stable object remains readable as a legacy fallback. The first successful save after deployment creates the first immutable version. Once at least one immutable version exists, subsequent loads and saves use the versioned config flow.

## Media and Booking Scope

Hero/logo/profile media remain in the existing public media namespace and are not moved by this change.

Private booking storage remains separate and is not reused for site configuration.

## Failure Handling

- If listing/reading Blob storage fails, retain the existing safe `blob-read-error` behavior.
- If the expected ETag is stale, return `SiteDataConflictError` / HTTP 409.
- If a newly written immutable version cannot be read back, surface storage failure rather than reporting a false success.
- Never log Blob tokens or secrets.

## Testing

Add regression coverage for:

- fresh public store seeds an immutable config version;
- legacy stable config is used when no immutable version exists;
- newest immutable version wins over legacy config;
- save creates a new unique Blob instead of overwriting an existing pathname;
- save rejects stale ETag values;
- immediate load after save returns the new version and ETag;
- public media behavior remains unchanged.

## Production Verification

After tests pass:

1. deploy only `rafay-web` production;
2. verify `/api/health`;
3. verify admin config read returns a normal Blob ETag rather than `blob-read-error`;
4. perform a no-visible-change Save Changes roundtrip and confirm version + ETag advance;
5. reread and confirm the same newly saved version is returned immediately;
6. test hero/logo upload and persistence;
7. inspect runtime errors/logs for Blob or 5xx failures;
8. remove temporary diagnostic/probe routes before final production sign-off.
