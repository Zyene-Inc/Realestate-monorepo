import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  RentalApplicationDocumentStatus,
  RentalApplicationDocumentType,
  RentalApplicationFeeStatus,
  RentalApplicationStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { getPortalUrls } from '../common/config/portal-urls';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRentalApplicationNoteDto,
  ListRentalApplicationsDto,
  ReviewRentalApplicationDocumentDto,
  UpdateRentalApplicationWorkflowDto,
} from './dto/rental-application.dto';
import { issueRentalApplicationToken } from './rental-application-access';
import { applicantPublicSelect } from './rental-applications.service';

const applicationDetailSelect = {
  ...applicantPublicSelect,
  assignedToUserId: true,
  assignedAt: true,
  reviewedAt: true,
  certifiedAt: true,
  consentVersion: true,
  property: true,
  unit: true,
  websiteLead: { select: { id: true, status: true, createdAt: true } },
  assignedTo: { select: { id: true, email: true, role: true } },
  documents: {
    include: { reviewedBy: { select: { id: true, email: true } } },
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
  },
  notes: {
    include: { author: { select: { id: true, email: true } } },
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
  },
  handoff: {
    include: {
      tenant: {
        select: {
          id: true,
          unitId: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
        },
      },
      lease: {
        include: {
          unit: {
            include: { property: { select: { id: true, name: true } } },
          },
        },
      },
      envelope: {
        select: {
          id: true,
          providerEnvelopeId: true,
          status: true,
          recipientStatus: true,
          sentAt: true,
          openedAt: true,
          completedAt: true,
          expiresAt: true,
          failureReason: true,
        },
      },
    },
  },
} satisfies Prisma.RentalApplicationSelect;

const transitions: Record<RentalApplicationStatus, RentalApplicationStatus[]> =
  {
    DRAFT: [],
    FEE_PENDING: [
      RentalApplicationStatus.UNDER_REVIEW,
      RentalApplicationStatus.NEEDS_INFORMATION,
      RentalApplicationStatus.DENIED,
    ],
    SUBMITTED: [
      RentalApplicationStatus.UNDER_REVIEW,
      RentalApplicationStatus.NEEDS_INFORMATION,
      RentalApplicationStatus.APPROVED,
      RentalApplicationStatus.DENIED,
    ],
    UNDER_REVIEW: [
      RentalApplicationStatus.NEEDS_INFORMATION,
      RentalApplicationStatus.APPROVED,
      RentalApplicationStatus.DENIED,
    ],
    NEEDS_INFORMATION: [
      RentalApplicationStatus.UNDER_REVIEW,
      RentalApplicationStatus.APPROVED,
      RentalApplicationStatus.DENIED,
    ],
    APPROVED: [],
    DENIED: [],
    WITHDRAWN: [],
  };

