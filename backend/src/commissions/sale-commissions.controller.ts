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
  CorrectSaleCommissionDto,
  CreateSaleCommissionDto,
  EligibleSaleListingQueryDto,
  SaleCommissionListQueryDto,
  SaleCommissionReportQueryDto,
  VoidSaleCommissionDto,
} from './dto/commission.dto';
import { SaleCommissionsService } from './sale-commissions.service';

type RequiredAuthenticatedRequest = { user: { sub: string } };

@Controller('admin/sale-commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.SALES_ADMIN)
export class SaleCommissionsController {
  constructor(private readonly commissions: SaleCommissionsService) {}

  @Get()
  list(@Query() query: SaleCommissionListQueryDto) {
    return this.commissions.list(query);
  }

  @Get('eligible-listings')
  eligibleListings(@Query() query: EligibleSaleListingQueryDto) {
    return this.commissions.eligibleListings(query);
  }

  @Get('report')
  report(@Query() query: SaleCommissionReportQueryDto) {
    return this.commissions.report(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.commissions.get(id);
  }

  @Post()
  create(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() body: CreateSaleCommissionDto,
  ) {
    return this.commissions.create(request.user.sub, body);
  }

  @Patch(':id/correct')
  correct(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CorrectSaleCommissionDto,
  ) {
    return this.commissions.correct(request.user.sub, id, body);
  }

  @Post(':id/void')
  void(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: VoidSaleCommissionDto,
  ) {
    return this.commissions.voidCommission(request.user.sub, id, body.reason);
  }
}
