import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailsService } from './emails.service';

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('EmailsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends transactional email through Resend', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });
    const config = {
      RESEND_API_KEY: 're_test_key',
      RESEND_FROM_EMAIL: 'Johnson Realty <mail@example.com>',
    };
    const configService = {
      get: jest.fn((key: keyof typeof config) => config[key]),
    } as unknown as ConfigService;
    const service = new EmailsService(configService);

    await service.sendAgentApproved('agent@example.com', 'Alex Agent');

    expect(Resend).toHaveBeenCalledWith('re_test_key');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Johnson Realty <mail@example.com>',
        to: 'agent@example.com',
        subject: 'Your Johnson Realty agent application was approved',
      }),
    );
  });

  it('does not call Resend when the API key is missing', async () => {
    const configService = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;
    const service = new EmailsService(configService);

    await service.sendAgentApproved('agent@example.com', 'Alex Agent');

    expect(Resend).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
