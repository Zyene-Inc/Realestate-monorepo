import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import {
  AttachDepositProofDto,
  CompleteMoveOutInspectionDto,
  CreateDepositDeductionDto,
  CreateRenewalDto,
  CreateVacateNoticeDto,
  DepositProofUploadDto,
  IssueDepositReturnDto,
  LifecycleListQueryDto,
  LifecycleReasonDto,
  ScheduleMoveOutInspectionDto,
} from './dto/lease-lifecycle.dto';
import { LeaseLifecycleService } from './lease-lifecycle.service';
import { LeaseMoveOutService } from './lease-move-out.service';
import { LeaseDepositService } from './lease-deposit.service';
import { LeaseDepositProofService } from './lease-deposit-proof.service';
import { LeaseRenewalService } from './lease-renewal.service';

@Controller('admin/lease-lifecycle')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class AdminLeaseLifecycleController {
  constructor(
    private readonly lifecycle: LeaseLifecycleService,
    private readonly renewals: LeaseRenewalService,
    private readonly moveOut: LeaseMoveOutService,
    private readonly deposits: LeaseDepositService,
    private readonly depositProofs: LeaseDepositProofService,
  ) {}

  @Get()
  list(@Query() query: LifecycleListQueryDto) {
    return this.lifecycle.listAdmin(query);
  }

  @Post('leases/:leaseId/renewals')
  createRenewal(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('leaseId') leaseId: string,
    @Body() body: CreateRenewalDto,
  ) {
    return this.renewals.createRenewal(this.actor(request), leaseId, body);
  }

  @Post('renewals/:id/send')
  sendRenewal(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.renewals.sendRenewal(this.actor(request), id);
  }

  @Delete('renewals/:id')
  cancelRenewal(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.renewals.cancelRenewal(this.actor(request), id);
  }

  @Post('leases/:leaseId/vacate-notices')
  createNotice(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('leaseId') leaseId: string,
    @Body() body: CreateVacateNoticeDto,
  ) {
    return this.lifecycle.createAdminNotice(this.actor(request), leaseId, body);
  }

  @Post('notices/:id/acknowledge')
  acknowledgeNotice(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: ScheduleMoveOutInspectionDto,
  ) {
    return this.lifecycle.acknowledgeNotice(this.actor(request), id, body);
  }

  @Delete('notices/:id')
  cancelNotice(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.lifecycle.cancelNotice(this.actor(request), id);
  }

  @Post('inspections/:id/complete')
  completeInspection(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CompleteMoveOutInspectionDto,
  ) {
    return this.moveOut.completeInspection(this.actor(request), id, body);
  }

  @Post('deposits/:id/deductions')
  addDeduction(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateDepositDeductionDto,
  ) {
    return this.deposits.addDeduction(this.actor(request), id, body);
  }

  @Delete('deductions/:id')
  removeDeduction(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.deposits.removeDeduction(this.actor(request), id);
  }

  @Post('deposits/:id/finalize')
  finalize(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.deposits.finalize(this.actor(request), id);
  }

  @Post('deposits/:id/issue')
  issue(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: IssueDepositReturnDto,
  ) {
    return this.deposits.issue(this.actor(request), id, body);
  }

  @Post('deposits/:id/proof-upload')
  proofUpload(@Param('id') id: string, @Body() body: DepositProofUploadDto) {
    return this.depositProofs.createProofUpload(id, body);
  }

  @Post('deposits/:id/proof')
  attachProof(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AttachDepositProofDto,
  ) {
    return this.depositProofs.attachProof(this.actor(request), id, body);
  }

  @Get('deposits/:id/proof')
  proof(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.depositProofs.proofUrl(request.user.sub, request.user.role, id);
  }

  @Post('deposits/:id/returned')
  returned(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.deposits.markReturned(this.actor(request), id);
  }

  @Post('deposits/:id/resolve-dispute')
  resolveDispute(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: LifecycleReasonDto,
  ) {
    return this.deposits.resolveDispute(this.actor(request), id, body.reason);
  }

  private actor(request: RequiredAuthenticatedRequest) {
    return {
      id: request.user.sub,
      role: request.user.role,
      email: request.user.email,
    };
  }
}
