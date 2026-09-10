import { expect, it } from 'vitest';
import { buildWhatsAppUrl } from './whatsapp';
import type { BookingRequest } from './domain';

it('builds a RAFAY WhatsApp message with booking details', () => {
  const booking: BookingRequest = {
    id: 'b1', reference: 'RFY-ABC123', profileId: 'rafay', profileNameSnapshot: 'Rafay', packageId: 'social', packageNameSnapshot: 'Social Appearance',
    date: '2026-10-02', time: '20:00', city: 'Lahore', venueType: 'Restaurant / dinner', occasion: 'Dinner / social', duration: '2 hours', addOn: 'Style coordination', paymentPreference: 'Bank transfer', customerName: 'Test Customer', customerPhone: '+923001234567', notes: 'Window table', lawfulUseConfirmed: true,
    status: 'Pending', createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z'
  };
  const url = buildWhatsAppUrl('+92 300 999 9999', booking, 'Deposit after confirmation.');
  expect(url).toMatch(/^https:\/\/wa\.me\/923009999999\?/);
  const message = decodeURIComponent(url.split('text=')[1]);
  expect(message).toContain('RAFAY BOOKING REQUEST');
  expect(message).toContain('RFY-ABC123');
  expect(message).toContain('Rafay');
  expect(message).toContain('No sexual services');
});
