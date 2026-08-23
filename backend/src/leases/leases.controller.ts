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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateLeaseDto, UpdateLeaseDto } from './dto/lease.dto';
import { LeasesService } from './leases.service';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';

@Controller('admin/leases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Post()
  create(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() body: CreateLeaseDto,
  ) {
    return this.leasesService.create(request.user.sub, body);
  }

  @Get()
  findAll() {
    return this.leasesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leasesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateLeaseDto,
  ) {
    return this.leasesService.update(request.user.sub, id, body);
  }

  @Delete(':id')
  remove(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.leasesService.remove(request.user.sub, id);
  }
}
