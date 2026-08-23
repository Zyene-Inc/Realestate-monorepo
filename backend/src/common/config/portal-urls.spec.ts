import { ForbiddenException } from '@nestjs/common';
import { createCorsOriginValidator } from './portal-urls';

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
