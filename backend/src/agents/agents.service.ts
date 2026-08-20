import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentAccountStatus, Role, UserStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDocumentUploadDto } from './dto/agent-document.dto';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';

const AGENT_DOCUMENT_BUCKET = 'agent-documents';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailsService,
    private readonly config: ConfigService,
  ) {}

  private supabaseAdminClient() {
    const url = this.config.get<string>('SUPABASE_URL');
    const secretKey = this.config.get<string>('SUPABASE_SECRET_KEY');
    if (!url || !secretKey) {
      throw new InternalServerErrorException(
        'Supabase Storage is not configured',
      );
    }
    return createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  list(status?: AgentAccountStatus) {
    return this.prisma.agent.findMany({
      where: status ? { accountStatus: status } : undefined,
      include: {
        user: { select: { status: true, createdAt: true } },
        approvedBy: { select: { email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getForUser(userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
      include: { approvedBy: { select: { email: true } } },
    });
    if (!agent) throw new NotFoundException('Agent profile not found');
    return agent;
  }

  async updateProfile(userId: string, data: UpdateAgentProfileDto) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Add at least one profile field to update');
    }
    const current = await this.getForUser(userId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.agent.update({
        where: { id: current.id },
        data: {
          companyName: data.companyName?.trim(),
          contactName: data.contactName?.trim(),
          phone:
            data.phone === undefined ? undefined : data.phone.trim() || null,
        },
        include: { approvedBy: { select: { email: true } } },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'AGENT_PROFILE_UPDATED',
          resource: 'agent',
          resourceId: updated.id,
          oldValue: JSON.stringify({
            companyName: current.companyName,
            contactName: current.contactName,
            phone: current.phone,
          }),
          newValue: JSON.stringify({
            companyName: updated.companyName,
            contactName: updated.contactName,
            phone: updated.phone,
          }),
        },
      });
      return updated;
    });
  }

  async createDocumentUploadUrl(
    userId: string,
    data: CreateAgentDocumentUploadDto,
  ) {
    const agent = await this.getForUser(userId);
    if (agent.verificationDocuments.length >= 20) {
      throw new BadRequestException('Remove a document before uploading more');
    }
    const safeName = data.fileName
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(-120);
    const path = `${agent.id}/verification/${randomUUID()}-${safeName}`;
    const { data: signed, error } = await this.supabaseAdminClient()
      .storage.from(AGENT_DOCUMENT_BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !signed) {
      throw new BadRequestException(
        error?.message || 'Unable to prepare document upload',
      );
    }
    return {
      bucket: AGENT_DOCUMENT_BUCKET,
      path: signed.path,
      token: signed.token,
      expiresIn: 7200,
    };
  }

  async attachDocument(userId: string, path: string) {
    const agent = await this.getForUser(userId);
    if (!path.startsWith(`${agent.id}/verification/`)) {
      throw new BadRequestException('Invalid agent document path');
    }
    if (agent.verificationDocuments.includes(path)) return agent;
    if (agent.verificationDocuments.length >= 20) {
      throw new BadRequestException('Remove a document before attaching more');
    }
    const fileName = path.slice(path.lastIndexOf('/') + 1);
    const directory = path.slice(0, path.lastIndexOf('/'));
    const { data: objects, error } = await this.supabaseAdminClient()
      .storage.from(AGENT_DOCUMENT_BUCKET)
      .list(directory, { search: fileName, limit: 2 });
    if (error || !objects?.some((object) => object.name === fileName)) {
      throw new BadRequestException('Upload the file before attaching it');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.agent.update({
        where: { id: agent.id },
        data: {
          verificationDocuments: [...agent.verificationDocuments, path],
        },
        include: { approvedBy: { select: { email: true } } },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'AGENT_DOCUMENT_ATTACHED',
          resource: 'agent',
          resourceId: agent.id,
          newValue: JSON.stringify({ path }),
        },
      });
      return updated;
    });
  }

  async getAgentDocumentUrl(userId: string, index: number) {
    const agent = await this.getForUser(userId);
    return this.createDocumentUrl(agent.verificationDocuments, index);
  }

  async getReviewerDocumentUrl(agentId: string, index: number) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });
    if (!agent) throw new NotFoundException('Agent application not found');
    return this.createDocumentUrl(agent.verificationDocuments, index);
  }

  private async createDocumentUrl(documents: string[], index: number) {
    const path = documents[index];
    if (!path) throw new NotFoundException('Agent document not found');
    const { data, error } = await this.supabaseAdminClient()
      .storage.from(AGENT_DOCUMENT_BUCKET)
      .createSignedUrl(path, 300, { download: true });
    if (error || !data?.signedUrl) {
      throw new BadRequestException(
        error?.message || 'Unable to prepare document download',
      );
    }
    return { url: data.signedUrl, expiresIn: 300 };
  }

  async removeDocument(userId: string, index: number) {
    const agent = await this.getForUser(userId);
    const path = agent.verificationDocuments[index];
    if (!path) throw new NotFoundException('Agent document not found');
    const remaining = agent.verificationDocuments.filter(
      (_, documentIndex) => documentIndex !== index,
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.agent.update({
        where: { id: agent.id },
        data: { verificationDocuments: remaining },
        include: { approvedBy: { select: { email: true } } },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'AGENT_DOCUMENT_REMOVED',
          resource: 'agent',
          resourceId: agent.id,
          oldValue: JSON.stringify({ path }),
        },
      });
      return updated;
    });

    const { error } = await this.supabaseAdminClient()
      .storage.from(AGENT_DOCUMENT_BUCKET)
      .remove([path]);
    if (error) {
      this.logger.error(
        `Agent document database reference was removed, but Storage cleanup failed for ${path}: ${error.message}`,
      );
      throw new BadRequestException(error.message);
    }
    return updated;
  }

  async approve(agentId: string, reviewerId: string) {
    const current = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { user: { select: { authUserId: true } } },
    });
    if (!current) throw new NotFoundException('Agent application not found');
    if (current.accountStatus !== AgentAccountStatus.PENDING) {
      throw new BadRequestException(
        'Only pending agent applications can be approved',
      );
    }
    const { data: authUser, error: authError } =
      await this.supabaseAdminClient().auth.admin.getUserById(
        current.user.authUserId,
      );
    if (authError) {
      throw new InternalServerErrorException(
        'Unable to verify the agent email status',
      );
    }
    if (!authUser.user?.email_confirmed_at) {
      throw new BadRequestException(
        'The agent must verify their email before approval',
      );
    }

    const agent = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: current.userId },
        data: { status: UserStatus.ACTIVE },
      });
      const updated = await tx.agent.update({
        where: { id: agentId },
        data: {
          accountStatus: AgentAccountStatus.APPROVED,
          approvedAt: new Date(),
          approvedByUserId: reviewerId,
          declineReason: null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: 'AGENT_APPROVED',
          resource: 'agent',
          resourceId: updated.id,
          oldValue: JSON.stringify({ accountStatus: current.accountStatus }),
          newValue: JSON.stringify({ accountStatus: updated.accountStatus }),
        },
      });
      return updated;
    });
    await this.emails.sendAgentApproved(agent.email, agent.contactName);
    return agent;
  }

  async decline(agentId: string, reviewerId: string, reason: string) {
    const current = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });
    if (!current) throw new NotFoundException('Agent application not found');
    if (current.accountStatus !== AgentAccountStatus.PENDING) {
      throw new BadRequestException(
        'Only pending agent applications can be declined',
      );
    }

    const agent = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.agent.update({
        where: { id: agentId },
        data: {
          accountStatus: AgentAccountStatus.DECLINED,
          approvedAt: null,
          approvedByUserId: reviewerId,
          declineReason: reason,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: 'AGENT_DECLINED',
          resource: 'agent',
          resourceId: updated.id,
          oldValue: JSON.stringify({ accountStatus: current.accountStatus }),
          newValue: JSON.stringify({
            accountStatus: updated.accountStatus,
            reason,
          }),
        },
      });
      return updated;
    });
    await this.emails.sendAgentDeclined(agent.email, agent.contactName, reason);
    return agent;
  }

  async resubmit(userId: string) {
    const current = await this.getForUser(userId);
    if (current.accountStatus !== AgentAccountStatus.DECLINED) {
      throw new BadRequestException(
        'Only declined agent applications can be resubmitted',
      );
    }

    const agent = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.agent.updateMany({
        where: {
          id: current.id,
          accountStatus: AgentAccountStatus.DECLINED,
        },
        data: {
          accountStatus: AgentAccountStatus.PENDING,
          approvedAt: null,
          approvedByUserId: null,
          declineReason: null,
        },
      });
      if (transition.count !== 1) {
        throw new BadRequestException(
          'The agent application status changed; refresh and try again',
        );
      }
      const updated = await tx.agent.findUniqueOrThrow({
        where: { id: current.id },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'AGENT_RESUBMITTED',
          resource: 'agent',
          resourceId: updated.id,
          oldValue: JSON.stringify({
            accountStatus: current.accountStatus,
            declineReason: current.declineReason,
          }),
          newValue: JSON.stringify({
            accountStatus: updated.accountStatus,
          }),
        },
      });
      return updated;
    });

    const reviewers = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.SALES_ADMIN, Role.SUPER_ADMIN] },
        status: UserStatus.ACTIVE,
      },
      select: { email: true },
    });
    await Promise.all([
      this.emails.sendAgentResubmissionReceived(agent.email, agent.contactName),
      ...reviewers.map(({ email }) =>
        this.emails.sendAgentResubmittedForReview(
          email,
          agent.companyName,
          agent.contactName,
          agent.id,
        ),
      ),
    ]);
    return agent;
  }
}
