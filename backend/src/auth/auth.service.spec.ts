import { AuthService } from './auth.service';

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      admin: {},
    },
  })),
}));

describe('AuthService login protection', () => {
  const activeUser = {
    id: 'user-1',
    authUserId: '11111111-1111-4111-8111-111111111111',
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lastFailedLoginAt: null,
    lockedUntil: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function serviceWith(prisma: object) {
    return new AuthService(
      prisma as never,
      {
        get: jest.fn((key: string) =>
          key === 'SUPABASE_URL'
            ? 'https://project.supabase.co'
            : 'sb_secret_test',
        ),
      } as never,
      {} as never,
      {} as never,
      { assertNotCompromised: jest.fn() },
    );
  }

  it('returns the same generic error for an unknown account', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: 'invalid_credentials' },
    });

    await expect(
      serviceWith(prisma).login({
        email: 'missing@example.com',
        password: 'not-the-password',
      }),
    ).rejects.toThrow('Incorrect email or password');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not ask Supabase to verify a locked account', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...activeUser,
          failedLoginAttempts: 5,
          lockedUntil: new Date(Date.now() + 60_000),
        }),
        update: jest.fn(),
      },
    };

    await expect(
      serviceWith(prisma).login({
        email: 'user@example.com',
        password: 'not-the-password',
      }),
    ).rejects.toThrow('Incorrect email or password');
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('locks an account after the fifth failed attempt', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...activeUser,
          failedLoginAttempts: 4,
          lastFailedLoginAt: new Date(),
        }),
        update: jest
          .fn()
          .mockResolvedValueOnce({ failedLoginAttempts: 5 })
          .mockResolvedValueOnce({}),
      },
    };
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: 'invalid_credentials' },
    });

    await expect(
      serviceWith(prisma).login({
        email: 'user@example.com',
        password: 'not-the-password',
      }),
    ).rejects.toThrow('Incorrect email or password');
    expect(prisma.user.update).toHaveBeenCalledTimes(2);
    const updateCalls = prisma.user.update.mock.calls as unknown as Array<
      [
        {
          where: { id: string };
          data: { lockedUntil: unknown };
        },
      ]
    >;
    const lockUpdate = updateCalls[1][0];
    expect(lockUpdate.where).toEqual({ id: 'user-1' });
    expect(lockUpdate.data.lockedUntil).toBeInstanceOf(Date);
  });

  it('clears failed attempts after a successful Supabase login', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...activeUser,
          failedLoginAttempts: 2,
          lastFailedLoginAt: new Date(),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: activeUser.authUserId },
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_at: 12345,
        },
      },
      error: null,
    });

    await expect(
      serviceWith(prisma).login({
        email: 'user@example.com',
        password: 'correct-password',
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: 12345,
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
      },
    });
  });
});
