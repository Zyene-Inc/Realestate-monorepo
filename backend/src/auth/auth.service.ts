import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { AgentAccountStatus, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailsService } from '../emails/emails.service';
import { AgentSignupDto } from './dto/agent-signup.dto';
import {
  getPortalUrlForRole,
  getPortalUrls,
} from '../common/config/portal-urls';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogs: AuditLogsService,
    private readonly emails: EmailsService,
  ) {}

  private adminClient() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const secretKey = this.configService.get<string>('SUPABASE_SECRET_KEY');
    if (!url || !secretKey) {
      throw new InternalServerErrorException(
        'Supabase server credentials are not configured',
      );
    }
    return createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async registerAgent(data: AgentSignupDto) {
    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw new ConflictException('An account with this email already exists');

    const redirectTo = `${getPortalUrls(this.configService).agent}/agent/status`;
    const { data: generated, error } =
      await this.adminClient().auth.admin.generateLink({
        type: 'signup',
        email,
        password: data.password,
        options: {
          redirectTo,
          data: {
            account_type: 'agent',
            company_name: data.companyName,
            contact_name: data.contactName,
          },
        },
      });
    if (error || !generated.user || !generated.properties?.action_link) {
      if (error?.message?.toLowerCase().includes('already')) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw new BadRequestException(
        error?.message || 'Unable to create agent account',
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            authUserId: generated.user.id,
            email,
            role: Role.AGENT,
            status: UserStatus.ACTIVE,
            agentProfile: {
              create: {
                companyName: data.companyName,
                contactName: data.contactName,
                email,
                phone: data.phone,
                accountStatus: AgentAccountStatus.PENDING,
              },
            },
          },
          include: { agentProfile: true },
        });
        await tx.auditLog.create({
          data: {
            userId: created.id,
            action: 'AGENT_REGISTERED',
            resource: 'agent',
            resourceId: created.agentProfile?.id,
            newValue: JSON.stringify({ email, companyName: data.companyName }),
          },
        });
        return created;
      });
    } catch (databaseError) {
      await this.adminClient().auth.admin.deleteUser(generated.user.id);
      throw databaseError;
    }

    await this.emails.sendAgentVerification(
      email,
      data.contactName,
      generated.properties.action_link,
    );

    return {
      success: true,
      message:
        'Check your email to verify your address. Your application will then be reviewed by Johnson Realty.',
    };
  }

  async getCurrentUser(id: string) {
    let user = await this.prisma.user.findUnique({
      where: { id },
      include: { tenantProfile: true, agentProfile: true },
    });
    if (!user) throw new BadRequestException('Application user not found');

    if (user.status === UserStatus.INVITED) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE },
        include: { tenantProfile: true, agentProfile: true },
      });
      if (user.tenantProfile) {
        await this.prisma.tenant.update({
          where: { id: user.tenantProfile.id },
          data: { status: 'active' },
        });
      }
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantProfile: user.tenantProfile,
      agentProfile: user.agentProfile,
    };
  }

  async requestPasswordReset(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { role: true },
    });
    const redirectTo = `${getPortalUrlForRole(this.configService, user?.role)}/auth/reset-password`;
    const { data, error } = await this.adminClient().auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    if (!error && data.properties?.action_link) {
      await this.emails.sendPasswordReset(email, data.properties.action_link);
    }

    return {
      success: true,
      message: 'If an account exists, a password reset link has been sent.',
    };
  }

  async inviteTenant(
    data: {
      email: string;
      firstName: string;
      lastName: string;
      unitId: string;
    },
    adminId?: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser)
      throw new BadRequestException('User with this email already exists');

    const redirectTo = `${getPortalUrls(this.configService).tenant}/auth/reset-password`;
    const { data: invited, error } =
      await this.adminClient().auth.admin.generateLink({
        type: 'invite',
        email: data.email,
        options: {
          redirectTo,
          data: { firstName: data.firstName, lastName: data.lastName },
        },
      });
    if (error || !invited.user || !invited.properties?.action_link)
      throw new BadRequestException(
        error?.message || 'Unable to invite tenant',
      );

    try {
      const user = await this.prisma.user.create({
        data: {
          authUserId: invited.user.id,
          email: data.email,
          role: Role.TENANT,
          status: UserStatus.INVITED,
        },
      });
      const tenant = await this.prisma.tenant.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          userId: user.id,
          unitId: data.unitId,
          status: 'invited',
        },
      });
      await this.auditLogs.log({
        userId: adminId,
        action: 'TENANT_INVITED',
        resource: 'tenant',
        resourceId: tenant.id,
        newValue: JSON.stringify({ email: data.email, unitId: data.unitId }),
      });
      await this.emails.sendInvite(data.email, invited.properties.action_link);
      return { success: true, message: 'Invitation sent' };
    } catch (error) {
      await this.adminClient().auth.admin.deleteUser(invited.user.id);
      throw error;
    }
  }
}
