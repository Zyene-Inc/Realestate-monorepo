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
  AcknowledgeMoveInInspectionDto,
  AttachInspectionPhotoDto,
  InspectionPhotoUploadDto,
  InspectionRevisionDto,
  TenantInspectionObservationDto,
} from './dto/move-in-inspection.dto';
import { MoveInInspectionPhotosService } from './move-in-inspection-photos.service';
import { MoveInInspectionsService } from './move-in-inspections.service';

@Controller('tenant/portal/move-in-inspection')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TENANT)
export class TenantMoveInInspectionsController {
  constructor(
    private readonly inspections: MoveInInspectionsService,
    private readonly photos: MoveInInspectionPhotosService,
  ) {}

  @Get()
  get(@Request() request: RequiredAuthenticatedRequest) {
    return this.inspections.getForTenant(request.user.sub);
  }

  @Patch(':id/items/:itemId')
  saveObservation(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: TenantInspectionObservationDto,
  ) {
    return this.inspections.saveTenantObservation(
      request.user.sub,
      id,
      itemId,
      body,
    );
  }

  @Post(':id/photo-upload-url')
  photoUploadUrl(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: InspectionPhotoUploadDto,
  ) {
    return this.photos.createTenantUploadUrl(request.user.sub, id, body);
  }

  @Post(':id/photos')
  attachPhoto(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AttachInspectionPhotoDto,
  ) {
    return this.photos.attachForTenant(request.user.sub, id, body);
  }

  @Get(':id/photos/:photoId/url')
  photoUrl(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.photos.downloadForTenant(request.user.sub, id, photoId);
  }

  @Delete(':id/photos/:photoId')
  deletePhoto(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Body() body: InspectionRevisionDto,
  ) {
    return this.photos.removeForTenant(request.user.sub, id, photoId, body);
  }

  @Post(':id/acknowledge')
  acknowledge(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AcknowledgeMoveInInspectionDto,
  ) {
    return this.inspections.acknowledge(request.user.sub, id, body);
  }
}
