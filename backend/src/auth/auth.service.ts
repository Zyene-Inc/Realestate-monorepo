import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { AgentAccountStatus, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailsService } from '../emails/emails.service';
import { AgentSignupDto } from './dto/agent-signup.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordSecurityService } from './password-security.service';
import {
  getPortalUrlForRole,
  getPortalUrls,
} from '../common/config/portal-urls';

const INVALID_LOGIN_MESSAGE = 'Incorrect email or password';
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_PROTECTION_WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogs: AuditLogsService,
    private readonly emails: EmailsService,
    private readonly passwordSecurity: PasswordSecurityService,
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

  private authenticationClient(clientIp?: string) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const secretKey = this.configService.get<string>('SUPABASE_SECRET_KEY');
    if (!url || !secretKey) {
      throw new InternalServerErrorException(
        'Supabase server credentials are not configured',
      );
    }

    const normalizedIp = clientIp
      ?.replace(/^::ffff:/, '')
      .trim()
      .slice(0, 64);
    const forwardedFor: Record<string, string> = {};
    if (normalizedIp && /^[0-9a-f:.]+$/i.test(normalizedIp)) {
      forwardedFor['Sb-Forwarded-For'] = normalizedIp;
    }

    return createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: forwardedFor },
    });
  }

  private invalidLogin(): never {
    throw new UnauthorizedException(INVALID_LOGIN_MESSAGE);
  }

  private roleCanUsePortal(role: Role, portal: LoginDto['portal']) {
    if (!portal) return true;
    if (portal === 'tenant') return role === Role.TENANT;
    if (portal === 'agent') return role === Role.AGENT;
    return (
      role === Role.SUPER_ADMIN ||
      role === Role.SALES_ADMIN ||
      role === Role.TENANT_ADMIN
    );
  }

  private async recordFailedLogin(userId: string, now: Date) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
        lastFailedLoginAt: now,
      },
      select: { failedLoginAttempts: true },
    });

    if (updated.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(now.getTime() + LOGIN_PROTECTION_WINDOW_MS),
        },
      });
    }
  }

  async login(data: LoginDto, clientIp?: string) {
    const email = data.email.trim().toLowerCase();
    const now = new Date();
    let user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        authUserId: true,
        role: true,
        status: true,
        failedLoginAttempts: true,
        lastFailedLoginAt: true,
        lockedUntil: true,
      },
    });

    const protectionExpired =
      user &&
      ((user.lockedUntil && user.lockedUntil <= now) ||
        (user.lastFailedLoginAt &&
          user.lastFailedLoginAt.getTime() <=
            now.getTime() - LOGIN_PROTECTION_WINDOW_MS));

    if (user && protectionExpired) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
          lockedUntil: null,
        },
        select: {
          id: true,
          authUserId: true,
          role: true,
          status: true,
          failedLoginAttempts: true,
          lastFailedLoginAt: true,
          lockedUntil: true,
        },
      });
    }

    if (
      user?.status === UserStatus.DISABLED ||
      (user?.lockedUntil && user.lockedUntil > now)
    ) {
      return this.invalidLogin();
    }

    const supabase = this.authenticationClient(clientIp);
    const { data: authentication, error } =
      await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });

    if (error || !authentication.session || !authentication.user) {
      if (user && (!error || error.code === 'invalid_credentials')) {
        await this.recordFailedLogin(user.id, now);
      }
      return this.invalidLogin();
    }

    if (!user || authentication.user.id !== user.authUserId) {
      await supabase.auth.signOut().catch(() => undefined);
      return this.invalidLogin();
    }

    if (!this.roleCanUsePortal(user.role, data.portal)) {
      await supabase.auth.signOut().catch(() => undefined);
      return this.invalidLogin();
    }

    if (
      user.failedLoginAttempts > 0 ||
      user.lastFailedLoginAt ||
      user.lockedUntil
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
          lockedUntil: null,
        },
      });
    }

    return {
      accessToken: authentication.session.access_token,
      refreshToken: authentication.session.refresh_token,
      expiresAt: authentication.session.expires_at ?? null,
    };
  }

  async registerAgent(data: AgentSignupDto) {
    const email = data.email.trim().toLowerCase();
    const companyName = data.companyName.trim();
    const contactName = data.contactName.trim();
    const phone = data.phone?.trim() || undefined;
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) return this.agentSignupResponse();
    await this.passwordSecurity.assertNotCompromised(data.password);

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
            company_name: companyName,
            contact_name: contactName,
          },
        },
      });
    if (error || !generated.user || !generated.properties?.action_link) {
      if (error?.message?.toLowerCase().includes('already')) {
        return this.agentSignupResponse();
      }
      throw new BadRequestException('Unable to submit agent application');
    }

    let applicationId: string;
    try {
      applicationId = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            authUserId: generated.user.id,
            email,
            role: Role.AGENT,
            status: UserStatus.ACTIVE,
            agentProfile: {
              create: {
                companyName,
                contactName,
                email,
                phone,
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
            newValue: JSON.stringify({ email, companyName }),
          },
        });
        return created.agentProfile!.id;
      });
    } catch (databaseError) {
      await this.adminClient().auth.admin.deleteUser(generated.user.id);
      throw databaseError;
    }

    await this.emails.sendAgentVerification(
      email,
      contactName,
      generated.properties.action_link,
      applicationId,
    );

    return this.agentSignupResponse();
  }

  private agentSignupResponse() {
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

  async updatePassword(userId: string, password: string) {
    await this.passwordSecurity.assertNotCompromised(password);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { authUserId: true },
    });
    if (!user) throw new BadRequestException('Application user not found');

    const { error } = await this.adminClient().auth.admin.updateUserById(
      user.authUserId,
      { password },
    );
    if (error) throw new BadRequestException('Unable to update password');

    await this.auditLogs.log({
      userId,
      action: 'PASSWORD_UPDATED',
      resource: 'user',
      resourceId: userId,
      newValue: { source: 'recovery' },
    });
    return { success: true };
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
    const email = data.email.trim().toLowerCase();
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser)
      throw new BadRequestException('User with this email already exists');

    const unit = await this.prisma.unit.findFirst({
      where: {
        id: data.unitId,
        property: { listingType: 'RENT' },
      },
      include: {
        tenants: {
          where: { status: { in: ['invited', 'active'] } },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!unit) throw new BadRequestException('Rental unit not found');
    if (unit.status !== 'vacant' || unit.tenants.length > 0) {
      throw new BadRequestException(
        'This unit is not available for a tenant invitation',
      );
    }

    const redirectTo = `${getPortalUrls(this.configService).tenant}/auth/reset-password`;
    const { data: invited, error } =
      await this.adminClient().auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo,
          data: { firstName, lastName },
        },
      });
    if (error || !invited.user || !invited.properties?.action_link)
      throw new BadRequestException(
        error?.message || 'Unable to invite tenant',
      );

    try {
      const tenant = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Unit" WHERE "id" = ${data.unitId} FOR UPDATE`;
        const availableUnit = await tx.unit.findUnique({
          where: { id: data.unitId },
          include: {
            tenants: {
              where: { status: { in: ['invited', 'active'] } },
              select: { id: true },
              take: 1,
            },
          },
        });
        if (
          !availableUnit ||
          availableUnit.status !== 'vacant' ||
          availableUnit.tenants.length > 0
        ) {
          throw new BadRequestException(
            'This unit is not available for a tenant invitation',
          );
        }
        const user = await tx.user.create({
          data: {
            authUserId: invited.user.id,
            email,
            role: Role.TENANT,
            status: UserStatus.INVITED,
          },
        });
        const tenant = await tx.tenant.create({
          data: {
            email,
            firstName,
            lastName,
            userId: user.id,
            unitId: data.unitId,
            status: 'invited',
          },
        });
        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: 'TENANT_INVITED',
            resource: 'tenant',
            resourceId: tenant.id,
            newValue: JSON.stringify({ email, unitId: data.unitId }),
          },
        });
        return tenant;
      });
      await this.emails.sendInvite(
        email,
        invited.properties.action_link,
        `${firstName} ${lastName}`,
        tenant.id,
      );
      return { success: true, message: 'Invitation sent' };
    } catch (error) {
      await this.adminClient().auth.admin.deleteUser(invited.user.id);
      throw error;
    }
  }
}
