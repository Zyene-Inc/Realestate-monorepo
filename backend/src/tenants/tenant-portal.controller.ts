import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantsService } from './tenants.service';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';

@Controller('tenant/portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TENANT)
export class TenantPortalController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('dashboard')
  getDashboard(@Request() request: RequiredAuthenticatedRequest) {
    return this.tenantsService.getDashboardData(request.user.sub);
  }

  @Get('lease')
  getLease(@Request() request: RequiredAuthenticatedRequest) {
    return this.tenantsService.getActiveLease(request.user.sub);
  }
}
