import { expect, it } from 'vitest';
import { BOOKING_STEP_TITLES, initialBookingDraft, validateBookingStep } from './booking-wizard';
import { DEFAULT_SITE_DATA } from '@/lib/defaults';

it('defines exactly ten booking steps in the approved order', () => {
  expect(BOOKING_STEP_TITLES).toEqual(['Profile','Package','Date & time','City & venue','Occasion','Duration','Add-ons','Payment','Contact','Review']);
});

it('does not allow a customer to advance past an incomplete first step', () => {
  expect(validateBookingStep(1, initialBookingDraft(DEFAULT_SITE_DATA), DEFAULT_SITE_DATA)).toBe(false);
});
