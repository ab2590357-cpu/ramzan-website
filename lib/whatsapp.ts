import type { BookingRequest } from './domain';
import { digitsOnlyPhone } from './validators';

export function buildWhatsAppUrl(number: string, booking: BookingRequest, paymentNote: string): string {
  const phone = digitsOnlyPhone(number);
  const lines = [
    'RAFAY BOOKING REQUEST',
    `Reference: ${booking.reference}`,
    `Profile: ${booking.profileNameSnapshot}`,
    `Package: ${booking.packageNameSnapshot}`,
    `Date / time: ${booking.date} · ${booking.time}`,
    `City / venue: ${booking.city} · ${booking.venueType}`,
    `Occasion: ${booking.occasion}`,
    `Duration: ${booking.duration}`,
    `Add-on: ${booking.addOn || 'None'}`,
    `Payment preference: ${booking.paymentPreference}`,
    `Customer: ${booking.customerName}`,
    `Phone: ${booking.customerPhone}`,
    booking.notes ? `Notes: ${booking.notes}` : '',
    paymentNote ? `Payment note: ${paymentNote}` : '',
    '18+ lawful social/event companionship, hosting or creator appearance only. No sexual services are offered or facilitated.'
  ].filter(Boolean);
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
}
