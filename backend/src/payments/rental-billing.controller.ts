import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RentalBillingService } from './rental-billing.service';

@Controller('internal/rental-billing')
@SkipThrottle()
export class RentalBillingCronController {
  constructor(
    private readonly billing: RentalBillingService,
    private readonly config: ConfigService,
  ) {}

  private authorized(header?: string) {
    const secret = this.config.get<string>('CRON_SECRET')?.trim();
    if (!secret || !header) return false;
    const expected = Buffer.from(`Bearer ${secret}`);
    const received = Buffer.from(header);
    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  run(@Headers('authorization') authorization?: string) {
    if (!this.authorized(authorization)) {
      throw new UnauthorizedException('Invalid cron authorization');
    }
    return this.billing.runDailyBillingCycle();
  }
}

@Controller('payments/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@SkipThrottle()
export class RentalBillingAdminController {
  constructor(private readonly billing: RentalBillingService) {}

  @Post('run')
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  run(@Request() request: RequiredAuthenticatedRequest) {
    return this.billing.runDailyBillingCycle(request.user.sub);
  }
}
