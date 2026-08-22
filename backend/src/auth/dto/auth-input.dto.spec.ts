import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AgentSignupDto } from './agent-signup.dto';
import { LoginDto } from './login.dto';
import { TenantInviteDto } from './tenant-invite.dto';

describe('auth input DTOs', () => {
  it('normalizes email without changing the password', async () => {
    const dto = plainToInstance(LoginDto, {
      email: '  USER@Example.COM ',
      password: ' password with spaces ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
    expect(dto.password).toBe(' password with spaces ');
  });

  it('does not coerce objects into valid display text', async () => {
    const dto = plainToInstance(TenantInviteDto, {
      email: 'tenant@example.com',
      firstName: { value: 'Taylor' },
      lastName: 'Tenant',
      unitId: 'clx1234567890unit',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'firstName')).toBe(true);
  });

  it('rejects markup in stored agent display fields', async () => {
    const dto = plainToInstance(AgentSignupDto, {
      email: 'agent@example.com',
      password: 'long-enough-password',
      companyName: '<script>alert(1)</script>',
      contactName: 'Taylor Agent',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'companyName')).toBe(true);
  });
});
