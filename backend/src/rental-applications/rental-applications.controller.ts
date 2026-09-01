import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  AttachApplicationDocumentDto,
  CreateApplicationDocumentUploadDto,
  CreateRentalApplicationDto,
  CreateRentalApplicationNoteDto,
  ExchangeRentalApplicationSessionDto,
  ListRentalApplicationsDto,
  ReviewRentalApplicationDocumentDto,
  SubmitRentalApplicationDto,
  StartRentalApplicationHandoffDto,
  UpdateRentalApplicationDto,
  UpdateRentalApplicationWorkflowDto,
} from './dto/rental-application.dto';
import {
  decodeRentalApplicationCookie,
  encodeRentalApplicationCookie,
  RENTAL_APPLICATION_ACCESS_DAYS,
  RENTAL_APPLICATION_COOKIE,
} from './rental-application-access';
import { RentalApplicationAdminService } from './rental-application-admin.service';
import { RentalApplicationDocumentsService } from './rental-application-documents.service';
import { RentalApplicationFeesService } from './rental-application-fees.service';
import { RentalApplicationHandoffService } from './rental-application-handoff.service';
import { RentalApplicationsService } from './rental-applications.service';

function cookieValue(request: Request, name: string) {
  const raw = request.headers.cookie;
  if (!raw) return undefined;
  for (const pair of raw.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 1 || pair.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(pair.slice(separator + 1).trim());
  }
  return undefined;
}

function applicantAccess(request: Request, id: string) {
  const access = decodeRentalApplicationCookie(
    cookieValue(request, RENTAL_APPLICATION_COOKIE),
  );
  if (!access || access.id !== id) return '';
  return access.token;
}

function setApplicantCookie(
  response: Response,
  id: string,
  token: string,
  expiresAt: Date,
) {
  response.cookie(
    RENTAL_APPLICATION_COOKIE,
    encodeRentalApplicationCookie(id, token),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      maxAge: RENTAL_APPLICATION_ACCESS_DAYS * 24 * 60 * 60 * 1000,
    },
  );
}

@Controller('public/rental-applications')
export class PublicRentalApplicationsController {
  constructor(
    private readonly applications: RentalApplicationsService,
    private readonly documents: RentalApplicationDocumentsService,
    private readonly fees: RentalApplicationFeesService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 4, ttl: 60_000 } })
  async create(
    @Body() body: CreateRentalApplicationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.applications.create(body);
    setApplicantCookie(
      response,
      result.application.id,
      result.accessToken,
      result.expiresAt,
    );
    return { application: result.application };
  }

  @Post('session')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async exchangeSession(
    @Body() body: ExchangeRentalApplicationSessionDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const access = await this.applications.exchangeAccessLink(
      body.applicationId,
      body.accessToken,
    );
    setApplicantCookie(
      response,
      body.applicationId,
      access.token,
      access.expiresAt,
    );
    return { applicationId: body.applicationId };
  }

  @Get(':id')
  findOne(@Req() request: Request, @Param('id') id: string) {
    return this.applications.findApplicantApplication(
      id,
      applicantAccess(request, id),
    );
  }

  @Patch(':id')
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: UpdateRentalApplicationDto,
  ) {
    return this.applications.update(id, applicantAccess(request, id), body);
  }

  @Post(':id/document-upload-url')
  createDocumentUpload(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: CreateApplicationDocumentUploadDto,
  ) {
    return this.documents.createUploadUrl(
      id,
      applicantAccess(request, id),
      body,
    );
  }

  @Post(':id/documents')
  attachDocument(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: AttachApplicationDocumentDto,
  ) {
    return this.documents.attach(id, applicantAccess(request, id), body);
  }

  @Post(':id/documents/:documentId/download')
  applicantDocumentUrl(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documents.createApplicantDownloadUrl(
      id,
      applicantAccess(request, id),
      documentId,
    );
  }

  @Delete(':id/documents/:documentId')
  removeDocument(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documents.remove(id, applicantAccess(request, id), documentId);
  }

  @Post(':id/submit')
  async submit(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
    @Body() body: SubmitRentalApplicationDto,
  ) {
    const result = await this.applications.submit(
      id,
      applicantAccess(request, id),
      body,
    );
    setApplicantCookie(response, id, result.accessToken, result.expiresAt);
    return { application: result.application };
  }

  @Post(':id/fee-checkout')
  createFeeCheckout(@Req() request: Request, @Param('id') id: string) {
    return this.fees.createCheckout(id, applicantAccess(request, id));
  }

  @Post(':id/withdraw')
  withdraw(@Req() request: Request, @Param('id') id: string) {
    return this.applications.withdraw(id, applicantAccess(request, id));
  }
}

@Controller('admin/rental-applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
export class AdminRentalApplicationsController {
  constructor(
    private readonly applications: RentalApplicationAdminService,
    private readonly documents: RentalApplicationDocumentsService,
    private readonly handoffs: RentalApplicationHandoffService,
  ) {}

  @Get()
  list(@Query() query: ListRentalApplicationsDto) {
    return this.applications.list(query);
  }

  @Get('unread-count')
  unreadCount() {
    return this.applications.unreadCount();
  }

  @Get('assignees')
  assignees() {
    return this.applications.assignees();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applications.findOne(id);
  }

  @Get(':id/lease-handoff-options')
  handoffOptions(@Param('id') id: string) {
    return this.handoffs.options(id);
  }

  @Post(':id/lease-handoff')
  startHandoff(
    @Req() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: StartRentalApplicationHandoffDto,
  ) {
    return this.handoffs.start(
      {
        id: request.user.sub,
        email: request.user.email,
        role: request.user.role,
      },
      id,
      body,
    );
  }

  @Patch(':id/workflow')
  updateWorkflow(
    @Req() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateRentalApplicationWorkflowDto,
  ) {
    return this.applications.updateWorkflow(request.user.sub, id, body);
  }

  @Post(':id/documents/:documentId/download')
  documentUrl(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documents.createDownloadUrl(id, documentId);
  }

  @Patch(':id/documents/:documentId/review')
  reviewDocument(
    @Req() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() body: ReviewRentalApplicationDocumentDto,
  ) {
    return this.applications.reviewDocument(
      request.user.sub,
      id,
      documentId,
      body,
    );
  }

  @Post(':id/notes')
  addNote(
    @Req() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateRentalApplicationNoteDto,
  ) {
    return this.applications.addNote(request.user.sub, id, body);
  }
}
