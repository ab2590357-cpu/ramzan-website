import { afterEach, expect, it, vi } from 'vitest';
import { deleteBooking, hasPrivateBookingStorageConfig, listBookings, updateBooking } from '@/lib/blob-store';
import { DELETE, GET, PATCH } from './[secret]/bookings/route';

vi.mock('@/lib/blob-store', () => ({
  hasPrivateBookingStorageConfig: vi.fn(() => true),
  listBookings: vi.fn(async () => []),
  updateBooking: vi.fn(),
  deleteBooking: vi.fn()
}));

const originalAdminKey = process.env.RAFAY_ADMIN_KEY;
afterEach(() => {
  if (originalAdminKey === undefined) delete process.env.RAFAY_ADMIN_KEY;
  else process.env.RAFAY_ADMIN_KEY = originalAdminKey;
  vi.clearAllMocks();
  vi.mocked(hasPrivateBookingStorageConfig).mockReturnValue(true);
  vi.mocked(listBookings).mockResolvedValue([]);
});

it('hides booking data when the admin secret is invalid', async () => {
  process.env.RAFAY_ADMIN_KEY = 'ci-test-admin-key-at-least-32-characters';
  const response = await GET(new Request('https://example.test/api/control/wrong/bookings'), { params: Promise.resolve({ secret: 'wrong' }) });
  expect(response.status).toBe(404);
  expect(vi.mocked(listBookings)).not.toHaveBeenCalled();
});

it('returns a JSON service error when private booking storage is not configured', async () => {
  const secret = 'ci-test-admin-key-at-least-32-characters';
  process.env.RAFAY_ADMIN_KEY = secret;
  vi.mocked(hasPrivateBookingStorageConfig).mockReturnValue(false);

  const response = await GET(new Request('https://example.test/api/control/key/bookings'), { params: Promise.resolve({ secret }) });
  const payload = await response.json();

  expect(response.status).toBe(503);
  expect(payload.error).toContain('Private booking storage');
  expect(vi.mocked(listBookings)).not.toHaveBeenCalled();
});

it('rejects an unsupported booking status before storage is touched', async () => {
  const secret = 'ci-test-admin-key-at-least-32-characters';
  process.env.RAFAY_ADMIN_KEY = secret;
  const request = new Request('https://example.test/api/control/key/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'booking-1', status: 'Paid' }) });
  const response = await PATCH(request, { params: Promise.resolve({ secret }) });
  expect(response.status).toBe(400);
  expect(vi.mocked(updateBooking)).not.toHaveBeenCalled();
});

it('returns JSON 503 when listing bookings throws', async () => {
  const secret = 'ci-test-admin-key-at-least-32-characters';
  process.env.RAFAY_ADMIN_KEY = secret;
  vi.mocked(listBookings).mockRejectedValueOnce(new Error('storage offline'));

  const response = await GET(new Request('https://example.test/api/control/key/bookings'), { params: Promise.resolve({ secret }) });

  expect(response.status).toBe(503);
  expect(response.headers.get('content-type')).toMatch(/application\/json/i);
  expect(await response.json()).toEqual({ error: 'Booking storage is temporarily unavailable. Please try again.' });
});

it('returns JSON 503 when updating a booking throws', async () => {
  const secret = 'ci-test-admin-key-at-least-32-characters';
  process.env.RAFAY_ADMIN_KEY = secret;
  vi.mocked(updateBooking).mockRejectedValueOnce(new Error('storage offline'));
  const request = new Request('https://example.test/api/control/key/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'booking-1', status: 'Confirmed' }) });

  const response = await PATCH(request, { params: Promise.resolve({ secret }) });

  expect(response.status).toBe(503);
  expect(response.headers.get('content-type')).toMatch(/application\/json/i);
  expect(await response.json()).toEqual({ error: 'Booking storage is temporarily unavailable. Please try again.' });
});

it('returns JSON 503 when deleting a booking throws', async () => {
  const secret = 'ci-test-admin-key-at-least-32-characters';
  process.env.RAFAY_ADMIN_KEY = secret;
  vi.mocked(deleteBooking).mockRejectedValueOnce(new Error('storage offline'));
  const request = new Request('https://example.test/api/control/key/bookings', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'booking-1' }) });

  const response = await DELETE(request, { params: Promise.resolve({ secret }) });

  expect(response.status).toBe(503);
  expect(response.headers.get('content-type')).toMatch(/application\/json/i);
  expect(await response.json()).toEqual({ error: 'Booking storage is temporarily unavailable. Please try again.' });
});
