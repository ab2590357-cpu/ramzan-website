import { expect, it } from 'vitest';
import { canPublishProfile, createBlankProfile, normalizeOrders } from './admin-client';
import { DEFAULT_SITE_DATA } from '@/lib/defaults';

it('creates a new unpublished adult-confirmed profile shell', () => {
  const profile = createBlankProfile(7, '2026-09-10T00:00:00.000Z', 'new-profile-id');
  expect(profile.id).toBe('new-profile-id');
  expect(profile.active).toBe(false);
  expect(profile.adultConfirmed).toBe(true);
  expect(profile.displayOrder).toBe(7);
});

it('blocks profile publishing until required public fields are present', () => {
  const blank = createBlankProfile(0, '2026-09-10T00:00:00.000Z', 'p1');
  expect(canPublishProfile(blank)).toBe(false);
  expect(canPublishProfile({ ...blank, name: 'Alex', label: 'Event host', bio: 'Adult event appearance.' })).toBe(true);
  expect(canPublishProfile({ ...blank, name: 'Alex', label: 'Event host', bio: 'Adult event appearance.', adultConfirmed: false })).toBe(false);
});

it('normalizes display order without mutating the original objects', () => {
  const input = DEFAULT_SITE_DATA.packages.map((item) => ({ ...item })).reverse();
  const output = normalizeOrders(input);
  expect(output.map((item) => item.displayOrder)).toEqual([0,1,2]);
  expect(input[0].displayOrder).not.toBe(output[0].displayOrder);
});
