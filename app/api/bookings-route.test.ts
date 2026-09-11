import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_DATA } from '@/lib/defaults';

const { createBookingMock, hasPrivateBookingStorageConfigMock, loadSiteDataMock } = vi.hoisted(() => ({
  createBookingMock: vi.fn(),
  hasPrivateBookingStorageConfigMock: vi.fn(() => true),
  loadSiteDataMock: vi.fn()
}));

vi.mock('@/lib/blob-store', () => ({
  createBooking: createBookingMock,
  hasPrivateBookingStorageConfig: hasPrivateBookingStorageConfigMock,
  loadSiteData: loadSiteDataMock
}));

import { POST } from './bookings/route';

const originalPrivateBookingToken = process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN;

function validBookingBody() {
  return {
    profileId: 'ariana',
    packageId: 'social',
    date: '2026-12-01',
    time: '20:00',
    city: 'Lahore',
    venueType: 'Restaurant / dinner',
    occasion: 'Dinner / social',
    duration: '1 hour',
    addOn: 'No add-on',
    paymentPreference: 'Bank transfer',
    customerName: 'Test User',
    customerPhone: '+923001234567',
    notes: '',
    lawfulUseConfirmed: true
  };
}

afterEach(() => {
  createBookingMock.mockReset();
  hasPrivateBookingStorageConfigMock.mockReset();
  hasPrivateBookingStorageConfigMock.mockReturnValue(true);
  loadSiteDataMock.mockReset();
  if (originalPrivateBookingToken === undefined) delete process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN;
  else process.env.RAFAY_PRIVATE_BLOB_READ_WRITE_TOKEN = originalPrivateBookingToken;
});

it('rejects an incomplete public booking before storage is touched', async () => {
  const request = new Request('https://example.test/api/bookings', { method: 'POST', body: JSON.stringify({ customerName: '' }), headers: { 'content-type': 'application/json' } });
  const response = await POST(request);
  expect(response.status).toBe(400);
  expect(hasPrivateBookingStorageConfigMock).not.toHaveBeenCalled();
});

it('returns a JSON service error when private booking storage is not configured', async () => {
  hasPrivateBookingStorageConfigMock.mockReturnValue(false);
  const request = new Request('https://example.test/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validBookingBody())
  });

  const response = await POST(request);
  const payload = await response.json();

  expect(response.status).toBe(503);
  expect(payload.error).toContain('Private booking storage');
  expect(loadSiteDataMock).not.toHaveBeenCalled();
  expect(createBookingMock).not.toHaveBeenCalled();
});

it('returns a JSON service error when the configured booking backend cannot write', async () => {
  loadSiteDataMock.mockResolvedValue({ data: DEFAULT_SITE_DATA, etag: 'test-etag' });
  createBookingMock.mockRejectedValue(new Error('disk unavailable'));
  const request = new Request('https://example.test/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validBookingBody())
  });

  const response = await POST(request);
  const payload = await response.json();

  expect(response.status).toBe(503);
  expect(payload.error).toContain('booking storage');
  expect(createBookingMock).toHaveBeenCalledOnce();
});
