import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { PasswordSecurityService } from './password-security.service';
import { TenantAdminProvisioningService } from './tenant-admin-provisioning.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    PasswordSecurityService,
    TenantAdminProvisioningService,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
