import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  function hostFor(response: object, requestId?: string) {
    return {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          requestId,
          method: 'POST',
          url: '/api/resource',
        }),
      }),
    } as ArgumentsHost;
  }

  it('preserves safe HTTP details and request correlation', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    new AllExceptionsFilter().catch(
      new BadRequestException('Invalid request'),
      hostFor(response, 'request-123'),
    );
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        path: '/api/resource',
        requestId: 'request-123',
        message: 'Invalid request',
      }),
    );
  });

  it('does not expose unexpected exception messages or stacks', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    new AllExceptionsFilter().catch(
      new Error('database password and stack detail'),
      hostFor(response),
    );
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        requestId: 'unavailable',
      }),
    );
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      'database password',
    );
  });
});
