import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tenant/portal')
@UseGuards(JwtAuthGuard)
export class TenantPortalController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const userId = req.user.sub;
    return this.tenantsService.getDashboardData(userId);
  }

  @Get('maintenance')
  async getMaintenance(@Request() req: any) {
    const userId = req.user.sub;
    return this.tenantsService.getMaintenanceRequests(userId);
  }

  @Post('maintenance')
  async createMaintenance(@Request() req: any, @Body() data: any) {
    const userId = req.user.sub;
    return this.tenantsService.createMaintenanceRequest(userId, data);
  }

  @Get('lease')
  async getLease(@Request() req: any) {
    const userId = req.user.sub;
    return this.tenantsService.getActiveLease(userId);
  }
}
