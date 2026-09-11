export type JsonErrorPayload = { error?: string };

export async function readJsonResponse<T extends object>(
  response: Response,
  fallbackPrefix = 'Request'
): Promise<T & JsonErrorPayload> {
  const raw = await response.text();
  if (!raw.trim()) {
    return { error: `${fallbackPrefix} failed (${response.status}).` } as T & JsonErrorPayload;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: `${fallbackPrefix} failed (${response.status}).` } as T & JsonErrorPayload;
    }
    return parsed as T & JsonErrorPayload;
  } catch {
    return { error: `${fallbackPrefix} failed (${response.status}).` } as T & JsonErrorPayload;
  }
}
