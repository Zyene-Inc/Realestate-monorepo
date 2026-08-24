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
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list() {
    return this.announcements.listForAdmin();
  }

  @Post()
  create(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() body: CreateAnnouncementDto,
  ) {
    return this.announcements.create(request.user.sub, body);
  }

  @Patch(':id')
  update(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateAnnouncementDto,
  ) {
    return this.announcements.update(request.user.sub, id, body);
  }

  @Delete(':id')
  remove(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.announcements.remove(request.user.sub, id);
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
}
