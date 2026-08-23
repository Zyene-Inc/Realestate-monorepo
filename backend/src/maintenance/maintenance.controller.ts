import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  AttachMaintenancePhotoDto,
  CreateMaintenanceRequestDto,
  MaintenanceListQueryDto,
  MaintenancePhotoUploadDto,
  UpdateMaintenanceRequestDto,
} from './dto/maintenance.dto';
import { MaintenanceService } from './maintenance.service';

type AuthenticatedRequest = { user: { sub: string } };

@Controller('admin/maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get()
  list(@Query() query: MaintenanceListQueryDto) {
    return this.maintenance.listForAdmin(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.maintenance.getForAdmin(id);
  }

  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateMaintenanceRequestDto,
  ) {
    return this.maintenance.update(request.user.sub, id, body);
  }
}

@Controller('tenant/portal/maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TENANT)
export class TenantMaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get()
  list(@Request() request: AuthenticatedRequest) {
    return this.maintenance.listForTenant(request.user.sub);
  }

  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreateMaintenanceRequestDto,
  ) {
    return this.maintenance.create(request.user.sub, body);
  }

  @Post(':id/photo-upload-url')
  photoUploadUrl(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: MaintenancePhotoUploadDto,
  ) {
    return this.maintenance.createPhotoUploadUrl(request.user.sub, id, body);
  }

  @Post(':id/photos')
  attachPhoto(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AttachMaintenancePhotoDto,
  ) {
    return this.maintenance.attachPhoto(request.user.sub, id, body);
  }

  @Patch(':id/confirm')
  confirm(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.maintenance.confirmCompletion(request.user.sub, id);
  }
}
