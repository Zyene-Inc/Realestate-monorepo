import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PasswordSecurityService } from './password-security.service';

describe('PasswordSecurityService', () => {
  const originalFetch = global.fetch;
  const password = 'Unique!Password123';
  const digest = createHash('sha1')
    .update(password)
    .digest('hex')
    .toUpperCase();

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects a password found by the padded HIBP range lookup', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(`${digest.slice(5)}:42\nOTHER:0`),
    }) as never;

    await expect(
      new PasswordSecurityService().assertNotCompromised(password),
    ).rejects.toBeInstanceOf(BadRequestException);
    const [url, options] = (global.fetch as jest.MockedFunction<typeof fetch>)
      .mock.calls[0];
    expect(url).toBe(
      `https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`,
    );
    expect(options?.headers).toEqual(
      expect.objectContaining({ 'Add-Padding': 'true' }),
    );
  });

  it('accepts a password absent from the returned hash suffixes', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('UNRELATED:4'),
    }) as never;

    await expect(
      new PasswordSecurityService().assertNotCompromised(password),
    ).resolves.toBeUndefined();
  });

  it('fails safely when the breach service is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as never;

    await expect(
      new PasswordSecurityService().assertNotCompromised(password),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
