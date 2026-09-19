import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  AgentAnnouncementsController,
  AnnouncementsController,
  TenantAnnouncementsController,
} from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    AnnouncementsController,
    TenantAnnouncementsController,
    AgentAnnouncementsController,
  ],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
