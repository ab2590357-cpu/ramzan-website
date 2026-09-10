import { describe, expect, it } from 'vitest';
import { BookingInputSchema, BookingStatusSchema, ProfileSchema, SiteDataSchema } from './domain';
import { DEFAULT_SITE_DATA } from './defaults';

describe('RAFAY domain schemas', () => {
  it('allows an adult confirmation flag to exist but keeps it explicit', () => {
    const now = new Date().toISOString();
    const result = ProfileSchema.safeParse({
      id: 'profile-1',
      name: 'Alex',
      label: 'Event host',
      bio: 'Premium event presence.',
      tags: ['social'],
      images: [],
      coverImageUrl: '',
      active: true,
      adultConfirmed: false,
      displayOrder: 0,
      availabilityNote: '',
      createdAt: now,
      updatedAt: now
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.adultConfirmed).toBe(false);
  });

  it('rejects an incomplete booking payload', () => {
    expect(BookingInputSchema.safeParse({ customerName: '', customerPhone: '1' }).success).toBe(false);
  });

  it('accepts only the five supported booking statuses', () => {
    for (const status of ['Pending','Contacted','Confirmed','Completed','Cancelled']) {
      expect(BookingStatusSchema.safeParse(status).success).toBe(true);
    }
    expect(BookingStatusSchema.safeParse('Refunded').success).toBe(false);
  });

  it('ships a valid default site configuration branded RAFAY', () => {
    const parsed = SiteDataSchema.parse(DEFAULT_SITE_DATA);
    expect(parsed.brandName).toBe('RAFAY');
    expect(parsed.profiles.length).toBe(6);
    expect(parsed.packages.length).toBe(3);
    expect(parsed.profiles.every((profile) => profile.adultConfirmed)).toBe(true);
  });
});
