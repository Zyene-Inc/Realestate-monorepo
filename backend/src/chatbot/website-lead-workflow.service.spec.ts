import { ConflictException } from '@nestjs/common';
import {
  Role,
  UserStatus,
  WebsiteLeadIntent,
  WebsiteLeadScreeningStatus,
  WebsiteLeadStatus,
  WebsiteLeadTourStatus,
} from '@prisma/client';
import { WebsiteLeadWorkflowService } from './website-lead-workflow.service';

describe('WebsiteLeadWorkflowService', () => {
  function prismaMock() {
    return {
      user: { findFirst: jest.fn(), findMany: jest.fn() },
      websiteLead: { findFirst: jest.fn(), updateMany: jest.fn() },
      websiteLeadNote: { create: jest.fn(), findMany: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };
  }

  function rentalLead() {
    return {
      id: 'lead-4',
      intent: WebsiteLeadIntent.RENTAL_TOUR,
      propertyId: 'property-1',
      status: WebsiteLeadStatus.NEW,
      assignedToUserId: null,
      assignedAt: null,
      contactedAt: null,
      closedAt: null,
      screeningStatus: WebsiteLeadScreeningStatus.NOT_STARTED,
      screeningSummary: null,
      screeningCompletedAt: null,
      tourStatus: WebsiteLeadTourStatus.NOT_SCHEDULED,
      tourScheduledAt: null,
      tourCompletedAt: null,
      updatedAt: new Date('2099-08-01T12:00:00.000Z'),
    };
  }

  function workflowService(
    prisma: ReturnType<typeof prismaMock>,
    updatedLead: object = rentalLead(),
  ) {
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) =>
        Promise.resolve(callback(prisma)),
    );
    const leads = { getForAdmin: jest.fn().mockResolvedValue(updatedLead) };
    return {
      service: new WebsiteLeadWorkflowService(prisma as never, leads as never),
      leads,
    };
  }

  it('assigns, screens, and schedules a rental tour atomically', async () => {
    const prisma = prismaMock();
    const currentLead = rentalLead();
    const updatedLead = {
      ...currentLead,
      status: WebsiteLeadStatus.TOUR_SCHEDULED,
      assignedToUserId: 'rental-admin-1',
      screeningStatus: WebsiteLeadScreeningStatus.QUALIFIED,
      screeningSummary: 'Income and move-in timing pre-screened.',
      tourStatus: WebsiteLeadTourStatus.SCHEDULED,
      tourScheduledAt: new Date('2099-09-05T18:00:00.000Z'),
      updatedAt: new Date('2099-08-01T12:01:00.000Z'),
    };
    prisma.websiteLead.findFirst.mockResolvedValue(currentLead);
    prisma.user.findFirst.mockResolvedValue({ id: 'rental-admin-1' });
    prisma.websiteLead.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-4' });
    const { service, leads } = workflowService(prisma, updatedLead);

    const updated = await service.updateWorkflow(
      'lead-4',
      {
        assignedToUserId: 'rental-admin-1',
        screeningStatus: WebsiteLeadScreeningStatus.QUALIFIED,
        screeningSummary: 'Income and move-in timing pre-screened.',
        tourStatus: WebsiteLeadTourStatus.SCHEDULED,
        tourScheduledAt: '2099-09-05T18:00:00.000Z',
        expectedUpdatedAt: currentLead.updatedAt.toISOString(),
      },
      'super-admin-1',
    );

    expect(updated.status).toBe(WebsiteLeadStatus.TOUR_SCHEDULED);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'rental-admin-1',
        role: { in: [Role.TENANT_ADMIN, Role.SUPER_ADMIN] },
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
    const expectedWorkflowData = expect.objectContaining({
      assignedToUserId: 'rental-admin-1',
      status: WebsiteLeadStatus.TOUR_SCHEDULED,
      screeningStatus: WebsiteLeadScreeningStatus.QUALIFIED,
      tourStatus: WebsiteLeadTourStatus.SCHEDULED,
      tourScheduledAt: new Date('2099-09-05T18:00:00.000Z'),
    }) as unknown as object;
    expect(prisma.websiteLead.updateMany).toHaveBeenCalledWith({
      where: { id: 'lead-4', updatedAt: currentLead.updatedAt },
      data: expectedWorkflowData,
    });
    const expectedAuditData = expect.objectContaining({
      userId: 'super-admin-1',
      action: 'WEBSITE_LEAD_WORKFLOW_UPDATED',
      resourceId: 'lead-4',
    }) as unknown as object;
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expectedAuditData,
    });
    expect(leads.getForAdmin).toHaveBeenCalledWith('lead-4', Role.SUPER_ADMIN);
  });

  it('rejects a stale workflow update without writing data', async () => {
    const prisma = prismaMock();
    prisma.websiteLead.findFirst.mockResolvedValue(rentalLead());
    const { service } = workflowService(prisma);

    await expect(
      service.updateWorkflow(
        'lead-4',
        {
          status: WebsiteLeadStatus.CONTACTED,
          expectedUpdatedAt: '2099-08-01T11:59:00.000Z',
        },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.websiteLead.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('does not create an audit event when the workflow is unchanged', async () => {
    const prisma = prismaMock();
    const currentLead = rentalLead();
    prisma.websiteLead.findFirst.mockResolvedValue(currentLead);
    const { service } = workflowService(prisma);

    await expect(
      service.updateWorkflow(
        'lead-4',
        {
          status: WebsiteLeadStatus.NEW,
          expectedUpdatedAt: currentLead.updatedAt.toISOString(),
        },
        'admin-1',
      ),
    ).rejects.toThrow('No workflow changes were provided');

    expect(prisma.websiteLead.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects rental screening controls for a sales lead', async () => {
    const prisma = prismaMock();
    prisma.websiteLead.findFirst.mockResolvedValue({
      ...rentalLead(),
      id: 'lead-sales',
      intent: WebsiteLeadIntent.BUYER_INQUIRY,
      propertyId: null,
    });
    const { service } = workflowService(prisma);

    await expect(
      service.updateWorkflow(
        'lead-sales',
        {
          screeningStatus: WebsiteLeadScreeningStatus.IN_PROGRESS,
          expectedUpdatedAt: '2099-08-01T12:00:00.000Z',
        },
        'sales-admin-1',
        Role.SALES_ADMIN,
      ),
    ).rejects.toThrow(
      'Screening and tour workflow is available only for rental leads',
    );
  });

  it('lists eligible rental managers and records private notes', async () => {
    const prisma = prismaMock();
    prisma.websiteLead.findFirst.mockResolvedValue({
      id: 'lead-notes',
      intent: WebsiteLeadIntent.RENTAL_INQUIRY,
    });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.websiteLeadNote.create.mockResolvedValue({
      id: 'note-1',
      body: 'Tour requested for next week.',
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-note-1' });
    const { service } = workflowService(prisma);

    await service.listAssignees('lead-notes', Role.TENANT_ADMIN);
    await service.createNote(
      'lead-notes',
      '  Tour requested for next week.  ',
      'super-admin-1',
      Role.TENANT_ADMIN,
    );

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        role: { in: [Role.TENANT_ADMIN, Role.SUPER_ADMIN] },
        status: UserStatus.ACTIVE,
      },
      select: { id: true, email: true, role: true },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
    expect(prisma.websiteLeadNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          leadId: 'lead-notes',
          authorUserId: 'super-admin-1',
          body: 'Tour requested for next week.',
        },
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'super-admin-1',
        action: 'WEBSITE_LEAD_NOTE_ADDED',
        resource: 'website_lead',
        resourceId: 'lead-notes',
        newValue: JSON.stringify({ noteId: 'note-1' }),
      },
    });
  });
});
