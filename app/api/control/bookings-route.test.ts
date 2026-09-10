import { afterEach, expect, it, vi } from 'vitest';
import { listBookings, updateBooking } from '@/lib/blob-store';
import { GET, PATCH } from './[secret]/bookings/route';

vi.mock('@/lib/blob-store', () => ({
  listBookings: vi.fn(async () => []),
  updateBooking: vi.fn(),
  deleteBooking: vi.fn()
}));

const originalAdminKey = process.env.RAFAY_ADMIN_KEY;
afterEach(() => {
  if (originalAdminKey === undefined) delete process.env.RAFAY_ADMIN_KEY;
  else process.env.RAFAY_ADMIN_KEY = originalAdminKey;
  vi.clearAllMocks();
});

it('hides booking data when the admin secret is invalid', async () => {
  process.env.RAFAY_ADMIN_KEY = 'ci-test-admin-key-at-least-32-characters';
  const response = await GET(new Request('https://example.test/api/control/wrong/bookings'), { params: Promise.resolve({ secret: 'wrong' }) });
  expect(response.status).toBe(404);
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
