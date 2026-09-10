import { expect, it } from 'vitest';
import type { BookingRequest } from '@/lib/domain';
import { BOOKING_STATUS_OPTIONS, filterBookings } from './bookings-manager';

const base: BookingRequest = {
  id: 'booking-1', reference: 'RFY-AAAA1111', profileId: 'rafay', packageId: 'social', date: '2026-10-10', time: '20:00', city: 'Lahore', venueType: 'Hotel', occasion: 'Dinner', duration: '2 hours', addOn: '', paymentPreference: 'Bank transfer', customerName: 'Ali Khan', customerPhone: '+923001234567', notes: 'Window table', lawfulUseConfirmed: true, profileNameSnapshot: 'Rafay', packageNameSnapshot: 'Social Appearance', status: 'Pending', createdAt: '2026-09-10T20:00:00.000Z', updatedAt: '2026-09-10T20:00:00.000Z'
};

it('filters bookings by status and customer/reference/profile search', () => {
  const confirmed: BookingRequest = { ...base, id: 'booking-2', reference: 'RFY-BBBB2222', customerName: 'Sara', profileNameSnapshot: 'Amir', status: 'Confirmed' };
  const items = [base, confirmed];
  expect(filterBookings(items, 'pending', '')).toEqual([base]);
  expect(filterBookings(items, 'all', 'BBBB')).toEqual([confirmed]);
  expect(filterBookings(items, 'all', 'amir')).toEqual([confirmed]);
  expect(filterBookings(items, 'all', 'ali khan')).toEqual([base]);
});

it('exposes every supported booking status in admin order', () => {
  expect(BOOKING_STATUS_OPTIONS).toEqual(['Pending','Contacted','Confirmed','Completed','Cancelled']);
});
