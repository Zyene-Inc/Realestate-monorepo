import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCorsOriginValidator,
  getAllowedFrontendOrigins,
} from './portal-urls';

describe('createCorsOriginValidator', () => {
  const validateOrigin = createCorsOriginValidator(
    new Set(['https://coachjohnsonrealty.com']),
  );

  it.each([undefined, 'https://coachjohnsonrealty.com/'])(
    'allows a trusted origin (%s)',
    (origin) => {
      const callback = jest.fn();

      validateOrigin(origin, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(null, true);
    },
  );

  it('rejects an untrusted origin with HTTP 403 semantics', () => {
    const callback = jest.fn();

    validateOrigin('https://evil.example', callback);

    expect(callback).toHaveBeenCalledTimes(1);
    const [error, allowed] = callback.mock.calls[0] as [
      ForbiddenException,
      boolean,
    ];
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getStatus()).toBe(403);
    expect(error.message).toBe('Origin is not allowed by CORS');
    expect(allowed).toBe(false);
  });
});

describe('getAllowedFrontendOrigins', () => {
  it('keeps the local frontend origin when production portal URLs are set', () => {
    const values: Record<string, string> = {
      FRONTEND_URL: 'http://localhost:3000',
      PUBLIC_SITE_URL: 'https://coachjohnsonrealty.com',
      AGENT_PORTAL_URL: 'https://agents.coachjohnsonrealty.com',
      PROPERTIES_ADMIN_URL: 'https://properties-admin.coachjohnsonrealty.com',
      RENTAL_ADMIN_URL: 'https://rental-admin.coachjohnsonrealty.com',
      TENANT_PORTAL_URL: 'https://tenant.coachjohnsonrealty.com',
      SUPER_ADMIN_URL: 'https://admin.coachjohnsonrealty.com',
    };
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    expect(getAllowedFrontendOrigins(config)).toContain(
      'http://localhost:3000',
    );
  });
});
