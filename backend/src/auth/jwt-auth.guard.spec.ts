import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { JwtAuthGuard } from './jwt-auth.guard';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('JwtAuthGuard', () => {
  const mockedCreateClient = jest.mocked(createClient);

  function contextFor(request: object) {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  }

  function guardWith(
    config: Record<string, string | undefined>,
    user: unknown,
  ) {
    return new JwtAuthGuard(
      { get: jest.fn((key: string) => config[key]) } as never,
      { user: { findUnique: jest.fn().mockResolvedValue(user) } } as never,
    );
  }

  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  it('rejects requests without a bearer token before contacting Supabase', async () => {
    const guard = guardWith({}, null);
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toThrow('Missing access token');
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it('fails closed when Supabase Auth configuration is incomplete', async () => {
    const guard = guardWith(
      { SUPABASE_URL: 'https://project.supabase.co' },
      null,
    );
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer token' } }),
      ),
    ).rejects.toThrow('Supabase Auth is not configured');
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired Supabase sessions', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('expired'),
        }),
      },
    } as never);
    const guard = guardWith(
      {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      },
      null,
    );
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'bearer expired-token' } }),
      ),
    ).rejects.toThrow('Invalid or expired access token');
  });

  it.each([null, { id: 'user-1', status: 'DISABLED' }])(
    'rejects missing or unavailable application accounts: %s',
    async (user) => {
      mockedCreateClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'auth-user-1' } },
            error: null,
          }),
        },
      } as never);
      const guard = guardWith(
        {
          SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
        },
        user,
      );
      await expect(
        guard.canActivate(
          contextFor({ headers: { authorization: 'Bearer valid-token' } }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('attaches only the authoritative database identity to a valid request', async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1', email: 'untrusted@example.com' },
          },
          error: null,
        }),
      },
    } as never);
    const appUser = {
      id: 'user-1',
      email: 'trusted@example.com',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    };
    const request: {
      headers: { authorization: string };
      user?: Record<string, string>;
    } = { headers: { authorization: 'Bearer valid-token' } };
    const guard = guardWith(
      {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      },
      appUser,
    );

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      sub: appUser.id,
      authUserId: 'auth-user-1',
      email: appUser.email,
      role: appUser.role,
      status: appUser.status,
    });
    expect(mockedCreateClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'publishable-key',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });
});
