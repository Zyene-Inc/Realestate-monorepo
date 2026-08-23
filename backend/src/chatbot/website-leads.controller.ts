import { ConfigService } from '@nestjs/config';
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
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CursorPageDto } from '../messages/dto/listing-inquiry.dto';
import { CHATBOT_COOKIE_NAME } from './chatbot.constants';
import {
  CreateWebsiteLeadDto,
  UpdateWebsiteLeadStatusDto,
} from './dto/website-lead.dto';
import { WebsiteLeadsService } from './website-leads.service';

@Controller('public/chatbot/leads')
export class PublicWebsiteLeadsController {
  constructor(
    private readonly leads: WebsiteLeadsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  create(
    @Body() body: CreateWebsiteLeadDto,
    @Request() request: ExpressRequest,
  ) {
    return this.leads.createFromChatbot(
      body,
      request.cookies[CHATBOT_COOKIE_NAME] as string | undefined,
      {
        ipAddress: request.ip || 'unknown',
        userAgent: request.get('user-agent') || 'unknown',
      },
      this.config.get<string>('CHATBOT_FINGERPRINT_SECRET')?.trim(),
    );
  }
}

@Controller('admin/website-leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.SALES_ADMIN)
export class AdminWebsiteLeadsController {
  constructor(private readonly leads: WebsiteLeadsService) {}

  @Get()
  list(@Query() query: CursorPageDto) {
    return this.leads.listForAdmin(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.leads.getForAdmin(id);
  }

  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body() body: UpdateWebsiteLeadStatusDto) {
    return this.leads.updateStatus(id, body.status);
  }
}
