import { expect, it } from 'vitest';
import { POST } from './bookings/route';

it('rejects an incomplete public booking before storage is touched', async () => {
  const request = new Request('https://example.test/api/bookings', { method: 'POST', body: JSON.stringify({ customerName: '' }), headers: { 'content-type': 'application/json' } });
  const response = await POST(request);
  expect(response.status).toBe(400);
});
