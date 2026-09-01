import { ConfigService } from '@nestjs/config';
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
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import { CursorPageDto } from '../messages/dto/listing-inquiry.dto';
import { CHATBOT_COOKIE_NAME } from './chatbot.constants';
import {
  CreateWebsiteLeadNoteDto,
  CreateWebsiteContactLeadDto,
  CreateWebsiteLeadDto,
  UpdateWebsiteLeadWorkflowDto,
} from './dto/website-lead.dto';
import { WebsiteLeadsService } from './website-leads.service';
import { WebsiteLeadWorkflowService } from './website-lead-workflow.service';

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

@Controller('public/website-leads/contact')
export class PublicWebsiteContactLeadsController {
  constructor(
    private readonly leads: WebsiteLeadsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @Body() body: CreateWebsiteContactLeadDto,
    @Request() request: ExpressRequest,
  ) {
    return this.leads.createFromContact(
      body,
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
@Roles(Role.SUPER_ADMIN, Role.SALES_ADMIN, Role.TENANT_ADMIN)
export class AdminWebsiteLeadsController {
  constructor(
    private readonly leads: WebsiteLeadsService,
    private readonly workflow: WebsiteLeadWorkflowService,
  ) {}

  @Get()
  list(
    @Query() query: CursorPageDto,
    @Request() request: RequiredAuthenticatedRequest,
  ) {
    return this.leads.listForAdmin(query, request.user.role);
  }

  @Get('unread-count')
  unreadCount(@Request() request: RequiredAuthenticatedRequest) {
    return this.leads.getNewCount(request.user.role);
  }

  @Get(':id/assignees')
  assignees(
    @Param('id') id: string,
    @Request() request: RequiredAuthenticatedRequest,
  ) {
    return this.workflow.listAssignees(id, request.user.role);
  }

  @Get(':id/notes')
  notes(
    @Param('id') id: string,
    @Query() query: CursorPageDto,
    @Request() request: RequiredAuthenticatedRequest,
  ) {
    return this.workflow.listNotes(id, query, request.user.role);
  }

  @Post(':id/notes')
  createNote(
    @Param('id') id: string,
    @Body() body: CreateWebsiteLeadNoteDto,
    @Request() request: RequiredAuthenticatedRequest,
  ) {
    return this.workflow.createNote(
      id,
      body.body,
      request.user.sub,
      request.user.role,
    );
  }

  @Get(':id')
  get(
    @Param('id') id: string,
    @Request() request: RequiredAuthenticatedRequest,
  ) {
    return this.leads.getForAdmin(id, request.user.role);
  }

  @Patch(':id')
  updateWorkflow(
    @Param('id') id: string,
    @Body() body: UpdateWebsiteLeadWorkflowDto,
    @Request() request: RequiredAuthenticatedRequest,
  ) {
    return this.workflow.updateWorkflow(
      id,
      body,
      request.user.sub,
      request.user.role,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() request: RequiredAuthenticatedRequest,
  ) {
    return this.leads.deleteForAdmin(id, request.user.sub, request.user.role);
  }
}
