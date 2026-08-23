import { AgentsService } from './agents.service';

const mockStorageRemove = jest.fn();
const mockGetAuthUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { admin: { getUserById: mockGetAuthUser } },
    storage: {
      from: jest.fn(() => ({ remove: mockStorageRemove })),
    },
  })),
}));

describe('AgentsService', () => {
  const agent = {
    id: 'agent-1',
    userId: 'user-1',
    email: 'agent@example.com',
    contactName: 'Alex Agent',
    companyName: 'Alex Realty',
    accountStatus: 'DECLINED',
    declineReason: 'Update the company license',
    verificationDocuments: ['agents/agent-1/license.pdf'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function serviceWith(prisma: object, emails: object = {}) {
    return new AgentsService(
      prisma as never,
      emails as never,
      {
        get: jest.fn((key: string) =>
          key === 'SUPABASE_URL' ? 'https://project.supabase.co' : 'secret',
        ),
      } as never,
    );
  }

  it('does not delete the Storage object when the database transaction fails', async () => {
    const prisma = {
      agent: { findUnique: jest.fn().mockResolvedValue(agent) },
      $transaction: jest.fn().mockRejectedValue(new Error('database failed')),
    };
    const service = serviceWith(prisma);

    await expect(service.removeDocument('user-1', 0)).rejects.toThrow(
      'database failed',
    );
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it('deletes the Storage object only after the database reference is removed', async () => {
    const order: string[] = [];
    const updated = { ...agent, verificationDocuments: [] };
    const tx = {
      agent: {
        update: jest.fn().mockImplementation(() => {
          order.push('database');
          return updated;
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      agent: { findUnique: jest.fn().mockResolvedValue(agent) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    mockStorageRemove.mockImplementation(() => {
      order.push('storage');
      return { error: null };
    });
    const service = serviceWith(prisma);

    await expect(service.removeDocument('user-1', 0)).resolves.toEqual(updated);
    expect(order).toEqual(['database', 'storage']);
  });

  it('returns the committed database result when best-effort Storage cleanup fails', async () => {
    const updated = { ...agent, verificationDocuments: [] };
    const tx = {
      agent: { update: jest.fn().mockResolvedValue(updated) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      agent: { findUnique: jest.fn().mockResolvedValue(agent) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    mockStorageRemove.mockResolvedValue({
      error: { message: 'Storage unavailable' },
    });
    const service = serviceWith(prisma);

    await expect(service.removeDocument('user-1', 0)).resolves.toEqual(updated);
  });

  it('atomically returns a declined application to pending review and notifies both sides', async () => {
    const updated = {
      ...agent,
      accountStatus: 'PENDING',
      declineReason: null,
    };
    const tx = {
      agent: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      agent: { findUnique: jest.fn().mockResolvedValue(agent) },
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ email: 'sales-admin@example.com' }]),
      },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const emails = {
      sendAgentResubmissionReceived: jest.fn().mockResolvedValue(undefined),
      sendAgentResubmittedForReview: jest.fn().mockResolvedValue(undefined),
    };
    const service = serviceWith(prisma, emails);

    await expect(service.resubmit('user-1')).resolves.toEqual(updated);

    expect(tx.agent.updateMany).toHaveBeenCalledWith({
      where: { id: 'agent-1', accountStatus: 'DECLINED' },
      data: {
        accountStatus: 'PENDING',
        approvedAt: null,
        approvedByUserId: null,
        declineReason: null,
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'AGENT_RESUBMITTED',
        resource: 'agent',
        resourceId: 'agent-1',
        oldValue: JSON.stringify({
          accountStatus: 'DECLINED',
          declineReason: 'Update the company license',
        }),
        newValue: JSON.stringify({ accountStatus: 'PENDING' }),
      },
    });
    expect(emails.sendAgentResubmissionReceived).toHaveBeenCalledWith(
      'agent@example.com',
      'Alex Agent',
      'agent-1',
    );
    expect(emails.sendAgentResubmittedForReview).toHaveBeenCalledWith(
      'sales-admin@example.com',
      'Alex Realty',
      'Alex Agent',
      'agent-1',
    );
  });

  it('does not resubmit an application unless its current state is declined', async () => {
    const prisma = {
      agent: {
        findUnique: jest.fn().mockResolvedValue({
          ...agent,
          accountStatus: 'PENDING',
        }),
      },
      $transaction: jest.fn(),
    };
    const service = serviceWith(prisma);

    await expect(service.resubmit('user-1')).rejects.toThrow(
      'Only declined agent applications can be resubmitted',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses approval until Supabase confirms the agent email', async () => {
    mockGetAuthUser.mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    const prisma = {
      agent: {
        findUnique: jest.fn().mockResolvedValue({
          ...agent,
          accountStatus: 'PENDING',
          user: { authUserId: 'auth-user-1' },
        }),
      },
      $transaction: jest.fn(),
    };
    const service = serviceWith(prisma);

    await expect(service.approve('agent-1', 'reviewer-1')).rejects.toThrow(
      'The agent must verify their email before approval',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a stale approval transition atomically', async () => {
    mockGetAuthUser.mockResolvedValue({
      data: { user: { email_confirmed_at: '2026-08-22T12:00:00.000Z' } },
      error: null,
    });
    const current = {
      ...agent,
      accountStatus: 'PENDING',
      user: { authUserId: 'auth-user-1' },
    };
    const tx = {
      user: { update: jest.fn().mockResolvedValue({}) },
      agent: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      agent: { findUnique: jest.fn().mockResolvedValue(current) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const emails = {
      sendAgentApproved: jest.fn().mockResolvedValue(undefined),
    };
    const service = serviceWith(prisma, emails);

    await expect(service.approve('agent-1', 'reviewer-1')).rejects.toThrow(
      'The agent application was already reviewed',
    );
    expect(tx.agent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'agent-1', accountStatus: 'PENDING' },
      }),
    );
    expect(tx.agent.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(emails.sendAgentApproved).not.toHaveBeenCalled();
  });
});
