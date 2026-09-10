import { expect, it } from 'vitest';
import { attachProfileImage, removeProfileImage, setProfileCover } from './media-manager';
import { DEFAULT_SITE_DATA } from '@/lib/defaults';

it('attaches a profile image without mutating the profile', () => {
  const profile = DEFAULT_SITE_DATA.profiles[0];
  const next = attachProfileImage(profile, 'https://example.com/one.webp');
  expect(next.images).toEqual(['https://example.com/one.webp']);
  expect(next.coverImageUrl).toBe('https://example.com/one.webp');
  expect(profile.images).toEqual([]);
});

it('updates cover and falls back when the cover image is removed', () => {
  const profile = { ...DEFAULT_SITE_DATA.profiles[0], images: ['https://example.com/one.webp','https://example.com/two.webp'], coverImageUrl: 'https://example.com/one.webp' };
  expect(setProfileCover(profile, 'https://example.com/two.webp').coverImageUrl).toBe('https://example.com/two.webp');
  const next = removeProfileImage(profile, 'https://example.com/one.webp');
  expect(next.images).toEqual(['https://example.com/two.webp']);
  expect(next.coverImageUrl).toBe('https://example.com/two.webp');
});
