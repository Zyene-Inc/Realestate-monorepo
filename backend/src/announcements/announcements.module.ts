import { Module } from '@nestjs/common';
import {
  AnnouncementsController,
  TenantAnnouncementsController,
} from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  controllers: [AnnouncementsController, TenantAnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
