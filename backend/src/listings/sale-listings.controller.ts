import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ListingStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSaleListingDto } from './dto/create-sale-listing.dto';
import {
  AttachListingAssetDto,
  CreateListingUploadDto,
} from './dto/listing-asset.dto';
import { RejectSaleListingDto } from './dto/reject-sale-listing.dto';
import { UpdateSaleListingDto } from './dto/update-sale-listing.dto';
import { SaleListingsService } from './sale-listings.service';

type AuthenticatedRequest = { user: { sub: string } };

@Controller('agent/listings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT)
export class AgentSaleListingsController {
  constructor(private readonly listings: SaleListingsService) {}

  @Get()
  list(@Request() request: AuthenticatedRequest) {
    return this.listings.listForAgent(request.user.sub);
  }

  @Post()
  create(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreateSaleListingDto,
  ) {
    return this.listings.createDraft(request.user.sub, body);
  }

  @Get(':id')
  get(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.listings.getForAgent(request.user.sub, id);
  }

  @Patch(':id')
  update(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateSaleListingDto,
  ) {
    return this.listings.updateDraft(request.user.sub, id, body);
  }

  @Post(':id/submit')
  submit(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.listings.submit(request.user.sub, id);
  }

  @Post(':id/upload-url')
  createUploadUrl(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateListingUploadDto,
  ) {
    return this.listings.createUploadUrl(request.user.sub, id, body);
  }

  @Post(':id/assets')
  attachAsset(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AttachListingAssetDto,
  ) {
    return this.listings.attachAsset(request.user.sub, id, body);
  }

  @Get(':id/documents/:index/url')
  documentUrl(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.listings.getAgentDocumentUrl(request.user.sub, id, index);
  }
}

@Controller('admin/sale-listings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.SALES_ADMIN)
export class AdminSaleListingsController {
  constructor(private readonly listings: SaleListingsService) {}

  @Get()
  list(
    @Query('status', new ParseEnumPipe(ListingStatus, { optional: true }))
    status?: ListingStatus,
  ) {
    return this.listings.listForReview(status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.listings.getForReview(id);
  }

  @Get(':id/audit-history')
  auditHistory(@Param('id') id: string) {
    return this.listings.getAuditHistory(id);
  }

  @Get(':id/documents/:index/url')
  documentUrl(
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.listings.getAdminDocumentUrl(id, index);
  }

  @Patch(':id/approve')
  approve(@Request() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.listings.approve(request.user.sub, id);
  }

  @Patch(':id/reject')
  reject(
    @Request() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: RejectSaleListingDto,
  ) {
    return this.listings.reject(request.user.sub, id, body.reason);
  }
}

@Controller('public/sale-listings')
export class PublicSaleListingsController {
  constructor(private readonly listings: SaleListingsService) {}

  @Get()
  list() {
    return this.listings.listPublic();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.listings.getPublic(id);
  }
}
