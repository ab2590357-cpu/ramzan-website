import { del, get, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { isValidAdminSecret } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ secret: string }> };

function safeError(error: unknown) {
  return {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error)
  };
}

export async function GET(_request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return new Response('', { status: 404 });

  const storeId = process.env.BLOB_STORE_ID?.trim();
  if (!storeId) return NextResponse.json({ ok: false, stage: 'config', error: 'BLOB_STORE_ID missing' }, { status: 500 });

  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim() || undefined;
  const auth = { storeId, ...(oidcToken ? { oidcToken } : {}) };
  const pathname = `rafay/diagnostics/private-probe-${Date.now()}-${crypto.randomUUID()}.json`;

  try {
    const blob = await put(pathname, JSON.stringify({ probe: true, nonce: crypto.randomUUID() }), {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json',
      ...auth
    });
    try {
      const result = await get(blob.url, { access: 'private', useCache: false, ...auth });
      const text = result?.stream ? await new Response(result.stream).text() : '';
      await del(blob.pathname, auth);
      return NextResponse.json({ ok: true, readBack: text.includes('"probe":true') }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      try { await del(blob.pathname, auth); } catch {}
      return NextResponse.json({ ok: false, stage: 'read', error: safeError(error) }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (error) {
    return NextResponse.json({ ok: false, stage: 'write', error: safeError(error) }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
