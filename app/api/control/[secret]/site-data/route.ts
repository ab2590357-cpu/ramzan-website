import { head, list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { isValidAdminSecret } from '@/lib/admin-auth';
import { loadSiteData, saveSiteData, SiteDataConflictError } from '@/lib/blob-store';
import { SiteDataSchema } from '@/lib/domain';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ secret: string }> };

type BlobAuth = {
  token?: string;
  oidcToken?: string;
  storeId?: string;
};

type DiagnosticAttempt = {
  mode: 'token' | 'oidc';
  source: string;
  storeId?: string;
  list: { ok: boolean; count?: number; error?: ReturnType<typeof safeError> };
  head: { ok: boolean; etag?: string; error?: ReturnType<typeof safeError> };
};

const CONFIG_PATH = 'rafay/config/site-data.json';

function hiddenNotFound() {
  return new Response('', { status: 404 });
}

function safeError(error: unknown) {
  const result: { name: string; message: string; status?: number; code?: string } = {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error)
  };

  if (error && typeof error === 'object') {
    if ('status' in error && Number.isFinite(Number((error as { status?: unknown }).status))) {
      result.status = Number((error as { status?: unknown }).status);
    }
    if ('code' in error && (error as { code?: unknown }).code != null) {
      result.code = String((error as { code?: unknown }).code);
    }
  }

  return result;
}

function maskStoreId(value: string) {
  const normalized = value.trim();
  if (normalized.length <= 8) return normalized;
  return `${normalized.slice(0, 4)}…${normalized.slice(-4)}`;
}

function publicStoreCandidates() {
  const items: Array<{ source: string; storeId: string }> = [];
  const seen = new Set<string>();
  const add = (source: string, value: string | undefined) => {
    const storeId = value?.trim();
    if (!storeId || seen.has(storeId)) return;
    seen.add(storeId);
    items.push({ source, storeId });
  };

  add('RAFAY_PUBLIC_MEDIA_BLOB_STORE_ID', process.env.RAFAY_PUBLIC_MEDIA_BLOB_STORE_ID);
  add('RAFAY_PUBLIC_BLOB_STORE_ID', process.env.RAFAY_PUBLIC_BLOB_STORE_ID);

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.endsWith('_STORE_ID')) continue;
    if (!/(PUBLIC|MEDIA)/i.test(key)) continue;
    if (/(PRIVATE|BOOKING)/i.test(key)) continue;
    add(key, value);
  }

  add('BLOB_STORE_ID', process.env.BLOB_STORE_ID);

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.endsWith('_STORE_ID')) continue;
    if (!/BLOB/i.test(key)) continue;
    if (/(PRIVATE|BOOKING)/i.test(key)) continue;
    add(key, value);
  }

  return items;
}

async function runAttempt(mode: 'token' | 'oidc', source: string, auth: BlobAuth, storeId?: string): Promise<DiagnosticAttempt> {
  let listResult: DiagnosticAttempt['list'];
  let headResult: DiagnosticAttempt['head'];

  try {
    const result = await list({ prefix: 'rafay/', limit: 1, ...auth });
    listResult = { ok: true, count: result.blobs.length };
  } catch (error) {
    listResult = { ok: false, error: safeError(error) };
  }

  try {
    const result = await head(CONFIG_PATH, auth);
    headResult = { ok: true, etag: result.etag };
  } catch (error) {
    headResult = { ok: false, error: safeError(error) };
  }

  return {
    mode,
    source,
    ...(storeId ? { storeId: maskStoreId(storeId) } : {}),
    list: listResult,
    head: headResult
  };
}

async function diagnosePublicBlob() {
  const attempts: DiagnosticAttempt[] = [];
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();

  if (token) {
    attempts.push(await runAttempt('token', 'BLOB_READ_WRITE_TOKEN', { token }));
  }

  const candidates = publicStoreCandidates();
  for (const candidate of candidates) {
    attempts.push(
      await runAttempt(
        'oidc',
        candidate.source,
        {
          storeId: candidate.storeId,
          ...(oidcToken ? { oidcToken } : {})
        },
        candidate.storeId
      )
    );
  }

  const storeEnvKeys = Object.entries(process.env)
    .filter(([key, value]) => key.endsWith('_STORE_ID') && typeof value === 'string' && value.trim())
    .map(([key, value]) => ({ key, storeId: maskStoreId(value as string) }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    tokenPresent: Boolean(token),
    oidcEnvPresent: Boolean(oidcToken),
    storeEnvKeys,
    attempts
  };
}

export async function GET(request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();

  const url = new URL(request.url);
  if (url.searchParams.get('diagnose') === '1') {
    const diagnostics = await diagnosePublicBlob();
    return NextResponse.json(diagnostics, { headers: { 'Cache-Control': 'no-store' } });
  }

  const payload = await loadSiteData();
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('data' in body) || !('etag' in body)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const input = body as { data: unknown; etag: unknown };
  if (typeof input.etag !== 'string' || input.etag.length < 1 || !input.data || typeof input.data !== 'object') {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const parsed = SiteDataSchema.safeParse({ ...(input.data as Record<string, unknown>), brandName: 'RAFAY' });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed.', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const saved = await saveSiteData(parsed.data, input.etag);
    return NextResponse.json(saved, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SiteDataConflictError) {
      return NextResponse.json({ error: 'Content changed in another session. Refresh before saving.' }, { status: 409 });
    }
    console.error('[RAFAY] Site-data save failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Site content storage is temporarily unavailable. Please reload and try again.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
