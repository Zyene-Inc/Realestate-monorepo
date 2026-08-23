/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailsService } from './emails.service';

const mockSend = jest.fn();
const mockVerify = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
    webhooks: { verify: mockVerify },
  })),
}));

function configuredService(overrides: Record<string, string> = {}) {
  const config = {
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM_EMAIL: 'Johnson Realty <mail@example.com>',
    RESEND_WEBHOOK_SECRET: 'whsec_test',
    PROPERTIES_ADMIN_URL: 'https://properties-admin.coachjohnsonrealty.com',
    ...overrides,
  };
  const configService = {
    get: jest.fn((key: keyof typeof config) => config[key]),
  } as unknown as ConfigService;
  const baseLog = {
    id: 'log-1',
    to: 'agent@example.com',
    subject: 'Your Johnson Realty agent application was approved',
    body: '<p>body</p>',
    templateKey: 'agent.approved',
    templateVersion: 1,
    status: 'PENDING',
    critical: true,
    idempotencyKey: 'agent.approved/event/hash',
    providerIdempotencyKey: 'agent.approved/event/hash',
    resendEmailId: null,
    attemptCount: 0,
    maxAttempts: 3,
  };
  let savedLog = baseLog;
  const prisma = {
    emailLog: {
      upsert: jest.fn().mockImplementation(({ create }) => {
        savedLog = { ...baseLog, ...create };
        return savedLog;
      }),
      findUnique: jest.fn().mockImplementation(() => savedLog),
      findUniqueOrThrow: jest
        .fn()
        .mockImplementation(() => ({ ...savedLog, attemptCount: 1 })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    emailEvent: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  return {
    service: new EmailsService(configService, prisma as never),
    prisma,
    baseLog,
  };
}

describe('EmailsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists and sends a versioned transactional email with idempotency', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });
    const { service, prisma } = configuredService();

    await service.sendAgentApproved(
      'agent@example.com',
      'Alex Agent',
      'agent-1',
    );

    expect(Resend).toHaveBeenCalledWith('re_test_key');
    expect(prisma.emailLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          templateKey: 'agent.approved',
          templateVersion: 1,
          critical: true,
          maxAttempts: 3,
        }),
      }),
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Johnson Realty <mail@example.com>',
        to: 'agent@example.com',
        subject: 'Your Johnson Realty agent application was approved',
      }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
    expect(prisma.emailLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: expect.objectContaining({
        status: 'SENT',
        resendEmailId: 'email-123',
      }),
    });
  });

  it('logs without sending when the API key is missing', async () => {
    const configService = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;
    const prisma = {
      emailLog: {
        upsert: jest.fn().mockImplementation(({ create }) => ({
          id: 'log-1',
          ...create,
        })),
      },
    };
    const service = new EmailsService(configService, prisma as never);

    await service.sendAgentApproved('agent@example.com', 'Alex Agent');

    expect(Resend).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
    expect(prisma.emailLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'NOT_CONFIGURED' }),
      }),
    );
  });

  it('queues a bounded retry after a transient critical-email failure', async () => {
    mockSend.mockRejectedValue(
      Object.assign(new Error('rate limited'), { statusCode: 429 }),
    );
    const { service, prisma } = configuredService();

    await service.sendAgentApproved(
      'agent@example.com',
      'Alex Agent',
      'agent-1',
    );

    expect(prisma.emailLog.update).toHaveBeenLastCalledWith({
      where: { id: 'log-1' },
      data: expect.objectContaining({
        status: 'RETRY_PENDING',
        nextRetryAt: expect.any(Date),
        lastError: 'rate limited',
      }),
    });
  });

  it('notifies reviewers with the canonical Sales Admin URL', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-456' }, error: null });
    const { service } = configuredService();

    await service.sendAgentResubmittedForReview(
      'reviewer@example.com',
      'Alex Realty',
      'Alex Agent',
      'agent-123',
    );

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Agent application resubmitted: Alex Realty',
        html: expect.stringContaining(
          'https://properties-admin.coachjohnsonrealty.com/admin/agents?id=agent-123&amp;status=PENDING',
        ),
      }),
      expect.any(Object),
    );
  });

  it('verifies and stores an exact Resend delivery event once', async () => {
    const { service, prisma, baseLog } = configuredService();
    const tx = {
      emailEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
      emailLog: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(baseLog),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    mockVerify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-08-22T18:50:00.000Z',
      data: {
        email_id: 'email-123',
        message_id: 'message-123',
        created_at: '2026-08-22T18:49:59.000Z',
        from: 'mail@example.com',
        to: ['agent@example.com'],
        subject: 'Application approved',
        tags: { email_log_id: 'log-1' },
      },
    });

    await expect(
      service.handleWebhook('{"type":"email.delivered"}', {
        id: 'svix-event-1',
        timestamp: '1787424600',
        signature: 'v1,test',
      }),
    ).resolves.toEqual({ received: true, tracked: true });
    expect(tx.emailEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerEventId: 'svix-event-1',
        type: 'email.delivered',
      }),
    });
    expect(tx.emailLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: expect.objectContaining({
        status: 'DELIVERED',
        deliveredAt: new Date('2026-08-22T18:50:00.000Z'),
        body: null,
      }),
    });
  });

  it('does not regress delivery status when an older event arrives later', async () => {
    const { service, prisma, baseLog } = configuredService();
    const tx = {
      emailEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'event-2' }),
      },
      emailLog: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ ...baseLog, status: 'DELIVERED' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    mockVerify.mockReturnValue({
      type: 'email.sent',
      created_at: '2026-08-22T18:49:00.000Z',
      data: {
        email_id: 'email-123',
        message_id: 'message-123',
        created_at: '2026-08-22T18:49:00.000Z',
        from: 'mail@example.com',
        to: ['agent@example.com'],
        subject: 'Application approved',
      },
    });

    await service.handleWebhook('{"type":"email.sent"}', {
      id: 'svix-event-2',
      timestamp: '1787424540',
      signature: 'v1,test',
    });

    expect(tx.emailLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: expect.objectContaining({ status: 'DELIVERED' }),
    });
  });
});
