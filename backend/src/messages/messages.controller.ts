import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
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
  UpdateInquiryStatusDto,
} from './dto/listing-inquiry.dto';
import { ListingInquiriesService } from './listing-inquiries.service';

type AuthenticatedRequest = { user: { sub: string } };

@Controller('messages')
export class MessagesController {}

@Controller('public')
export class PublicListingInquiriesController {
  constructor(private readonly inquiries: ListingInquiriesService) {}

  @Post('sale-listings/:propertyId/inquiries')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  create(
    @Param('propertyId') propertyId: string,
    @Body() body: CreateListingInquiryDto,
  ) {
    return this.inquiries.create(propertyId, body);
  }

  @Post('inquiries/:id/access')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  access(@Param('id') id: string, @Body() body: BuyerInquiryAccessDto) {
    return this.inquiries.getForBuyer(id, body.accessToken);
  }

  @Post('inquiries/:id/messages')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  reply(@Param('id') id: string, @Body() body: BuyerInquiryReplyDto) {
    return this.inquiries.buyerReply(id, body.accessToken, body.message);
  }
}

@Controller('agent/inquiries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT)
export class AgentListingInquiriesController {
  constructor(private readonly inquiries: ListingInquiriesService) {}

  @Get()
  list(@Request() request: AuthenticatedRequest) {
    return this.inquiries.listForAgent(request.user.sub);
  }

  @Get(':id')
  get(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.inquiries.getForAgent(request.user.sub, id);
  }

  @Post(':id/read')
  read(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.inquiries.markRead(request.user.sub, id);
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
  list() {
    return this.inquiries.listForOversight();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.inquiries.getForOversight(id);
  }
}
