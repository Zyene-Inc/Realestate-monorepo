import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  RentalPropertyDto,
  UpdateRentalPropertyDto,
  AttachRentalPhotoDto,
  CreateRentalPhotoUploadDto,
} from './dto/rental-property.dto';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';

@Controller('admin/properties')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  create(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() createPropertyDto: RentalPropertyDto,
  ) {
    return this.propertiesService.create(request.user.sub, createPropertyDto);
  }

  @Get()
  findAll() {
    return this.propertiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdateRentalPropertyDto,
  ) {
    return this.propertiesService.update(
      request.user.sub,
      id,
      updatePropertyDto,
    );
  }

  @Post(':id/publish')
  publish(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.propertiesService.publish(request.user.sub, id);
  }

  @Post(':id/unpublish')
  unpublish(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.propertiesService.unpublish(request.user.sub, id);
  }

  @Post(':id/photo-upload-url')
  photoUploadUrl(
    @Param('id') id: string,
    @Body() body: CreateRentalPhotoUploadDto,
  ) {
    return this.propertiesService.createPhotoUploadUrl(id, body);
  }

  @Post(':id/photos')
  attachPhoto(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AttachRentalPhotoDto,
  ) {
    return this.propertiesService.attachPhoto(request.user.sub, id, body);
  }

  @Delete(':id')
  remove(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.propertiesService.remove(request.user.sub, id);
  }
}

@Controller('admin/rental-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class RentalDashboardController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  get() {
    return this.propertiesService.getRentalDashboard();
  }
}

@Controller('public/rental-properties')
export class PublicRentalPropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  findAll() {
    return this.propertiesService.findPublicRentals();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findPublicRental(id);
  }
}
