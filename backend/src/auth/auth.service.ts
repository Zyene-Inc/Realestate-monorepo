import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import { ConfigService } from '@nestjs/config';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailsService: EmailsService,
    private configService: ConfigService,
    private auditLogs: AuditLogsService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    
    await this.auditLogs.log({
      action: 'LOGIN_FAILED',
      resource: 'user',
      resourceId: email,
    });
    
    return null;
  }

  async login(user: any) {
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { tenantProfile: true },
    });
    
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    await this.auditLogs.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'user',
      resourceId: user.id,
    });

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { 
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d' 
      }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        tenantProfile: fullUser?.tenantProfile || null,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      
      const newPayload = { email: payload.email, sub: payload.sub, role: payload.role };
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { tenantProfile: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        accessToken: this.jwtService.sign(newPayload),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          tenantProfile: user.tenantProfile || null,
        },
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async inviteTenant(data: { email: string; firstName: string; lastName: string; unitId: string }, adminId?: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpires = new Date();
    inviteTokenExpires.setDate(inviteTokenExpires.getDate() + 7); // 7 days expiry

    const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), this.BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: Role.TENANT,
        status: UserStatus.INVITED,
        inviteToken,
        inviteTokenExpires,
      } as any, // Cast to any until prisma is regenerated
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

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/tenant/accept-invite?token=${inviteToken}`;

    await this.emailsService.sendInvite(data.email, inviteLink);

    return { success: true, message: 'Invitation sent' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    // Always return success to avoid email enumeration
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${email}`);
      return { success: true, message: 'If an account exists with this email, a reset link has been sent.' };
    }

    const resetTokenPlain = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetTokenPlain).digest('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour expiry

    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        resetToken: resetTokenHash, 
        resetTokenExpires 
      } as any,
    });

    await this.auditLogs.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'user',
      resourceId: user.id,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetTokenPlain}`;

    await this.emailsService.sendPasswordReset(email, resetLink);

    return { success: true, message: 'If an account exists with this email, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPass: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpires: { gt: new Date() },
      } as any,
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPass, this.BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      } as any,
    });

    await this.auditLogs.log({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'user',
      resourceId: user.id,
    });

    return { success: true, message: 'Password has been successfully reset' };
  }
}
