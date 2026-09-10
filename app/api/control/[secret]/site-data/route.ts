import { NextResponse } from 'next/server';
import { isValidAdminSecret } from '@/lib/admin-auth';
import { loadSiteData, saveSiteData, SiteDataConflictError } from '@/lib/blob-store';
import { SiteDataSchema } from '@/lib/domain';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ secret: string }> };

function hiddenNotFound() {
  return new Response('', { status: 404 });
}

export async function GET(_request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();
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
    throw error;
  }
}
