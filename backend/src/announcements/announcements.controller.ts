import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';
import { AnnouncementsService } from './announcements.service';

@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.SALES_ADMIN)
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list(@Request() request: RequiredAuthenticatedRequest) {
    return this.announcements.listForAdmin(request.user.role);
  }

  @Post()
  create(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() body: CreateAnnouncementDto,
  ) {
    return this.announcements.create(request.user, body);
  }

  @Patch(':id')
  update(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateAnnouncementDto,
  ) {
    return this.announcements.update(request.user, id, body);
  }

  @Delete(':id')
  remove(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.announcements.remove(request.user, id);
  }
}

@Controller('tenant/portal/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TENANT)
export class TenantAnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list(@Request() request: RequiredAuthenticatedRequest) {
    return this.announcements.listForTenant(request.user.sub);
  }

  @Post(':id/acknowledge')
  acknowledge(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.announcements.acknowledgeTenant(request.user.sub, id);
  }
}

@Controller('agent/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT)
export class AgentAnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list(@Request() request: RequiredAuthenticatedRequest) {
    return this.announcements.listForAgent(request.user.sub);
  }

  @Post(':id/acknowledge')
  acknowledge(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.announcements.acknowledgeAgent(request.user.sub, id);
  }
}
