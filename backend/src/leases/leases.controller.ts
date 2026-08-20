import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LeasesService } from './leases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/leases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Post()
  create(@Body() createLeaseDto: any) {
    return this.leasesService.create(createLeaseDto);
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
  update(@Param('id') id: string, @Body() updateLeaseDto: any) {
    return this.leasesService.update(id, updateLeaseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leasesService.remove(id);
  }
}
