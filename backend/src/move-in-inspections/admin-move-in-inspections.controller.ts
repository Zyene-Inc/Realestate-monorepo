import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  AttachInspectionPhotoDto,
  CreateInspectionAreaDto,
  CreateInspectionItemDto,
  CreateInspectionKeyDto,
  CreateInspectionMeterDto,
  CreateMoveInInspectionDto,
  InspectionPhotoUploadDto,
  InspectionReasonDto,
  InspectionRevisionDto,
  ListMoveInInspectionsDto,
  UpdateInspectionAreaDto,
  UpdateInspectionItemDto,
  UpdateInspectionKeyDto,
  UpdateInspectionMeterDto,
  UpdateMoveInInspectionDto,
} from './dto/move-in-inspection.dto';
import { MoveInInspectionPhotosService } from './move-in-inspection-photos.service';
import { MoveInInspectionRecordsService } from './move-in-inspection-records.service';
import { MoveInInspectionsService } from './move-in-inspections.service';

@Controller('admin/move-in-inspections')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class AdminMoveInInspectionsController {
  constructor(
    private readonly inspections: MoveInInspectionsService,
    private readonly records: MoveInInspectionRecordsService,
    private readonly photos: MoveInInspectionPhotosService,
  ) {}

  @Get()
  list(@Query() query: ListMoveInInspectionsDto) {
    return this.inspections.list(query);
  }

  @Post()
  create(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() body: CreateMoveInInspectionDto,
  ) {
    return this.inspections.create(request.user.sub, body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.inspections.getForAdmin(id);
  }

  @Patch(':id')
  update(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateMoveInInspectionDto,
  ) {
    return this.inspections.update(request.user.sub, id, body);
  }

  @Post(':id/send-to-tenant')
  send(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: InspectionRevisionDto,
  ) {
    return this.inspections.sendToTenant(request.user.sub, id, body);
  }

  @Post(':id/reopen')
  reopen(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: InspectionReasonDto,
  ) {
    return this.inspections.reopen(request.user.sub, id, body);
  }

  @Post(':id/cancel')
  cancel(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: InspectionReasonDto,
  ) {
    return this.inspections.cancel(request.user.sub, id, body);
  }

  @Post(':id/areas')
  createArea(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateInspectionAreaDto,
  ) {
    return this.records.createArea(request.user.sub, id, body);
  }

  @Patch(':id/areas/:areaId')
  updateArea(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('areaId') areaId: string,
    @Body() body: UpdateInspectionAreaDto,
  ) {
    return this.records.updateArea(request.user.sub, id, areaId, body);
  }

  @Delete(':id/areas/:areaId')
  deleteArea(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('areaId') areaId: string,
    @Body() body: InspectionRevisionDto,
  ) {
    return this.records.deleteArea(request.user.sub, id, areaId, body);
  }

  @Post(':id/items')
  createItem(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateInspectionItemDto,
  ) {
    return this.records.createItem(request.user.sub, id, body);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateInspectionItemDto,
  ) {
    return this.records.updateItem(request.user.sub, id, itemId, body);
  }

  @Delete(':id/items/:itemId')
  deleteItem(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: InspectionRevisionDto,
  ) {
    return this.records.deleteItem(request.user.sub, id, itemId, body);
  }

  @Post(':id/meters')
  createMeter(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateInspectionMeterDto,
  ) {
    return this.records.createMeter(request.user.sub, id, body);
  }

  @Patch(':id/meters/:meterId')
  updateMeter(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('meterId') meterId: string,
    @Body() body: UpdateInspectionMeterDto,
  ) {
    return this.records.updateMeter(request.user.sub, id, meterId, body);
  }

  @Delete(':id/meters/:meterId')
  deleteMeter(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('meterId') meterId: string,
    @Body() body: InspectionRevisionDto,
  ) {
    return this.records.deleteMeter(request.user.sub, id, meterId, body);
  }

  @Post(':id/keys')
  createKey(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateInspectionKeyDto,
  ) {
    return this.records.createKey(request.user.sub, id, body);
  }

  @Patch(':id/keys/:keyId')
  updateKey(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('keyId') keyId: string,
    @Body() body: UpdateInspectionKeyDto,
  ) {
    return this.records.updateKey(request.user.sub, id, keyId, body);
  }

  @Delete(':id/keys/:keyId')
  deleteKey(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('keyId') keyId: string,
    @Body() body: InspectionRevisionDto,
  ) {
    return this.records.deleteKey(request.user.sub, id, keyId, body);
  }

  @Post(':id/photo-upload-url')
  photoUploadUrl(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: InspectionPhotoUploadDto,
  ) {
    return this.photos.createAdminUploadUrl(request.user.sub, id, body);
  }

  @Post(':id/photos')
  attachPhoto(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AttachInspectionPhotoDto,
  ) {
    return this.photos.attachForAdmin(request.user.sub, id, body);
  }

  @Get(':id/photos/:photoId/url')
  photoUrl(@Param('id') id: string, @Param('photoId') photoId: string) {
    return this.photos.downloadForAdmin(id, photoId);
  }

  @Delete(':id/photos/:photoId')
  deletePhoto(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Body() body: InspectionRevisionDto,
  ) {
    return this.photos.removeForAdmin(request.user.sub, id, photoId, body);
  }
}
