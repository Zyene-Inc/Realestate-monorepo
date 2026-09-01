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
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  AdjustMoveInChargeDto,
  CreateMoveInChargesDto,
  ListMoveInChargesDto,
  RecordMoveInPaymentDto,
  StartMoveInCheckoutDto,
} from './dto/move-in-charge.dto';
import { MoveInChargesService } from './move-in-charges.service';
import { MoveInPaymentsService } from './move-in-payments.service';
import { MoveInCheckoutService } from './move-in-checkout.service';

@Controller('payments/move-in')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MoveInChargesController {
  constructor(
    private readonly charges: MoveInChargesService,
    private readonly payments: MoveInPaymentsService,
    private readonly checkoutService: MoveInCheckoutService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  findAll(@Query() query: ListMoveInChargesDto) {
    return this.charges.findAll(query);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  create(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() data: CreateMoveInChargesDto,
  ) {
    return this.charges.create(request.user.sub, data);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  adjust(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: AdjustMoveInChargeDto,
  ) {
    return this.charges.adjust(request.user.sub, id, data);
  }

  @Post('record')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  record(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() data: RecordMoveInPaymentDto,
  ) {
    return this.payments.recordManual(request.user.sub, data);
  }

  @Get('my')
  @Roles(Role.TENANT)
  findMine(@Request() request: RequiredAuthenticatedRequest) {
    return this.charges.findForUser(request.user.sub);
  }

  @Post('my/checkout')
  @Roles(Role.TENANT)
  checkout(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() data: StartMoveInCheckoutDto,
  ) {
    return this.checkoutService.start(request.user.sub, data);
  }
}
