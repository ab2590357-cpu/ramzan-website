import { describe, expect, it } from 'vitest';
import { buildPublicWhatsAppUrl } from './public-whatsapp';

describe('buildPublicWhatsAppUrl', () => {
  it('returns null when no usable number exists', () => {
    expect(buildPublicWhatsAppUrl('')).toBeNull();
    expect(buildPublicWhatsAppUrl(' + () - ')).toBeNull();
  });

  it('normalizes the number and encodes the RAFAY inquiry', () => {
    const url = buildPublicWhatsAppUrl('+92 300-1234567');
    expect(url).toContain('https://wa.me/923001234567?text=');
    expect(decodeURIComponent(url!.split('text=')[1])).toContain('Hi RAFAY');
  });
});
