import { describe, expect, it } from 'vitest';
import { readJsonResponse } from '@/lib/http-response';

describe('RAFAY admin save response parsing', () => {
  it('returns a status-based error for an empty failed response instead of throwing JSON parse errors', async () => {
    const response = new Response('', { status: 500 });

    const result = await readJsonResponse<{ error?: string }>(response, 'Save');

    expect(result).toEqual({ error: 'Save failed (500).' });
  });

  it('keeps a JSON error returned by the server', async () => {
    const response = new Response(JSON.stringify({ error: 'Storage unavailable.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' }
    });

    const result = await readJsonResponse<{ error?: string }>(response, 'Save');

    expect(result).toEqual({ error: 'Storage unavailable.' });
  });
});
