import { describe, expect, it } from 'vitest';
import { readAdminJsonResponse } from './admin-client';

describe('RAFAY admin save response parsing', () => {
  it('returns a status-based error for an empty failed response instead of throwing JSON parse errors', async () => {
    const response = new Response('', { status: 500 });

    const result = await readAdminJsonResponse(response);

    expect(result).toEqual({ error: 'Save failed (500).' });
  });

  it('keeps a JSON error returned by the server', async () => {
    const response = new Response(JSON.stringify({ error: 'Storage unavailable.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' }
    });

    const result = await readAdminJsonResponse(response);

    expect(result).toEqual({ error: 'Storage unavailable.' });
  });
});
