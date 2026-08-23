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
import { RecordPaymentDto, UpdatePaymentStatusDto } from './dto/payment.dto';

type AuthenticatedRequest = { user: { sub: string } };

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
    @Request() req: AuthenticatedRequest,
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
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.updatePaymentStatus(id, data, req.user.sub);
  }

  @Get('overdue')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  async getOverdue() {
    return this.paymentsService.findOverdue();
  }

  @Get('my')
  @Roles(Role.TENANT)
  async getMyPayments(@Request() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.paymentsService.findByUser(userId);
  }
}
