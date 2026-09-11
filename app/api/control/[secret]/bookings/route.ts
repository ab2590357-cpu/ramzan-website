import { NextResponse } from 'next/server';
import { isValidAdminSecret } from '@/lib/admin-auth';
import { deleteBooking, hasPrivateBookingStorageConfig, listBookings, updateBooking } from '@/lib/blob-store';
import { BookingStatusSchema } from '@/lib/domain';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ secret: string }> };

function hiddenNotFound() { return new Response('', { status: 404 }); }
function privateStorageUnavailable() {
  return NextResponse.json(
    { error: 'Private booking storage is not configured.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
function bookingStorageFailure(operation: string, error: unknown) {
  console.error(`[RAFAY] Booking storage ${operation} failed`, { name: error instanceof Error ? error.name : 'UnknownError' });
  return NextResponse.json(
    { error: 'Booking storage is temporarily unavailable. Please try again.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET(_request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();
  if (!hasPrivateBookingStorageConfig()) return privateStorageUnavailable();
  try {
    const bookings = await listBookings();
    return NextResponse.json({ bookings }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return bookingStorageFailure('list', error);
  }
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
  if (!hasPrivateBookingStorageConfig()) return privateStorageUnavailable();
  try {
    const booking = await updateBooking(input.id, { status: status.data });
    return NextResponse.json({ booking }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Booking not found') {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    return bookingStorageFailure('update', error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const { secret } = await context.params;
  if (!isValidAdminSecret(secret)) return hiddenNotFound();
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const id = body && typeof body === 'object' && 'id' in body ? (body as { id?: unknown }).id : undefined;
  if (typeof id !== 'string' || !id.trim()) return NextResponse.json({ error: 'Invalid booking id.' }, { status: 400 });
  if (!hasPrivateBookingStorageConfig()) return privateStorageUnavailable();
  try {
    await deleteBooking(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return bookingStorageFailure('delete', error);
  }
}
