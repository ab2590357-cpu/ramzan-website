import { readMedia } from '@/lib/blob-store';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, context: Context) {
  const { path } = await context.params;
  try {
    if (!Array.isArray(path) || path.length < 1) return new Response('', { status: 404 });
    const media = await readMedia(path.join('/'));
    if (!media) return new Response('', { status: 404 });

    const body = new ArrayBuffer(media.body.byteLength);
    new Uint8Array(body).set(media.body);
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': media.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return new Response('', { status: 404 });
  }
}
