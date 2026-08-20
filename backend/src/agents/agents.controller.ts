import {
  Body,
  Controller,
  Delete,
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
import { AgentAccountStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AgentsService } from './agents.service';
import { DeclineAgentDto } from './dto/decline-agent.dto';
import {
  AttachAgentDocumentDto,
  CreateAgentDocumentUploadDto,
} from './dto/agent-document.dto';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';

type AuthenticatedRequest = { user: { sub: string } };

@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get('me')
  @Roles(Role.AGENT)
  getMe(@Request() request: AuthenticatedRequest) {
    return this.agentsService.getForUser(request.user.sub);
  }

  @Patch('me')
  @Roles(Role.AGENT)
  updateMe(
    @Request() request: AuthenticatedRequest,
    @Body() body: UpdateAgentProfileDto,
  ) {
    return this.agentsService.updateProfile(request.user.sub, body);
  }

  @Post('me/resubmit')
  @Roles(Role.AGENT)
  resubmit(@Request() request: AuthenticatedRequest) {
    return this.agentsService.resubmit(request.user.sub);
  }

  @Post('me/document-upload-url')
  @Roles(Role.AGENT)
  createDocumentUploadUrl(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreateAgentDocumentUploadDto,
  ) {
    return this.agentsService.createDocumentUploadUrl(request.user.sub, body);
  }

  @Post('me/documents')
  @Roles(Role.AGENT)
  attachDocument(
    @Request() request: AuthenticatedRequest,
    @Body() body: AttachAgentDocumentDto,
  ) {
    return this.agentsService.attachDocument(request.user.sub, body.path);
  }

  @Get('me/documents/:index/url')
  @Roles(Role.AGENT)
  getMyDocumentUrl(
    @Request() request: AuthenticatedRequest,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.agentsService.getAgentDocumentUrl(request.user.sub, index);
  }

  @Delete('me/documents/:index')
  @Roles(Role.AGENT)
  removeMyDocument(
    @Request() request: AuthenticatedRequest,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.agentsService.removeDocument(request.user.sub, index);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SALES_ADMIN)
  list(
    @Query('status', new ParseEnumPipe(AgentAccountStatus, { optional: true }))
    status?: AgentAccountStatus,
  ) {
    return this.agentsService.list(status);
  }

  @Get(':id/documents/:index/url')
  @Roles(Role.SUPER_ADMIN, Role.SALES_ADMIN)
  getDocumentUrl(
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.agentsService.getReviewerDocumentUrl(id, index);
  }

  @Patch(':id/approve')
  @Roles(Role.SUPER_ADMIN, Role.SALES_ADMIN)
  approve(@Param('id') id: string, @Request() request: AuthenticatedRequest) {
    return this.agentsService.approve(id, request.user.sub);
  }

  @Patch(':id/decline')
  @Roles(Role.SUPER_ADMIN, Role.SALES_ADMIN)
  decline(
    @Param('id') id: string,
    @Body() body: DeclineAgentDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.agentsService.decline(id, request.user.sub, body.reason);
  }
}
