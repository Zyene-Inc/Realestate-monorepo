import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Role,
  UserStatus,
  WebsiteLeadScreeningStatus,
  WebsiteLeadStatus,
  WebsiteLeadTourStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWebsiteLeadWorkflowDto } from './dto/website-lead.dto';
import {
  isRentalWebsiteLead,
  websiteLeadAccessScope,
} from './website-lead-access';
import { WebsiteLeadsService } from './website-leads.service';

type CursorPage = { cursor?: string; limit?: number };

const DEFAULT_PAGE_SIZE = 25;

@Injectable()
export class WebsiteLeadWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: WebsiteLeadsService,
  ) {}

  private pageSize(limit?: number) {
    return Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), 100);
  }

  private workflowDate(value: string, label: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} is invalid`);
    }
    return date;
  }

  private sameDate(first: Date | null, second: Date | null) {
    return first?.getTime() === second?.getTime();
  }

  private workflowSnapshot(lead: {
    status: WebsiteLeadStatus;
    assignedToUserId: string | null;
    screeningStatus: WebsiteLeadScreeningStatus;
    screeningSummary: string | null;
    tourStatus: WebsiteLeadTourStatus;
    tourScheduledAt: Date | null;
    contactedAt: Date | null;
    closedAt: Date | null;
  }) {
    return {
      status: lead.status,
      assignedToUserId: lead.assignedToUserId,
      screeningStatus: lead.screeningStatus,
      screeningSummaryPresent: Boolean(lead.screeningSummary),
      tourStatus: lead.tourStatus,
      tourScheduledAt: lead.tourScheduledAt?.toISOString() ?? null,
      contactedAt: lead.contactedAt?.toISOString() ?? null,
      closedAt: lead.closedAt?.toISOString() ?? null,
    };
  }

  async listAssignees(id: string, role: Role = Role.SUPER_ADMIN) {
    const lead = await this.prisma.websiteLead.findFirst({
      where: { id, ...websiteLeadAccessScope(role) },
      select: { id: true, intent: true },
    });
    if (!lead) throw new NotFoundException('Website lead not found');

    const roles = isRentalWebsiteLead(lead.intent)
      ? [Role.TENANT_ADMIN, Role.SUPER_ADMIN]
      : [Role.SALES_ADMIN, Role.SUPER_ADMIN];
    return this.prisma.user.findMany({
      where: { role: { in: roles }, status: UserStatus.ACTIVE },
      select: { id: true, email: true, role: true },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
  }

  async updateWorkflow(
    id: string,
    body: UpdateWebsiteLeadWorkflowDto,
    actorUserId: string,
    role: Role = Role.SUPER_ADMIN,
  ) {
    const current = await this.prisma.websiteLead.findFirst({
      where: { id, ...websiteLeadAccessScope(role) },
      select: {
        id: true,
        intent: true,
        propertyId: true,
        status: true,
        assignedToUserId: true,
        assignedAt: true,
        contactedAt: true,
        closedAt: true,
        screeningStatus: true,
        screeningSummary: true,
        screeningCompletedAt: true,
        tourStatus: true,
        tourScheduledAt: true,
        tourCompletedAt: true,
        updatedAt: true,
      },
    });
    if (!current) throw new NotFoundException('Website lead not found');

    const expectedUpdatedAt = this.workflowDate(
      body.expectedUpdatedAt,
      'Workflow version',
    );
    if (expectedUpdatedAt.getTime() !== current.updatedAt.getTime()) {
      throw new ConflictException(
        'This lead changed since you opened it. Refresh before saving.',
      );
    }

    const hasWorkflowChange = [
      body.status,
      body.assignedToUserId,
      body.screeningStatus,
      body.screeningSummary,
      body.tourStatus,
      body.tourScheduledAt,
    ].some((value) => value !== undefined);
    if (!hasWorkflowChange) {
      throw new BadRequestException('No workflow changes were provided');
    }

    const rentalLead = isRentalWebsiteLead(current.intent);
    const hasRentalWorkflowChange = [
      body.screeningStatus,
      body.screeningSummary,
      body.tourStatus,
      body.tourScheduledAt,
    ].some((value) => value !== undefined);
    if (!rentalLead && hasRentalWorkflowChange) {
      throw new BadRequestException(
        'Screening and tour workflow is available only for rental leads',
      );
    }

    let assignedToUserId = current.assignedToUserId;
    let assignedAt = current.assignedAt;
    if (body.assignedToUserId !== undefined) {
      assignedToUserId = body.assignedToUserId;
      if (assignedToUserId) {
        const allowedRoles = rentalLead
          ? [Role.TENANT_ADMIN, Role.SUPER_ADMIN]
          : [Role.SALES_ADMIN, Role.SUPER_ADMIN];
        const assignee = await this.prisma.user.findFirst({
          where: {
            id: assignedToUserId,
            role: { in: allowedRoles },
            status: UserStatus.ACTIVE,
          },
          select: { id: true },
        });
        if (!assignee) {
          throw new BadRequestException(
            'Selected manager cannot be assigned to this lead',
          );
        }
        assignedAt =
          assignedToUserId === current.assignedToUserId
            ? (current.assignedAt ?? new Date())
            : new Date();
      } else {
        assignedAt = null;
      }
    }

    const screeningStatus = body.screeningStatus ?? current.screeningStatus;
    const screeningSummary =
      body.screeningSummary === undefined
        ? current.screeningSummary
        : body.screeningSummary?.trim() || null;
    const screeningComplete =
      screeningStatus === WebsiteLeadScreeningStatus.QUALIFIED ||
      screeningStatus === WebsiteLeadScreeningStatus.NOT_QUALIFIED;
    const screeningCompletedAt = screeningComplete
      ? (current.screeningCompletedAt ?? new Date())
      : null;

    const tourStatus = body.tourStatus ?? current.tourStatus;
    let tourScheduledAt =
      body.tourScheduledAt === undefined
        ? current.tourScheduledAt
        : body.tourScheduledAt
          ? this.workflowDate(body.tourScheduledAt, 'Tour appointment')
          : null;
    let tourCompletedAt = current.tourCompletedAt;
    if (tourStatus === WebsiteLeadTourStatus.NOT_SCHEDULED) {
      tourScheduledAt = null;
      tourCompletedAt = null;
    } else {
      if (!current.propertyId) {
        throw new BadRequestException(
          'A rental property must be linked before scheduling a tour',
        );
      }
      if (!tourScheduledAt) {
        throw new BadRequestException('Tour appointment is required');
      }
      if (
        tourStatus === WebsiteLeadTourStatus.SCHEDULED &&
        tourScheduledAt.getTime() <= Date.now()
      ) {
        throw new BadRequestException('Tour appointment must be in the future');
      }
      tourCompletedAt =
        tourStatus === WebsiteLeadTourStatus.COMPLETED
          ? (current.tourCompletedAt ?? new Date())
          : null;
    }

    let status = body.status ?? current.status;
    if (tourStatus === WebsiteLeadTourStatus.SCHEDULED) {
      status = WebsiteLeadStatus.TOUR_SCHEDULED;
    } else if (
      body.tourStatus !== undefined &&
      current.status === WebsiteLeadStatus.TOUR_SCHEDULED &&
      body.status === undefined
    ) {
      status = WebsiteLeadStatus.CONTACTED;
    } else if (
      body.screeningStatus === WebsiteLeadScreeningStatus.IN_PROGRESS &&
      body.status === undefined &&
      current.status !== WebsiteLeadStatus.TOUR_SCHEDULED
    ) {
      status = WebsiteLeadStatus.SCREENING;
    }
    if (
      status === WebsiteLeadStatus.TOUR_SCHEDULED &&
      tourStatus !== WebsiteLeadTourStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'Tour scheduled status requires a future appointment',
      );
    }
    if (
      status === WebsiteLeadStatus.SCREENING &&
      screeningStatus !== WebsiteLeadScreeningStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'Screening status requires screening to be in progress',
      );
    }
    if (
      status === WebsiteLeadStatus.CLOSED &&
      tourStatus === WebsiteLeadTourStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'Cancel or complete the scheduled tour before closing this lead',
      );
    }

    const now = new Date();
    const contactedAt =
      status === WebsiteLeadStatus.NEW
        ? current.contactedAt
        : (current.contactedAt ?? now);
    const closedAt =
      status === WebsiteLeadStatus.CLOSED ? (current.closedAt ?? now) : null;
    const updatedSnapshot = {
      status,
      assignedToUserId,
      screeningStatus,
      screeningSummary,
      tourStatus,
      tourScheduledAt,
      contactedAt,
      closedAt,
    };
    const unchanged =
      status === current.status &&
      assignedToUserId === current.assignedToUserId &&
      this.sameDate(assignedAt, current.assignedAt) &&
      screeningStatus === current.screeningStatus &&
      screeningSummary === current.screeningSummary &&
      this.sameDate(screeningCompletedAt, current.screeningCompletedAt) &&
      tourStatus === current.tourStatus &&
      this.sameDate(tourScheduledAt, current.tourScheduledAt) &&
      this.sameDate(tourCompletedAt, current.tourCompletedAt) &&
      this.sameDate(contactedAt, current.contactedAt) &&
      this.sameDate(closedAt, current.closedAt);
    if (unchanged) {
      throw new BadRequestException('No workflow changes were provided');
    }

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.websiteLead.updateMany({
        where: { id, updatedAt: expectedUpdatedAt },
        data: {
          ...updatedSnapshot,
          assignedAt,
          screeningCompletedAt,
          tourCompletedAt,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'This lead changed while you were saving. Refresh and try again.',
        );
      }
      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'WEBSITE_LEAD_WORKFLOW_UPDATED',
          resource: 'website_lead',
          resourceId: id,
          oldValue: JSON.stringify(this.workflowSnapshot(current)),
          newValue: JSON.stringify(this.workflowSnapshot(updatedSnapshot)),
        },
      });
    });

    return this.leads.getForAdmin(id, role);
  }

  async listNotes(
    id: string,
    page: CursorPage = {},
    role: Role = Role.SUPER_ADMIN,
  ) {
    const lead = await this.prisma.websiteLead.findFirst({
      where: { id, ...websiteLeadAccessScope(role) },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException('Website lead not found');

    const limit = this.pageSize(page.limit);
    const rows = await this.prisma.websiteLeadNote.findMany({
      where: { leadId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, email: true, role: true } },
      },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  async createNote(
    id: string,
    body: string,
    actorUserId: string,
    role: Role = Role.SUPER_ADMIN,
  ) {
    const lead = await this.prisma.websiteLead.findFirst({
      where: { id, ...websiteLeadAccessScope(role) },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException('Website lead not found');
    const normalizedBody = body.trim();
    if (!normalizedBody) {
      throw new BadRequestException('Note cannot be empty');
    }

    return this.prisma.$transaction(async (tx) => {
      const note = await tx.websiteLeadNote.create({
        data: { leadId: id, authorUserId: actorUserId, body: normalizedBody },
        include: {
          author: { select: { id: true, email: true, role: true } },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'WEBSITE_LEAD_NOTE_ADDED',
          resource: 'website_lead',
          resourceId: id,
          newValue: JSON.stringify({ noteId: note.id }),
        },
      });
      return note;
    });
  }
}
