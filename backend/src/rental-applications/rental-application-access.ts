import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const RENTAL_APPLICATION_COOKIE = 'jr_rental_application_access';
export const RENTAL_APPLICATION_ACCESS_DAYS = 30;

export function issueRentalApplicationToken() {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    hash: hashRentalApplicationToken(token),
    expiresAt: new Date(
      Date.now() + RENTAL_APPLICATION_ACCESS_DAYS * 24 * 60 * 60 * 1000,
    ),
  };
}

export function hashRentalApplicationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function rentalApplicationTokenMatches(token: string, hash: string) {
  const actual = Buffer.from(hashRentalApplicationToken(token), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function encodeRentalApplicationCookie(id: string, token: string) {
  return `${id}.${token}`;
}

export function decodeRentalApplicationCookie(value?: string) {
  if (!value) return null;
  const separator = value.indexOf('.');
  if (separator < 1) return null;
  const id = value.slice(0, separator);
  const token = value.slice(separator + 1);
  if (!id || token.length < 32) return null;
  return { id, token };
}
