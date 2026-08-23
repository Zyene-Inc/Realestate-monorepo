import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentAccountStatus,
  ESignatureDocumentType,
  ESignatureEnvelopeStatus,
  ESignatureEventSource,
  ESignatureStoredDocumentType,
  ESignatureTargetType,
  Prisma,
  Role,
} from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateESignatureDto,
  ESignatureEventListQueryDto,
  ESignatureListQueryDto,
} from './dto/e-signature.dto';
import { VerdocsService } from './verdocs.service';
import type { IEnvelope, IEnvelopeDocument } from '@verdocs/js-sdk';

const SIGNED_DOCUMENT_BUCKET = 'signed-documents';
const TERMINAL_STATUSES: ESignatureEnvelopeStatus[] = [
  ESignatureEnvelopeStatus.COMPLETED,
  ESignatureEnvelopeStatus.DECLINED,
  ESignatureEnvelopeStatus.CANCELED,
  ESignatureEnvelopeStatus.EXPIRED,
];

function rawJsonProperty(payload: Buffer, property: string) {
  const json = payload.toString('utf8');
  const marker = `"${property}"`;
  const propertyIndex = json.indexOf(marker);
  if (propertyIndex < 0) return null;
  const colonIndex = json.indexOf(':', propertyIndex + marker.length);
  if (colonIndex < 0) return null;
  let start = colonIndex + 1;
  while (/\s/.test(json[start] ?? '')) start += 1;
  const opening = json[start];
  if (opening !== '{' && opening !== '[' && opening !== '"') {
    const end = json.slice(start).search(/[,}]/);
    return end < 0
      ? json.slice(start).trim()
      : json.slice(start, start + end).trim();
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < json.length; index += 1) {
    const character = json[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') {
        inString = false;
        if (opening === '"') return json.slice(start, index + 1);
      }
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{' || character === '[') depth += 1;
    else if (character === '}' || character === ']') {
      depth -= 1;
      if (depth === 0) return json.slice(start, index + 1);
    }
  }
  return null;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

const envelopeInclude = {
  tenant: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  agent: {
    select: { id: true, companyName: true, contactName: true, email: true },
  },
  lease: {
    select: {
      id: true,
      startDate: true,
      endDate: true,
      unit: {
        select: {
          unitNumber: true,
          property: { select: { id: true, name: true } },
        },
      },
    },
  },
  property: { select: { id: true, name: true, address: true } },
  createdBy: { select: { id: true, email: true } },
  documents: {
    orderBy: [{ archivedAt: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.ESignatureEnvelopeInclude;

type CurrentUser = { id: string; role: Role; email: string };
type ResolvedTarget = {
  tenantId: string | null;
  agentId: string | null;
  leaseId: string | null;
  propertyId: string | null;
  firstName: string;
  lastName: string;
  email: string;
};

type VerdocsWebhookPayload = {
  id?: string;
  event?: string;
  event_name?: string;
  type?: string;
  created_at?: string;
  timestamp?: string;
  body?: unknown;
};

@Injectable()
export class ESignaturesService {
  private readonly logger = new Logger(ESignaturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly verdocs: VerdocsService,
  ) {}

  configuration() {
    return this.verdocs.configuration();
  }

  templates() {
    return this.verdocs.listTemplates();
  }

  private adminTargetScope(role: Role) {
    if (role === Role.SALES_ADMIN) {
      return { targetType: ESignatureTargetType.AGENT };
    }
    if (role === Role.TENANT_ADMIN) {
      return { targetType: ESignatureTargetType.TENANT };
    }
    return {};
  }

  private assertAdminTarget(role: Role, targetType: ESignatureTargetType) {
    if (
      (role === Role.SALES_ADMIN &&
        targetType !== ESignatureTargetType.AGENT) ||
      (role === Role.TENANT_ADMIN && targetType !== ESignatureTargetType.TENANT)
    ) {
      throw new ForbiddenException(
        'This document target belongs to another administration area',
      );
    }
  }

  async listAdmin(user: CurrentUser, query: ESignatureListQueryDto) {
    if (query.targetType) {
      this.assertAdminTarget(user.role, query.targetType);
    }
    return this.list(
      {
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.documentType ? { documentType: query.documentType } : {}),
        ...this.adminTargetScope(user.role),
      },
      query,
    );
  }

  async listMine(
    userId: string,
    targetType: ESignatureTargetType,
    query: ESignatureListQueryDto,
  ) {
    const target = await this.targetForUser(userId, targetType);
    return this.list(
      targetType === ESignatureTargetType.TENANT
        ? {
            tenantId: target.id,
            ...(query.status ? { status: query.status } : {}),
            ...(query.documentType ? { documentType: query.documentType } : {}),
          }
        : {
            agentId: target.id,
            ...(query.status ? { status: query.status } : {}),
            ...(query.documentType ? { documentType: query.documentType } : {}),
          },
      query,
    );
  }

  private async list(
    where: Prisma.ESignatureEnvelopeWhereInput,
    query: ESignatureListQueryDto,
  ) {
    const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
    const rows = await this.prisma.eSignatureEnvelope.findMany({
      where,
      include: envelopeInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  async getAdmin(user: CurrentUser, id: string) {
    const envelope = await this.prisma.eSignatureEnvelope.findFirst({
      where: { id, ...this.adminTargetScope(user.role) },
      include: envelopeInclude,
    });
    if (!envelope)
      throw new NotFoundException('E-signature envelope not found');
    return envelope;
  }

  async getMine(userId: string, targetType: ESignatureTargetType, id: string) {
    const target = await this.targetForUser(userId, targetType);
    const envelope = await this.prisma.eSignatureEnvelope.findFirst({
      where: {
        id,
        ...(targetType === ESignatureTargetType.TENANT
          ? { tenantId: target.id }
          : { agentId: target.id }),
      },
      include: envelopeInclude,
    });
    if (!envelope)
      throw new NotFoundException('E-signature envelope not found');
    return envelope;
  }

  async eventsAdmin(
    user: CurrentUser,
    id: string,
    query: ESignatureEventListQueryDto,
  ) {
    await this.getAdmin(user, id);
    return this.events(id, query);
  }

  async eventsMine(
    userId: string,
    targetType: ESignatureTargetType,
    id: string,
    query: ESignatureEventListQueryDto,
  ) {
    await this.getMine(userId, targetType, id);
    return this.events(id, query);
  }

  private async events(id: string, query: ESignatureEventListQueryDto) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const rows = await this.prisma.eSignatureEvent.findMany({
      where: { envelopeId: id },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  async create(user: CurrentUser, data: CreateESignatureDto) {
    this.assertAdminTarget(user.role, data.targetType);
    if (this.verdocs.templateIdFor(data.documentType) !== data.templateId) {
      throw new BadRequestException(
        'The selected Verdocs template does not match the document type',
      );
    }
    const previous = await this.prisma.eSignatureEnvelope.findUnique({
      where: { clientRequestId: data.clientRequestId },
      include: envelopeInclude,
    });
    if (previous) {
      if (
        previous.createdByUserId !== user.id ||
        previous.templateId !== data.templateId ||
        previous.documentType !== data.documentType ||
        previous.targetType !== data.targetType ||
        previous.recipientRoleName !== data.recipientRoleName.trim()
      ) {
        throw new ConflictException(
          'The request ID was already used for a different envelope',
        );
      }
      return previous;
    }

    const target = await this.resolveTarget(data);
    const template = await this.verdocs.template(data.templateId);
    const actionableRoles = (template.roles ?? []).filter((role) =>
      ['signer', 'approver'].includes(role.type),
    );
    const requestedRole = actionableRoles.find(
      (role) => role.name === data.recipientRoleName.trim(),
    );
    if (!template.is_sendable || !requestedRole) {
      throw new BadRequestException(
        'Select a sendable Verdocs template role for the recipient',
      );
    }
    if (actionableRoles.length !== 1) {
      throw new BadRequestException(
        'Phase 9 portal templates must contain exactly one signer or approver role',
      );
    }

    const expiresAt = this.expiration(data.expiresAt);
    const local = await this.prisma.eSignatureEnvelope.create({
      data: {
        clientRequestId: data.clientRequestId,
        templateId: data.templateId,
        documentType: data.documentType,
        targetType: data.targetType,
        title: data.title.trim(),
        tenantId: target.tenantId,
        agentId: target.agentId,
        leaseId: target.leaseId,
        propertyId: target.propertyId,
        recipientRoleName: data.recipientRoleName.trim(),
        recipientEmail: target.email,
        recipientFirstName: target.firstName,
        recipientLastName: target.lastName,
        createdByUserId: user.id,
        expiresAt,
      },
    });

    let providerEnvelope: IEnvelope;
    try {
      providerEnvelope = await this.verdocs.create({
        templateId: data.templateId,
        title: local.title,
        roleName: local.recipientRoleName,
        firstName: local.recipientFirstName,
        lastName: local.recipientLastName,
        email: local.recipientEmail,
        expiresAt: expiresAt.toISOString(),
        metadata: {
          johnson_realty_envelope_id: local.id,
          client_request_id: local.clientRequestId,
          document_type: local.documentType,
          target_type: local.targetType,
        },
      });
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.eSignatureEnvelope.update({
          where: { id: local.id },
          data: {
            status: ESignatureEnvelopeStatus.FAILED,
            failureReason: 'Provider envelope creation failed',
          },
        }),
        this.prisma.eSignatureEvent.create({
          data: {
            envelopeId: local.id,
            providerEventId: `local:create-failed:${randomUUID()}`,
            source: ESignatureEventSource.LOCAL,
            eventType: 'ENVELOPE_CREATE_FAILED',
            occurredAt: new Date(),
          },
        }),
        this.prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'ESIGNATURE_CREATE_FAILED',
            resource: 'e_signature_envelope',
            resourceId: local.id,
          },
        }),
      ]);
      throw error;
    }

    const recipient = providerEnvelope.recipients.find(
      (item) => item.role_name === local.recipientRoleName,
    );
    await this.prisma.$transaction([
      this.prisma.eSignatureEnvelope.update({
        where: { id: local.id },
        data: {
          providerEnvelopeId: providerEnvelope.id,
          providerStatus: providerEnvelope.status,
          status: this.providerStatus(providerEnvelope),
          recipientStatus: recipient?.status ?? null,
          sentAt: new Date(providerEnvelope.created_at),
          lastSyncedAt: new Date(),
        },
      }),
      this.prisma.eSignatureEvent.create({
        data: {
          envelopeId: local.id,
          providerEventId: `local:created:${randomUUID()}`,
          source: ESignatureEventSource.LOCAL,
          eventType: 'ENVELOPE_CREATED',
          actor: user.email,
          occurredAt: new Date(),
          payload: {
            provider: 'VERDOCS',
            providerEnvelopeId: providerEnvelope.id,
            templateId: data.templateId,
          },
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'ESIGNATURE_ENVELOPE_CREATED',
          resource: 'e_signature_envelope',
          resourceId: local.id,
          newValue: JSON.stringify({
            provider: 'VERDOCS',
            providerEnvelopeId: providerEnvelope.id,
            documentType: local.documentType,
            targetType: local.targetType,
          }),
        },
      }),
    ]);
    await this.recordProviderHistory(local.id, providerEnvelope);
    return this.getAdmin(user, local.id);
  }

  private expiration(value?: string) {
    const now = Date.now();
    const expiresAt = value
      ? new Date(value)
      : new Date(now + 30 * 24 * 60 * 60 * 1000);
    const minimum = now + 24 * 60 * 60 * 1000;
    const maximum = now + 365 * 24 * 60 * 60 * 1000;
    if (
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() < minimum ||
      expiresAt.getTime() > maximum
    ) {
      throw new BadRequestException(
        'Envelope expiration must be between 24 hours and 365 days',
      );
    }
    return expiresAt;
  }

  private async resolveTarget(
    data: CreateESignatureDto,
  ): Promise<ResolvedTarget> {
    if (data.targetType === ESignatureTargetType.AGENT) {
      if (data.documentType === ESignatureDocumentType.LEASE || data.leaseId) {
        throw new BadRequestException('Lease envelopes must target a tenant');
      }
      const agent = await this.prisma.agent.findFirst({
        where: {
          id: data.targetId,
          accountStatus: AgentAccountStatus.APPROVED,
        },
      });
      if (!agent) throw new BadRequestException('Approved agent not found');
      const names = this.names(agent.contactName);
      return {
        tenantId: null,
        agentId: agent.id,
        leaseId: null,
        propertyId: null,
        firstName: names.firstName,
        lastName: names.lastName,
        email: agent.email.trim().toLowerCase(),
      };
    }

    if (data.documentType === ESignatureDocumentType.LEASE) {
      if (!data.leaseId) {
        throw new BadRequestException(
          'A lease is required for a lease envelope',
        );
      }
      const lease = await this.prisma.lease.findFirst({
        where: { id: data.leaseId, tenantId: data.targetId },
        include: {
          tenant: true,
          unit: { select: { propertyId: true } },
        },
      });
      if (!lease) {
        throw new BadRequestException('Lease and tenant do not match');
      }
      return {
        tenantId: lease.tenantId,
        agentId: null,
        leaseId: lease.id,
        propertyId: lease.unit.propertyId,
        firstName: lease.tenant.firstName,
        lastName: lease.tenant.lastName,
        email: lease.tenant.email.trim().toLowerCase(),
      };
    }

    if (data.leaseId) {
      throw new BadRequestException(
        'Only lease envelopes may be linked to a lease',
      );
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: data.targetId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        unit: { select: { propertyId: true } },
      },
    });
    if (!tenant) throw new BadRequestException('Tenant not found');
    return {
      tenantId: tenant.id,
      agentId: null,
      leaseId: null,
      propertyId: tenant.unit?.propertyId ?? null,
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email.trim().toLowerCase(),
    };
  }

  private names(value: string) {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || 'Agent',
      lastName: parts.slice(1).join(' ') || 'Representative',
    };
  }

  private async targetForUser(
    userId: string,
    targetType: ESignatureTargetType,
  ) {
    if (targetType === ESignatureTargetType.TENANT) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!tenant) throw new NotFoundException('Tenant profile not found');
      return tenant;
    }
    const agent = await this.prisma.agent.findFirst({
      where: { userId, accountStatus: AgentAccountStatus.APPROVED },
      select: { id: true },
    });
    if (!agent) throw new NotFoundException('Approved agent profile not found');
    return agent;
  }

  async synchronizeAdmin(user: CurrentUser, id: string) {
    const local = await this.getAdmin(user, id);
    return this.synchronize(local.id, local.providerEnvelopeId);
  }

  private async synchronize(id: string, providerEnvelopeId: string | null) {
    if (!providerEnvelopeId) {
      throw new ConflictException('The provider envelope was not created');
    }
    const providerEnvelope = await this.verdocs.envelope(providerEnvelopeId);
    await this.applyProviderEnvelope(id, providerEnvelope);
    return this.prisma.eSignatureEnvelope.findUniqueOrThrow({
      where: { id },
      include: envelopeInclude,
    });
  }

  private providerStatus(envelope: IEnvelope) {
    if (envelope.signed) return ESignatureEnvelopeStatus.COMPLETED;
    switch (envelope.status) {
      case 'complete':
        return ESignatureEnvelopeStatus.FINALIZING;
      case 'in progress':
        return ESignatureEnvelopeStatus.IN_PROGRESS;
      case 'declined':
        return ESignatureEnvelopeStatus.DECLINED;
      case 'canceled':
        return ESignatureEnvelopeStatus.CANCELED;
      default:
        return ESignatureEnvelopeStatus.PENDING;
    }
  }

  private async applyProviderEnvelope(id: string, providerEnvelope: IEnvelope) {
    const current = await this.prisma.eSignatureEnvelope.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('E-signature envelope not found');
    if (current.providerEnvelopeId !== providerEnvelope.id) {
      throw new ConflictException('Provider envelope mismatch');
    }
    await this.recordProviderHistory(id, providerEnvelope);
    const providerStatus = this.providerStatus(providerEnvelope);

    let archivedAt = current.archivedAt;
    if (providerEnvelope.signed) {
      archivedAt = await this.archiveCompletedDocuments(
        current.id,
        providerEnvelope,
      );
    }

    const recipient = providerEnvelope.recipients.find(
      (item) => item.role_name === current.recipientRoleName,
    );
    const nextStatus =
      TERMINAL_STATUSES.includes(current.status) &&
      current.status !== ESignatureEnvelopeStatus.COMPLETED
        ? current.status
        : providerStatus;
    const changed =
      current.status !== nextStatus ||
      current.recipientStatus !== (recipient?.status ?? null) ||
      current.providerStatus !== providerEnvelope.status;
    const now = new Date();
    const completedAt = providerEnvelope.signed
      ? new Date(providerEnvelope.updated_at)
      : current.completedAt;
    const declinedAt =
      nextStatus === ESignatureEnvelopeStatus.DECLINED
        ? new Date(providerEnvelope.updated_at)
        : current.declinedAt;
    const canceledAt =
      nextStatus === ESignatureEnvelopeStatus.CANCELED
        ? new Date(providerEnvelope.canceled_at || providerEnvelope.updated_at)
        : current.canceledAt;
    const hasOpened =
      recipient &&
      ['opened', 'signed', 'submitted', 'complete'].includes(recipient.status);
    const openedAt = hasOpened
      ? (current.openedAt ?? new Date(recipient.updated_at ?? now))
      : current.openedAt;

    await this.prisma.$transaction(async (tx) => {
      await tx.eSignatureEnvelope.update({
        where: { id },
        data: {
          status: nextStatus,
          providerStatus: providerEnvelope.status,
          recipientStatus: recipient?.status ?? null,
          openedAt,
          completedAt,
          declinedAt,
          canceledAt,
          archivedAt,
          lastSyncedAt: now,
          failureReason: null,
        },
      });
      if (changed) {
        await tx.eSignatureEvent.create({
          data: {
            envelopeId: id,
            providerEventId: `local:status:${randomUUID()}`,
            source: ESignatureEventSource.LOCAL,
            eventType: 'STATUS_SYNCHRONIZED',
            occurredAt: now,
            payload: {
              previousStatus: current.status,
              status: nextStatus,
              providerStatus: providerEnvelope.status,
              recipientStatus: recipient?.status ?? null,
            },
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'ESIGNATURE_STATUS_CHANGED',
            resource: 'e_signature_envelope',
            resourceId: id,
            oldValue: JSON.stringify({ status: current.status }),
            newValue: JSON.stringify({ status: nextStatus }),
          },
        });
      }
    });
  }

  private async recordProviderHistory(id: string, envelope: IEnvelope) {
    const history = envelope.history_entries ?? [];
    if (!history.length) return;
    await this.prisma.eSignatureEvent.createMany({
      data: history.map((entry) => ({
        id: randomUUID(),
        envelopeId: id,
        providerEventId: `verdocs:history:${entry.id}`,
        source: ESignatureEventSource.VERDOCS,
        eventType: entry.event,
        actor: entry.role_name || null,
        occurredAt: new Date(entry.created_at),
        payload: {
          eventDetail: entry.event_detail,
          roleName: entry.role_name,
        },
      })),
      skipDuplicates: true,
    });
  }

  private storageClient() {
    const url = this.config.get<string>('SUPABASE_URL')?.trim();
    const secretKey = this.config.get<string>('SUPABASE_SECRET_KEY')?.trim();
    if (!url || !secretKey) {
      throw new InternalServerErrorException(
        'Supabase signed-document storage is not configured',
      );
    }
    return createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  private safeName(value: string) {
    return (
      value
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(-120) || 'signed-document.pdf'
    );
  }

  private async archiveCompletedDocuments(
    localEnvelopeId: string,
    envelope: IEnvelope,
  ) {
    const documents = (envelope.documents ?? []).filter(
      (document) => document.signed,
    );
    if (
      !documents.some((document) => document.type === 'attachment') ||
      !documents.some((document) => document.type === 'certificate')
    ) {
      throw new ServiceUnavailableException(
        'Verdocs has not finalized the signed documents and certificate',
      );
    }
    for (const document of documents) {
      await this.archiveOne(localEnvelopeId, document);
    }
    const archived = await this.prisma.eSignatureDocument.count({
      where: { envelopeId: localEnvelopeId },
    });
    if (archived < documents.length) {
      throw new ServiceUnavailableException(
        'The completed signing package could not be archived',
      );
    }
    return new Date();
  }

  private async archiveOne(
    localEnvelopeId: string,
    document: IEnvelopeDocument,
  ) {
    const existing = await this.prisma.eSignatureDocument.findUnique({
      where: {
        envelopeId_providerDocumentId: {
          envelopeId: localEnvelopeId,
          providerDocumentId: document.id,
        },
      },
    });
    if (existing) return existing;
    const body = await this.verdocs.downloadDocument(document.id);
    if (!body.length || body.length > 20 * 1024 * 1024) {
      throw new ServiceUnavailableException(
        'Completed document has an invalid file size',
      );
    }
    if (document.mime !== 'application/pdf') {
      throw new ServiceUnavailableException(
        'Completed Verdocs document is not a PDF',
      );
    }
    const sha256 = createHash('sha256').update(body).digest('hex');
    const storagePath = `${localEnvelopeId}/${document.id}-${this.safeName(document.name)}`;
    const storage = this.storageClient().storage.from(SIGNED_DOCUMENT_BUCKET);
    const { error } = await storage.upload(storagePath, body, {
      contentType: 'application/pdf',
      cacheControl: '0',
      upsert: false,
    });
    if (error) {
      const duplicate = /already exists|duplicate/i.test(error.message);
      if (!duplicate) {
        throw new ServiceUnavailableException(
          'Signed document storage is unavailable',
        );
      }
      const { data: stored, error: downloadError } =
        await storage.download(storagePath);
      if (downloadError || !stored) {
        throw new ServiceUnavailableException(
          'Stored signed document could not be verified',
        );
      }
      const storedHash = createHash('sha256')
        .update(Buffer.from(await stored.arrayBuffer()))
        .digest('hex');
      if (storedHash !== sha256) {
        throw new ConflictException(
          'Stored signed document integrity mismatch',
        );
      }
    }
    try {
      return await this.prisma.eSignatureDocument.create({
        data: {
          envelopeId: localEnvelopeId,
          providerDocumentId: document.id,
          documentType:
            document.type === 'certificate'
              ? ESignatureStoredDocumentType.CERTIFICATE
              : ESignatureStoredDocumentType.SIGNED_DOCUMENT,
          name: document.name,
          mime: document.mime,
          size: body.length,
          storagePath,
          sha256,
          providerCreatedAt: document.created_at
            ? new Date(document.created_at)
            : null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.eSignatureDocument.findUniqueOrThrow({
          where: {
            envelopeId_providerDocumentId: {
              envelopeId: localEnvelopeId,
              providerDocumentId: document.id,
            },
          },
        });
      }
      throw error;
    }
  }

  async signingSession(
    userId: string,
    targetType: ESignatureTargetType,
    id: string,
    actorEmail: string,
  ) {
    const local = await this.getMine(userId, targetType, id);
    if (
      !local.providerEnvelopeId ||
      TERMINAL_STATUSES.includes(local.status) ||
      local.status === ESignatureEnvelopeStatus.FAILED
    ) {
      throw new ConflictException('This envelope is not available for signing');
    }
    const providerEnvelope = await this.verdocs.envelope(
      local.providerEnvelopeId,
    );
    await this.applyProviderEnvelope(local.id, providerEnvelope);
    if (
      providerEnvelope.signed ||
      ['declined', 'canceled'].includes(providerEnvelope.status)
    ) {
      throw new ConflictException(
        'This envelope is no longer available for signing',
      );
    }
    const recipient = providerEnvelope.recipients.find(
      (item) =>
        item.role_name === local.recipientRoleName &&
        item.email.toLowerCase() === local.recipientEmail.toLowerCase(),
    );
    const inviteCode =
      recipient?.in_app_key ||
      providerEnvelope.access_keys?.find(
        (key) =>
          key.type === 'in_app' &&
          'recipient_name' in key &&
          key.recipient_name === local.recipientRoleName,
      )?.key;
    if (!recipient || !inviteCode) {
      throw new ServiceUnavailableException(
        'Verdocs could not start the embedded signing session',
      );
    }
    await this.prisma.$transaction([
      this.prisma.eSignatureEvent.create({
        data: {
          envelopeId: local.id,
          providerEventId: `local:signing-session:${randomUUID()}`,
          source: ESignatureEventSource.LOCAL,
          eventType: 'SIGNING_SESSION_ISSUED',
          actor: actorEmail,
          occurredAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'ESIGNATURE_SIGNING_SESSION_ISSUED',
          resource: 'e_signature_envelope',
          resourceId: local.id,
        },
      }),
    ]);
    return {
      envelopeId: providerEnvelope.id,
      roleName: local.recipientRoleName,
      inviteCode,
      expiresAt: local.expiresAt,
    };
  }

  async remind(user: CurrentUser, id: string) {
    const local = await this.getAdmin(user, id);
    if (
      !local.providerEnvelopeId ||
      TERMINAL_STATUSES.includes(local.status) ||
      local.status === ESignatureEnvelopeStatus.FAILED
    ) {
      throw new ConflictException('This envelope cannot receive a reminder');
    }
    await this.verdocs.remind(
      local.providerEnvelopeId,
      local.recipientRoleName,
    );
    await this.prisma.$transaction([
      this.prisma.eSignatureEvent.create({
        data: {
          envelopeId: id,
          providerEventId: `local:reminder:${randomUUID()}`,
          source: ESignatureEventSource.LOCAL,
          eventType: 'REMINDER_SENT',
          actor: user.email,
          occurredAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'ESIGNATURE_REMINDER_SENT',
          resource: 'e_signature_envelope',
          resourceId: id,
        },
      }),
    ]);
    return { sent: true };
  }

  async cancel(user: CurrentUser, id: string) {
    const local = await this.getAdmin(user, id);
    if (!local.providerEnvelopeId || TERMINAL_STATUSES.includes(local.status)) {
      throw new ConflictException('This envelope cannot be canceled');
    }
    await this.verdocs.cancel(local.providerEnvelopeId);
    const providerEnvelope = await this.verdocs.envelope(
      local.providerEnvelopeId,
    );
    await this.applyProviderEnvelope(local.id, providerEnvelope);
    await this.prisma.$transaction([
      this.prisma.eSignatureEvent.create({
        data: {
          envelopeId: id,
          providerEventId: `local:canceled:${randomUUID()}`,
          source: ESignatureEventSource.LOCAL,
          eventType: 'ENVELOPE_CANCELED_BY_ADMIN',
          actor: user.email,
          occurredAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'ESIGNATURE_ENVELOPE_CANCELED',
          resource: 'e_signature_envelope',
          resourceId: id,
        },
      }),
    ]);
    return this.getAdmin(user, id);
  }

  async documentUrlAdmin(
    user: CurrentUser,
    envelopeId: string,
    documentId: string,
  ) {
    await this.getAdmin(user, envelopeId);
    return this.documentUrl(envelopeId, documentId);
  }

  async documentUrlMine(
    userId: string,
    targetType: ESignatureTargetType,
    envelopeId: string,
    documentId: string,
  ) {
    await this.getMine(userId, targetType, envelopeId);
    return this.documentUrl(envelopeId, documentId);
  }

  private async documentUrl(envelopeId: string, documentId: string) {
    const document = await this.prisma.eSignatureDocument.findFirst({
      where: { id: documentId, envelopeId },
    });
    if (!document) throw new NotFoundException('Signed document not found');
    const { data, error } = await this.storageClient()
      .storage.from(SIGNED_DOCUMENT_BUCKET)
      .createSignedUrl(document.storagePath, 300, {
        download: this.safeName(document.name),
      });
    if (error || !data?.signedUrl) {
      throw new ServiceUnavailableException(
        'Signed document download is unavailable',
      );
    }
    return { url: data.signedUrl, expiresIn: 300, sha256: document.sha256 };
  }

  async handleWebhook(rawPayload: Buffer, signature?: string) {
    const secret = this.verdocs.webhookSecret();
    if (!secret) {
      throw new ServiceUnavailableException(
        'Verdocs webhook verification is not configured',
      );
    }
    if (!signature) {
      this.logger.warn('Verdocs webhook rejected: signature header missing');
      throw new UnauthorizedException('Missing Verdocs webhook signature');
    }
    let payload: VerdocsWebhookPayload;
    try {
      payload = JSON.parse(
        rawPayload.toString('utf8'),
      ) as VerdocsWebhookPayload;
    } catch {
      throw new BadRequestException('Invalid Verdocs webhook payload');
    }
    const bodyJson = JSON.stringify(payload.body ?? null);
    const received = signature.trim().replace(/^sha256=/i, '');
    const rawBody = rawJsonProperty(rawPayload, 'body');
    const signedPayloads = [
      bodyJson,
      rawPayload,
      ...(rawBody ? [rawBody] : []),
      ...(typeof payload.body === 'string' ? [payload.body] : []),
      canonicalJson(payload.body ?? null),
      JSON.stringify(payload),
    ];
    const candidates = signedPayloads.flatMap((value) => [
      createHmac('sha256', secret).update(value).digest('hex'),
      createHmac('sha256', secret).update(value).digest('base64'),
    ]);
    const verified = candidates.some((candidate) => {
      const expectedBuffer = Buffer.from(candidate);
      const receivedBuffer = Buffer.from(received);
      return (
        expectedBuffer.length === receivedBuffer.length &&
        timingSafeEqual(expectedBuffer, receivedBuffer)
      );
    });
    if (!verified) {
      this.logger.warn(
        `Verdocs webhook rejected: signature invalid (length ${received.length})`,
      );
      throw new UnauthorizedException('Invalid Verdocs webhook signature');
    }
    const eventType = payload.event ?? payload.event_name ?? payload.type;
    const providerEnvelopeId = this.providerEnvelopeId(payload.body, eventType);
    if (!eventType || !providerEnvelopeId) {
      return { received: true, verified: true, tracked: false };
    }
    const local = await this.prisma.eSignatureEnvelope.findUnique({
      where: { providerEnvelopeId },
    });
    if (!local) return { received: true, verified: true, tracked: false };
    const occurredAt = this.webhookDate(
      payload.created_at ?? payload.timestamp,
    );
    const digest = createHash('sha256')
      .update(`${eventType}:${bodyJson}`)
      .digest('hex');
    await this.prisma.eSignatureEvent.createMany({
      data: [
        {
          id: randomUUID(),
          envelopeId: local.id,
          providerEventId: `verdocs:webhook:${eventType}:${payload.id ?? digest}`,
          source: ESignatureEventSource.VERDOCS,
          eventType,
          occurredAt,
          ...(payload.body === undefined
            ? {}
            : { payload: payload.body as Prisma.InputJsonValue }),
        },
      ],
      skipDuplicates: true,
    });
    const providerEnvelope = await this.verdocs.envelope(providerEnvelopeId);
    await this.applyProviderEnvelope(local.id, providerEnvelope);
    if (eventType === 'envelope_expired') {
      await this.prisma.eSignatureEnvelope.updateMany({
        where: {
          id: local.id,
          status: { not: ESignatureEnvelopeStatus.COMPLETED },
        },
        data: {
          status: ESignatureEnvelopeStatus.EXPIRED,
          expiredAt: occurredAt,
        },
      });
    }
    return { received: true, verified: true, tracked: true };
  }

  private webhookDate(value?: string) {
    const date = value ? new Date(value) : new Date();
    return Number.isFinite(date.getTime()) ? date : new Date();
  }

  private providerEnvelopeId(body: unknown, eventType?: string): string | null {
    if (!body || typeof body !== 'object') return null;
    const value = body as Record<string, unknown>;
    const direct = value.envelope_id ?? value.envelopeId;
    if (typeof direct === 'string') return direct;
    if (value.envelope && typeof value.envelope === 'object') {
      const nested = (value.envelope as Record<string, unknown>).id;
      if (typeof nested === 'string') return nested;
    }
    if (eventType?.startsWith('envelope_') && typeof value.id === 'string') {
      return value.id;
    }
    return null;
  }
}
