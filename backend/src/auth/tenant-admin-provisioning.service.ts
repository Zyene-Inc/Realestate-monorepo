import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { Role, UserStatus } from '@prisma/client';
import { getPortalUrls } from '../common/config/portal-urls';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAdminInviteDto } from './dto/tenant-admin-invite.dto';

@Injectable()
export class TenantAdminProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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

  async invite(data: TenantAdminInviteDto, superAdminId: string) {
    const email = data.email.trim().toLowerCase();
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const redirectTo = `${getPortalUrls(this.configService).rentalAdmin}/auth/reset-password`;
    const { data: invited, error } =
      await this.adminClient().auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo,
          data: { firstName, lastName },
        },
      });
    if (error || !invited.user || !invited.properties?.action_link) {
      throw new BadRequestException(
        error?.message || 'Unable to invite tenant administrator',
      );
    }

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            authUserId: invited.user.id,
            email,
            role: Role.TENANT_ADMIN,
            status: UserStatus.INVITED,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: superAdminId,
            action: 'TENANT_ADMIN_INVITED',
            resource: 'user',
            resourceId: user.id,
            newValue: JSON.stringify({ email, role: Role.TENANT_ADMIN }),
          },
        });
        return user;
      });
      await this.emails.sendTemplate(
        email,
        'rental_admin.invited',
        {
          name: `${firstName} ${lastName}`,
          url: invited.properties.action_link,
        },
        user.id,
      );
      return {
        success: true,
        message: 'Tenant administrator invitation sent',
        userId: user.id,
      };
    } catch (error) {
      await this.adminClient().auth.admin.deleteUser(invited.user.id);
      throw error;
    }
  }
}
