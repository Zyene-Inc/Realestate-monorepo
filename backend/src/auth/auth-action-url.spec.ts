import { createAuthActionUrl } from './auth-action-url';

describe('createAuthActionUrl', () => {
  it('creates a portal callback that carries the one-time token hash', () => {
    expect(
      createAuthActionUrl('https://portal.example.com/auth/reset-password', {
        hashed_token: 'one-time-token',
        verification_type: 'recovery',
      }),
    ).toBe(
      'https://portal.example.com/auth/reset-password?token_hash=one-time-token&type=recovery',
    );
  });

  it('does not create a callback without the secure token details', () => {
    expect(
      createAuthActionUrl('https://portal.example.com/auth/reset-password', {
        hashed_token: '',
        verification_type: 'invite',
      }),
    ).toBeNull();
  });
});
