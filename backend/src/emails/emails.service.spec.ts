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
      PROPERTIES_ADMIN_URL: 'https://properties-admin.coachjohnsonrealty.com',
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

  it('notifies reviewers with the canonical Sales Admin URL after resubmission', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-456' }, error: null });
    const config = {
      RESEND_API_KEY: 're_test_key',
      RESEND_FROM_EMAIL: 'Johnson Realty <mail@example.com>',
      PROPERTIES_ADMIN_URL: 'https://properties-admin.coachjohnsonrealty.com',
    };
    const configService = {
      get: jest.fn((key: keyof typeof config) => config[key]),
    } as unknown as ConfigService;
    const service = new EmailsService(configService);

    await service.sendAgentResubmittedForReview(
      'reviewer@example.com',
      'Alex Realty',
      'Alex Agent',
      'agent-123',
    );

    expect(mockSend).toHaveBeenCalledWith({
      from: 'Johnson Realty <mail@example.com>',
      to: 'reviewer@example.com',
      subject: 'Agent application resubmitted: Alex Realty',
      html: '<div style="font-family: sans-serif; padding: 24px;"><h2>Agent application resubmitted</h2><p><strong>Alex Realty</strong> (Alex Agent) submitted updated information for Johnson Realty review.</p><p style="margin: 28px 0;"><a href="https://properties-admin.coachjohnsonrealty.com/admin/agents?id=agent-123&amp;status=PENDING" style="padding: 12px 20px; background: #111827; color: white; text-decoration: none; border-radius: 8px;">Review application</a></p></div>',
    });
  });
});
