import { NextResponse } from 'next/server';
import { createBooking, hasPrivateBookingStorageConfig, loadSiteData } from '@/lib/blob-store';
import { BookingInputSchema, BookingRequestSchema } from '@/lib/domain';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

function privateStorageUnavailable() {
  return NextResponse.json(
    { error: 'Private booking storage is not configured. Please contact RAFAY before submitting this request.' },
    { status: 503 }
  );
}

export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const parsed = BookingInputSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Please complete all required booking details.', issues: parsed.error.flatten() }, { status: 400 });
  if (!hasPrivateBookingStorageConfig()) return privateStorageUnavailable();

  const { data } = await loadSiteData();
  const profile = data.profiles.find((item) => item.id === parsed.data.profileId && item.active && item.adultConfirmed);
  const packageItem = data.packages.find((item) => item.id === parsed.data.packageId && item.active);
  const payment = data.paymentMethods.find((item) => item.name === parsed.data.paymentPreference && item.active);
  if (!profile || !packageItem || !payment) return NextResponse.json({ error: 'One of the selected booking options is no longer available.' }, { status: 409 });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const booking = BookingRequestSchema.parse({
    ...parsed.data,
    id,
    reference: `RFY-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    profileNameSnapshot: profile.name,
    packageNameSnapshot: packageItem.name,
    status: 'Pending',
    createdAt: now,
    updatedAt: now
  });
  await createBooking(booking);
  const whatsappUrl = data.whatsappNumber ? buildWhatsAppUrl(data.whatsappNumber, booking, data.defaultPaymentNote) : '';
  return NextResponse.json({ booking, whatsappUrl }, { status: 201 });
}
