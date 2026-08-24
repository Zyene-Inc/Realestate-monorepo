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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { VendorsService } from './vendors.service';

@Controller('admin/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  list(@Query('query') query?: string) {
    return this.vendors.findAll(query);
  }

  @Post()
  create(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() body: CreateVendorDto,
  ) {
    return this.vendors.create(request.user.sub, body);
  }

  @Patch(':id')
  update(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateVendorDto,
  ) {
    return this.vendors.update(request.user.sub, id, body);
  }

  @Delete(':id')
  remove(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.vendors.remove(request.user.sub, id);
  }
}
