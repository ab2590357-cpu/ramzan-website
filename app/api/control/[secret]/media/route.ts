import { NextResponse } from 'next/server';
import { isValidAdminSecret } from '@/lib/admin-auth';
import { deleteMedia, hasBlobStorageConfig, saveMedia } from '@/lib/blob-store';
import { safeFileName } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const MAX_MEDIA_SIZE = 5 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

type Context = { params: Promise<{ secret: string }> };

type MediaValidation = { ok: true } | { ok: false; error: string };

export function validateMediaFile(file: File): MediaValidation {
  if (!ALLOWED_MEDIA_TYPES.has(file.type)) return { ok: false, error: 'Only JPEG, PNG and WebP images are allowed.' };
  if (file.size > MAX_MEDIA_SIZE) return { ok: false, error: 'Image must be 5 MB or smaller.' };
  if (file.size < 1) return { ok: false, error: 'Image file is empty.' };
  return { ok: true };
}

function hiddenNotFound() {
  return new Response('', { status: 404 });
}

function storageUnavailable() {
  return NextResponse.json(
    { error: 'Blob storage is not connected to this Vercel project. Connect a Vercel Blob store and redeploy.' },
    { status: 503 }
  );
}

function storageFailure() {
  return NextResponse.json(
    { error: 'Media storage is temporarily unavailable. Please try again.' },
    { status: 503 }
  );
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== 'string' && typeof value.name === 'string' && typeof value.type === 'string' && typeof value.size === 'number';
}

export async function POST(request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();
  if (!hasBlobStorageConfig()) return storageUnavailable();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload payload.' }, { status: 400 });
  }

  const scope = form.get('scope');
  const profileId = form.get('profileId');
  const file = form.get('file');
  if ((scope !== 'profile' && scope !== 'site') || !isUploadedFile(file)) {
    return NextResponse.json({ error: 'Invalid upload payload.' }, { status: 400 });
  }
  if (scope === 'profile' && (typeof profileId !== 'string' || !profileId.trim())) {
    return NextResponse.json({ error: 'Profile is required.' }, { status: 400 });
  }

  const validation = validateMediaFile(file);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const originalBase = safeFileName(file.name.replace(/\.[^.]+$/, '') || 'image');
  const filename = `${crypto.randomUUID()}-${originalBase}.${EXTENSIONS[file.type]}`;

  try {
    const media = await saveMedia(scope, filename, file, file.type, scope === 'profile' ? String(profileId) : undefined);
    return NextResponse.json({ url: media.url, pathname: media.pathname, contentType: file.type, size: file.size }, { status: 201 });
  } catch {
    return storageFailure();
  }
}

function mediaPathFromUrl(url: string): string | null {
  if (url.startsWith('/media/')) {
    const relative = url.slice('/media/'.length);
    if (!relative) return null;
    return `rafay/media/${relative}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.blob.vercel-storage.com')) return null;
  const pathname = parsed.pathname.replace(/^\/+/, '');
  return pathname.startsWith('rafay/media/') ? pathname : null;
}

export async function DELETE(request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();
  if (!hasBlobStorageConfig()) return storageUnavailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || !('url' in body) || typeof (body as { url?: unknown }).url !== 'string') {
    return NextResponse.json({ error: 'Invalid media reference.' }, { status: 400 });
  }

  const pathname = mediaPathFromUrl((body as { url: string }).url);
  if (!pathname) return NextResponse.json({ error: 'Invalid media reference.' }, { status: 400 });

  try {
    await deleteMedia(pathname);
    return new Response(null, { status: 204 });
  } catch {
    return storageFailure();
  }
}
