import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { AgentSignupDto } from './dto/agent-signup.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';

type AuthenticatedRequest = { user: { sub: string } };
type TenantInviteBody = {
  email: string;
  firstName: string;
  lastName: string;
  unitId: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('agent-signup')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  agentSignup(@Body() body: AgentSignupDto) {
    return this.authService.registerAgent(body);
  }

  @Post('password-reset-request')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  requestPasswordReset(@Body() body: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() request: AuthenticatedRequest) {
    return this.authService.getCurrentUser(request.user.sub);
  }

  @Post('invite')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  async invite(
    @Body() body: TenantInviteBody,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.authService.inviteTenant(body, request.user.sub);
  }
}
