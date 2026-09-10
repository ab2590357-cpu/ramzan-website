import { expect, it } from 'vitest';
import { validateMediaFile } from './[secret]/media/route';

it('accepts JPEG PNG and WebP up to 5 MB', () => {
  for (const type of ['image/jpeg','image/png','image/webp']) {
    const file = new File([new Uint8Array(1024)], 'photo.bin', { type });
    expect(validateMediaFile(file)).toEqual({ ok: true });
  }
});

it('rejects unsupported media types and files above 5 MB', () => {
  const pdf = new File(['x'], 'file.pdf', { type: 'application/pdf' });
  expect(validateMediaFile(pdf).ok).toBe(false);
  const large = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'photo.webp', { type: 'image/webp' });
  expect(validateMediaFile(large).ok).toBe(false);
});
