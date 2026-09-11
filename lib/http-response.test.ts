import { describe, expect, it } from 'vitest';
import { readJsonResponse } from './http-response';

describe('readJsonResponse', () => {
  it('turns an empty failed response into a status-aware error', async () => {
    const result = await readJsonResponse<{ error?: string }>(new Response('', { status: 500 }), 'Request');
    expect(result).toEqual({ error: 'Request failed (500).' });
  });

  it('turns malformed JSON into a status-aware error', async () => {
    const result = await readJsonResponse<{ error?: string }>(new Response('<html>bad gateway</html>', { status: 502 }), 'Request');
    expect(result).toEqual({ error: 'Request failed (502).' });
  });

  it('preserves a structured JSON error', async () => {
    const result = await readJsonResponse<{ error?: string }>(
      new Response(JSON.stringify({ error: 'Storage unavailable.' }), { status: 503, headers: { 'content-type': 'application/json' } }),
      'Request'
    );
    expect(result).toEqual({ error: 'Storage unavailable.' });
  });

  it('preserves a valid JSON success body', async () => {
    const result = await readJsonResponse<{ ok: boolean }>(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
      'Request'
    );
    expect(result).toEqual({ ok: true });
  });
});
