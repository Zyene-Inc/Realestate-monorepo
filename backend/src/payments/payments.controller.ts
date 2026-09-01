import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  RecordPaymentDto,
  RefundStripePaymentDto,
  UpdatePaymentStatusDto,
} from './dto/payment.dto';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  async findAll() {
    return this.paymentsService.findAll();
  }

  @Post('record')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  async recordPayment(
    @Body() data: RecordPaymentDto,
    @Request() req: RequiredAuthenticatedRequest,
  ) {
    return this.paymentsService.recordPayment(
      {
        ...data,
        dueDate: new Date(data.dueDate),
      },
      req.user.sub,
    );
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdatePaymentStatusDto,
    @Request() req: RequiredAuthenticatedRequest,
  ) {
    return this.paymentsService.updatePaymentStatus(id, data, req.user.sub);
  }

  @Post(':id/stripe-refund')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  requestStripeRefund(
    @Param('id') id: string,
    @Body() data: RefundStripePaymentDto,
    @Request() req: RequiredAuthenticatedRequest,
  ) {
    return this.paymentsService.requestStripeRefund(id, data, req.user.sub);
  }

  @Get('overdue')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  async getOverdue() {
    return this.paymentsService.findOverdue();
  }

  @Get('my')
  @Roles(Role.TENANT)
  async getMyPayments(@Request() req: RequiredAuthenticatedRequest) {
    const userId = req.user.sub;
    return this.paymentsService.findByUser(userId);
  }

  @Get('my/:id')
  @Roles(Role.TENANT)
  async getMyPayment(
    @Param('id') id: string,
    @Request() req: RequiredAuthenticatedRequest,
  ) {
    return this.paymentsService.findOneForUser(req.user.sub, id);
  }

  @Post(':id/checkout')
  @Roles(Role.TENANT)
  startTenantCheckout(
    @Param('id') id: string,
    @Request() req: RequiredAuthenticatedRequest,
  ) {
    return this.paymentsService.startTenantCheckout(req.user.sub, id);
  }
}
