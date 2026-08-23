import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  RawBody,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EmailsService } from './emails.service';

@Controller('webhooks/resend')
@SkipThrottle()
export class ResendWebhookController {
  constructor(private readonly emails: EmailsService) {}

  @Post()
  receive(
    @RawBody() body: Buffer | undefined,
    @Headers('svix-id') id?: string,
    @Headers('svix-timestamp') timestamp?: string,
    @Headers('svix-signature') signature?: string,
  ) {
    if (!body || !id || !timestamp || !signature) {
      throw new BadRequestException('Missing signed webhook payload');
    }
    return this.emails.handleWebhook(body.toString('utf8'), {
      id,
      timestamp,
      signature,
    });
  }
}

@Controller('internal/emails')
@SkipThrottle()
export class EmailRetryController {
  constructor(
    private readonly emails: EmailsService,
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

  @Get('retry')
  retry(@Headers('authorization') authorization?: string) {
    if (!this.authorized(authorization)) {
      throw new UnauthorizedException('Invalid cron authorization');
    }
    return this.emails.retryDue();
  }
}

@Controller('admin/emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminEmailsController {
  constructor(private readonly emails: EmailsService) {}

  @Get()
  list(
    @Query('cursor') cursor?: string,
    @Query('limit') rawLimit?: string,
    @Query('status') status?: string,
  ) {
    const limit = rawLimit ? Number(rawLimit) : undefined;
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw new BadRequestException('limit must be an integer');
    }
    return this.emails.list({ cursor, limit, status });
  }

  @Post(':id/retry')
  retry(@Param('id') id: string) {
    return this.emails.retryOne(id);
  }
}
