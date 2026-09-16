import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGenerateLink = jest.fn();
const mockDeleteUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      admin: {
        deleteUser: mockDeleteUser,
        generateLink: mockGenerateLink,
      },
    },
  })),
}));

describe('AuthService login protection', () => {
  const activeUser = {
    id: 'user-1',
    authUserId: '11111111-1111-4111-8111-111111111111',
    role: Role.SUPER_ADMIN,
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lastFailedLoginAt: null,
    lockedUntil: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function serviceWith(prisma: object, emails: object = {}) {
    return new AuthService(
      prisma as never,
      {
        get: jest.fn((key: string) => {
          if (key === 'SUPABASE_URL') return 'https://project.supabase.co';
          if (key === 'RENTAL_ADMIN_URL') return 'https://rentals.example.com';
          return 'sb_secret_test';
        }),
      } as never,
      {} as never,
      emails as never,
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

  it('rejects an administrator who tries to use the tenant login portal', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(activeUser),
        update: jest.fn(),
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
    mockSignOut.mockResolvedValue({ error: null });

    await expect(
      serviceWith(prisma).login({
        email: 'admin@example.com',
        password: 'correct-password',
        portal: 'tenant',
      }),
    ).rejects.toThrow('Incorrect email or password');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('invites a tenant administrator through the rental administration portal', async () => {
    const tx = {
      user: {
        create: jest.fn().mockResolvedValue({ id: 'rental-admin-1' }),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<{ id: string }>) =>
          callback(tx),
      ),
    };
    const emails = { sendTenantAdminInvite: jest.fn() };
    mockGenerateLink.mockResolvedValue({
      data: {
        user: { id: '11111111-1111-4111-8111-111111111111' },
        properties: { action_link: 'https://supabase.example.com/invite' },
      },
      error: null,
    });

    await expect(
      serviceWith(prisma, emails).inviteTenantAdmin(
        {
          email: 'manager@example.com',
          firstName: 'Taylor',
          lastName: 'Manager',
        },
        'super-admin-1',
      ),
    ).resolves.toMatchObject({
      success: true,
      userId: 'rental-admin-1',
    });

    expect(mockGenerateLink).toHaveBeenCalledWith({
      type: 'invite',
      email: 'manager@example.com',
      options: {
        redirectTo: 'https://rentals.example.com/auth/reset-password',
        data: { firstName: 'Taylor', lastName: 'Manager' },
      },
    });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        authUserId: '11111111-1111-4111-8111-111111111111',
        email: 'manager@example.com',
        role: Role.TENANT_ADMIN,
        status: 'INVITED',
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'super-admin-1',
        action: 'TENANT_ADMIN_INVITED',
        resource: 'user',
        resourceId: 'rental-admin-1',
        newValue: JSON.stringify({
          email: 'manager@example.com',
          role: Role.TENANT_ADMIN,
        }),
      },
    });
    expect(emails.sendTenantAdminInvite).toHaveBeenCalledWith(
      'manager@example.com',
      'https://supabase.example.com/invite',
      'Taylor Manager',
      'rental-admin-1',
    );
  });
});
