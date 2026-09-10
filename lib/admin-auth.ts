import { timingSafeEqual } from 'node:crypto';

export class InvalidAdminSecretError extends Error {
  constructor() {
    super('Not found');
    this.name = 'InvalidAdminSecretError';
  }
}

export function isValidAdminSecret(secret: string): boolean {
  const configured = process.env.RAFAY_ADMIN_KEY;
  if (!configured || configured.length < 24 || !secret) return false;
  const actual = Buffer.from(secret);
  const expected = Buffer.from(configured);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function requireAdminSecret(secret: string): void {
  if (!isValidAdminSecret(secret)) throw new InvalidAdminSecretError();
}
