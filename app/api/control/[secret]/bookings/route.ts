import { NextResponse } from 'next/server';
import { isValidAdminSecret } from '@/lib/admin-auth';
import { deleteBooking, listBookings, updateBooking } from '@/lib/blob-store';
import { BookingStatusSchema } from '@/lib/domain';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ secret: string }> };

function hiddenNotFound() { return new Response('', { status: 404 }); }

export async function GET(_request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();
  const bookings = await listBookings();
  return NextResponse.json({ bookings }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  const input = body as { id?: unknown; status?: unknown };
  const status = BookingStatusSchema.safeParse(input.status);
  if (typeof input.id !== 'string' || !input.id.trim() || !status.success) return NextResponse.json({ error: 'Invalid booking update.' }, { status: 400 });
  const booking = await updateBooking(input.id, { status: status.data });
  return NextResponse.json({ booking }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const id = body && typeof body === 'object' && 'id' in body ? (body as { id?: unknown }).id : undefined;
  if (typeof id !== 'string' || !id.trim()) return NextResponse.json({ error: 'Invalid booking id.' }, { status: 400 });
  await deleteBooking(id);
  return new Response(null, { status: 204 });
}
