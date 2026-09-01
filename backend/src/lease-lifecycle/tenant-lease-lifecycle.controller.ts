import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import {
  AcknowledgeMoveOutInspectionDto,
  CreateVacateNoticeDto,
  LifecycleReasonDto,
} from './dto/lease-lifecycle.dto';
import { LeaseLifecycleService } from './lease-lifecycle.service';
import { LeaseMoveOutService } from './lease-move-out.service';
import { LeaseDepositService } from './lease-deposit.service';
import { LeaseDepositProofService } from './lease-deposit-proof.service';

@Controller('tenant/lease-lifecycle')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TENANT)
export class TenantLeaseLifecycleController {
  constructor(
    private readonly lifecycle: LeaseLifecycleService,
    private readonly moveOut: LeaseMoveOutService,
    private readonly deposits: LeaseDepositService,
    private readonly depositProofs: LeaseDepositProofService,
  ) {}

  @Get()
  mine(@Request() request: RequiredAuthenticatedRequest) {
    return this.lifecycle.getMine(request.user.sub);
  }

  @Post('vacate-notices')
  createNotice(
    @Request() request: RequiredAuthenticatedRequest,
    @Body() body: CreateVacateNoticeDto,
  ) {
    return this.lifecycle.createTenantNotice(request.user.sub, body);
  }

  @Delete('vacate-notices/:id')
  cancelNotice(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.lifecycle.cancelTenantNotice(this.actor(request), id);
  }

  @Post('inspections/:id/acknowledge')
  acknowledge(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AcknowledgeMoveOutInspectionDto,
  ) {
    return this.moveOut.acknowledgeInspection(request.user.sub, id, body);
  }

  @Get('deposits/:id/proof')
  proof(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.depositProofs.proofUrl(request.user.sub, request.user.role, id);
  }

  @Post('deposits/:id/dispute')
  dispute(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: LifecycleReasonDto,
  ) {
    return this.deposits.dispute(request.user.sub, id, body.reason);
  }

  private actor(request: RequiredAuthenticatedRequest) {
    return {
      id: request.user.sub,
      role: request.user.role,
      email: request.user.email,
    };
  }
}
