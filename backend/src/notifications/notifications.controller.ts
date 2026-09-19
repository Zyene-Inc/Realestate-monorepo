import {
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { RequiredAuthenticatedRequest } from '../auth/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Request() request: RequiredAuthenticatedRequest) {
    return this.notifications.list(request.user.sub);
  }

  @Post('read-all')
  markAllRead(@Request() request: RequiredAuthenticatedRequest) {
    return this.notifications.markAllRead(request.user.sub);
  }

  @Post(':id/read')
  markRead(
    @Request() request: RequiredAuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notifications.markRead(request.user.sub, id);
  }
}
