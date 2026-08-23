import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  AgentInquiryReplyDto,
  BuyerInquiryAccessDto,
  BuyerInquiryReplyDto,
  CreateListingInquiryDto,
  CursorPageDto,
  UpdateInquiryStatusDto,
} from './dto/listing-inquiry.dto';
import {
  buyerInquiryCookieName,
  ListingInquiriesService,
} from './listing-inquiries.service';
import {
  SendTenantMessageDto,
  TenantMessagePageDto,
} from './dto/tenant-message.dto';
import { MessagesService } from './messages.service';

type AuthenticatedRequest = { user: { sub: string } };

@Controller('tenant/portal/messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TENANT)
export class TenantMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  get(
    @Request() request: AuthenticatedRequest,
    @Query() query: TenantMessagePageDto,
  ) {
    return this.messages.getForTenant(request.user.sub, query);
  }

  @Post()
  send(
    @Request() request: AuthenticatedRequest,
    @Body() body: SendTenantMessageDto,
  ) {
    return this.messages.sendFromTenant(request.user.sub, body);
  }

  @Post('read')
  read(@Request() request: AuthenticatedRequest) {
    return this.messages.markReadForTenant(request.user.sub);
  }
}

@Controller('admin/messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class AdminTenantMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(@Query() query: TenantMessagePageDto) {
    return this.messages.listForAdmin(query);
  }

  @Get(':tenantId')
  get(
    @Param('tenantId') tenantId: string,
    @Query() query: TenantMessagePageDto,
  ) {
    return this.messages.getForAdmin(tenantId, query);
  }

  @Post(':tenantId')
  send(
    @Request() request: AuthenticatedRequest,
    @Param('tenantId') tenantId: string,
    @Body() body: SendTenantMessageDto,
  ) {
    return this.messages.sendFromAdmin(request.user.sub, tenantId, body);
  }

  @Post(':tenantId/read')
  read(
    @Request() request: AuthenticatedRequest,
    @Param('tenantId') tenantId: string,
  ) {
    return this.messages.markReadForAdmin(request.user.sub, tenantId);
  }
}

@Controller('public')
export class PublicListingInquiriesController {
  constructor(private readonly inquiries: ListingInquiriesService) {}

  @Post('sale-listings/:propertyId/inquiries')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async create(
    @Param('propertyId') propertyId: string,
    @Body() body: CreateListingInquiryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const created = await this.inquiries.create(propertyId, body);
    response.cookie(
      buyerInquiryCookieName(created.inquiry.id),
      created.accessToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: `/api/public/inquiries/${created.inquiry.id}`,
        expires: created.expiresAt,
      },
    );
    return { inquiry: created.inquiry, expiresAt: created.expiresAt };
  }

  @Post('inquiries/:id/access')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  access(
    @Param('id') id: string,
    @Body() body: BuyerInquiryAccessDto,
    @Request() request: ExpressRequest,
  ) {
    return this.inquiries.getForBuyer(
      id,
      request.cookies[buyerInquiryCookieName(id)] as string | undefined,
      body,
    );
  }

  @Post('inquiries/:id/messages')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  reply(
    @Param('id') id: string,
    @Body() body: BuyerInquiryReplyDto,
    @Request() request: ExpressRequest,
  ) {
    return this.inquiries.buyerReply(
      id,
      request.cookies[buyerInquiryCookieName(id)] as string | undefined,
      body.message,
    );
  }
}

@Controller('agent/inquiries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT)
export class AgentListingInquiriesController {
  constructor(private readonly inquiries: ListingInquiriesService) {}

  @Get()
  list(
    @Request() request: AuthenticatedRequest,
    @Query() query: CursorPageDto,
  ) {
    return this.inquiries.listForAgent(request.user.sub, query);
  }

  @Get(':id')
  get(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: CursorPageDto,
  ) {
    return this.inquiries.getForAgent(request.user.sub, id, query);
  }

  @Post(':id/read')
  read(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CursorPageDto,
  ) {
    return this.inquiries.markRead(request.user.sub, id, body);
  }

  @Post(':id/messages')
  reply(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AgentInquiryReplyDto,
  ) {
    return this.inquiries.agentReply(request.user.sub, id, body.message);
  }

  @Patch(':id/status')
  status(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateInquiryStatusDto,
  ) {
    return this.inquiries.updateStatus(request.user.sub, id, body.status);
  }
}

@Controller('admin/inquiries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.SALES_ADMIN)
export class AdminListingInquiriesController {
  constructor(private readonly inquiries: ListingInquiriesService) {}

  @Get()
  list(@Query() query: CursorPageDto) {
    return this.inquiries.listForOversight(query);
  }

  @Get(':id')
  get(@Param('id') id: string, @Query() query: CursorPageDto) {
    return this.inquiries.getForOversight(id, query);
  }
}
