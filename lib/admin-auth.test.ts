import { afterEach, describe, expect, it } from 'vitest';
import { isValidAdminSecret } from './admin-auth';

describe('RAFAY hidden admin secret', () => {
  const original = process.env.RAFAY_ADMIN_KEY;

  afterEach(() => {
    if (original === undefined) delete process.env.RAFAY_ADMIN_KEY;
    else process.env.RAFAY_ADMIN_KEY = original;
  });

  it('accepts only the configured long admin key', () => {
    process.env.RAFAY_ADMIN_KEY = 'rafay-ci-secret-key-that-is-long-enough';
    expect(isValidAdminSecret('rafay-ci-secret-key-that-is-long-enough')).toBe(true);
    expect(isValidAdminSecret('wrong-secret')).toBe(false);
  });

  it('fails closed when the environment key is missing', () => {
    delete process.env.RAFAY_ADMIN_KEY;
    expect(isValidAdminSecret('anything')).toBe(false);
  });
});
