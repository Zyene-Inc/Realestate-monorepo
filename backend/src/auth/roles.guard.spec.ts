import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function contextFor(user?: { role: Role }) {
    return {
      getHandler: () => 'handler',
      getClass: () => 'controller',
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('allows routes without role metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    expect(new RolesGuard(reflector as never).canActivate(contextFor())).toBe(
      true,
    );
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
      'handler',
      'controller',
    ]);
  });

  it.each([
    [undefined, false],
    [{ role: Role.TENANT }, false],
    [{ role: Role.SALES_ADMIN }, true],
  ] as const)(
    'evaluates the authoritative request role: %s',
    (user, allowed) => {
      const reflector: Pick<Reflector, 'getAllAndOverride'> = {
        getAllAndOverride: jest
          .fn()
          .mockReturnValue([Role.SUPER_ADMIN, Role.SALES_ADMIN]),
      };
      expect(
        new RolesGuard(reflector as Reflector).canActivate(contextFor(user)),
      ).toBe(allowed);
    },
  );
});