@Injectable()
export class RentalApplicationAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailsService,
    private readonly config: ConfigService,
  ) {}

  async list(query: ListRentalApplicationsDto) {
    const take = query.take || 25;
    const where: Prisma.RentalApplicationWhereInput = {
      status: query.status,
      assignedToUserId: query.assignedToUserId,
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              {
                property: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.rentalApplication.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        feeStatus: true,
        feeAmount: true,
        submittedAt: true,
        updatedAt: true,
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
        assignedTo: { select: { id: true, email: true } },
        _count: { select: { documents: true, notes: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return { items, nextCursor: hasMore ? items.at(-1)?.id : null };
  }

  async unreadCount() {
    return {
      count: await this.prisma.rentalApplication.count({
        where: {
          status: {
            in: [
              RentalApplicationStatus.SUBMITTED,
              RentalApplicationStatus.FEE_PENDING,
            ],
          },
        },
      }),
    };
  }

  async findOne(id: string) {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id },
      select: applicationDetailSelect,
    });
    if (!application)
      throw new NotFoundException('Rental application not found');
    return application;
  }

  async assignees() {
    return this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        role: { in: [Role.SUPER_ADMIN, Role.TENANT_ADMIN] },
      },
      select: { id: true, email: true, role: true },
      orderBy: [{ email: 'asc' }],
    });
  }

  private async assertAssignee(userId: string) {
    const assignee = await this.prisma.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
        role: { in: [Role.SUPER_ADMIN, Role.TENANT_ADMIN] },
      },
      select: { id: true },
    });
    if (!assignee)
      throw new BadRequestException('Select an active rental administrator');
  }

  private assertApprovalReady(
    application: Awaited<ReturnType<RentalApplicationAdminService['findOne']>>,
  ) {
    if (
      application.feeStatus !== RentalApplicationFeeStatus.NOT_REQUIRED &&
      application.feeStatus !== RentalApplicationFeeStatus.PAID
    ) {
      throw new ConflictException(
        'The application fee must be paid before approval',
      );
    }
    const accepted = new Set(
      application.documents
        .filter(
          (document) =>
            document.status === RentalApplicationDocumentStatus.ACCEPTED,
        )
        .map((document) => document.type),
    );
    if (
      !accepted.has(RentalApplicationDocumentType.GOVERNMENT_ID) ||
      !accepted.has(RentalApplicationDocumentType.INCOME_PROOF)
    ) {
      throw new ConflictException(
        'Accept the government ID and proof-of-income documents before approval',
      );
    }
  }

  async updateWorkflow(
    actorUserId: string,
    id: string,
    data: UpdateRentalApplicationWorkflowDto,
  ) {
    const application = await this.findOne(id);
    if (data.assignedToUserId) await this.assertAssignee(data.assignedToUserId);
    if (data.status && data.status !== application.status) {
      if (!transitions[application.status].includes(data.status)) {
        throw new ConflictException(
          `Application cannot move from ${application.status} to ${data.status}`,
        );
      }
      if (
        (data.status === RentalApplicationStatus.NEEDS_INFORMATION ||
          data.status === RentalApplicationStatus.DENIED) &&
        !data.decisionReason?.trim()
      ) {
        throw new BadRequestException(
          'Explain what information or decision is required',
        );
      }
      if (data.status === RentalApplicationStatus.APPROVED) {
        this.assertApprovalReady(application);
      }
    }
    const assignedToUserId = data.clearAssignment
      ? null
      : (data.assignedToUserId ?? undefined);
    const now = new Date();
    const changed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.rentalApplication.updateMany({
        where: { id, updatedAt: new Date(data.expectedUpdatedAt) },
        data: {
          status: data.status,
          assignedToUserId,
          assignedAt:
            assignedToUserId === null
              ? null
              : data.assignedToUserId
                ? now
                : undefined,
          reviewedAt:
            data.status === RentalApplicationStatus.UNDER_REVIEW
              ? now
              : undefined,
          decisionReason: data.decisionReason?.trim() || undefined,
          decidedAt:
            data.status === RentalApplicationStatus.APPROVED ||
            data.status === RentalApplicationStatus.DENIED
              ? now
              : undefined,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException('Application changed; refresh and retry');
      }
      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'RENTAL_APPLICATION_WORKFLOW_UPDATED',
          resource: 'rental_application',
          resourceId: id,
          oldValue: JSON.stringify({
            status: application.status,
            assignedToUserId: application.assignedToUserId,
          }),
          newValue: JSON.stringify({
            status: data.status ?? application.status,
            assignedToUserId:
              assignedToUserId === undefined
                ? application.assignedToUserId
                : assignedToUserId,
          }),
        },
      });
      return tx.rentalApplication.findUniqueOrThrow({
        where: { id },
        select: applicationDetailSelect,
      });
    });
    if (data.status && data.status !== application.status) {
      await this.sendStatusEmail(changed);
    }
    return changed;
  }

  private async sendStatusEmail(
    application: Awaited<ReturnType<RentalApplicationAdminService['findOne']>>,
  ) {
    const access = issueRentalApplicationToken();
    await this.prisma.rentalApplicationAccessLink.create({
      data: {
        applicationId: application.id,
        tokenHash: access.hash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const url = `${getPortalUrls(this.config).public}/rentals/applications/${application.id}/resume#token=${access.token}`;
    await this.emails.sendRentalApplicationStatus(
      application.email,
      {
        name: application.firstName,
        propertyName: application.property.name,
        status: application.status.replaceAll('_', ' ').toLowerCase(),
        reason: application.decisionReason,
        url,
      },
      `${application.id}/${application.status}/${application.updatedAt.toISOString()}`,
    );
  }

  async reviewDocument(
    actorUserId: string,
    id: string,
    documentId: string,
    data: ReviewRentalApplicationDocumentDto,
  ) {
    if (
      data.status === RentalApplicationDocumentStatus.REJECTED &&
      !data.rejectionReason?.trim()
    ) {
      throw new BadRequestException('Explain why the document was rejected');
    }
    const document = await this.prisma.rentalApplicationDocument.findFirst({
      where: { id: documentId, applicationId: id },
    });
    if (!document)
      throw new NotFoundException('Application document not found');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.rentalApplicationDocument.update({
        where: { id: documentId },
        data: {
          status: data.status,
          reviewedByUserId: actorUserId,
          reviewedAt: new Date(),
          rejectionReason:
            data.status === RentalApplicationDocumentStatus.REJECTED
              ? data.rejectionReason?.trim()
              : null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'RENTAL_APPLICATION_DOCUMENT_REVIEWED',
          resource: 'rental_application',
          resourceId: id,
          newValue: JSON.stringify({ documentId, status: data.status }),
        },
      });
      return updated;
    });
  }

  async addNote(
    actorUserId: string,
    id: string,
    data: CreateRentalApplicationNoteDto,
  ) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.rentalApplicationNote.create({
        data: {
          applicationId: id,
          authorUserId: actorUserId,
          body: data.body.trim(),
        },
        include: { author: { select: { id: true, email: true } } },
      });
      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'RENTAL_APPLICATION_NOTE_ADDED',
          resource: 'rental_application',
          resourceId: id,
        },
      });
      return note;
    });
  }
}
