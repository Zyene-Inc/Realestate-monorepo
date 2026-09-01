import {
  decodeRentalApplicationCookie,
  encodeRentalApplicationCookie,
  hashRentalApplicationToken,
  issueRentalApplicationToken,
  rentalApplicationTokenMatches,
} from './rental-application-access';

describe('rental application access', () => {
  it('issues an opaque token and stores only its hash', () => {
    const access = issueRentalApplicationToken();

    expect(access.token).toHaveLength(43);
    expect(access.hash).toHaveLength(64);
    expect(access.hash).not.toContain(access.token);
    expect(rentalApplicationTokenMatches(access.token, access.hash)).toBe(true);
    expect(rentalApplicationTokenMatches(`${access.token}x`, access.hash)).toBe(
      false,
    );
  });

  it('round-trips the application-scoped cookie without exposing the hash', () => {
    const access = issueRentalApplicationToken();
    const encoded = encodeRentalApplicationCookie(
      'application-1',
      access.token,
    );

    expect(decodeRentalApplicationCookie(encoded)).toEqual({
      id: 'application-1',
      token: access.token,
    });
    expect(encoded).not.toContain(hashRentalApplicationToken(access.token));
    expect(decodeRentalApplicationCookie('invalid')).toBeNull();
  });
});
