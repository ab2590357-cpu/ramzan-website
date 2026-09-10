import { describe, expect, it } from 'vitest';
import { bookingPath, configPath, mediaPath } from './blob-store';

describe('RAFAY Blob paths', () => {
  it('uses the private booking namespace', () => {
    expect(bookingPath('abc')).toBe('rafay/bookings/abc.json');
  });

  it('uses one canonical shared site-data path', () => {
    expect(configPath()).toBe('rafay/config/site-data.json');
  });

  it('builds profile and site media paths inside RAFAY media namespace', () => {
    expect(mediaPath('profile', 'hero.webp', 'profile-1')).toBe('rafay/media/profiles/profile-1/hero.webp');
    expect(mediaPath('site', 'hero.webp')).toBe('rafay/media/site/hero.webp');
  });
});
