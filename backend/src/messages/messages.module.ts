import { Module } from '@nestjs/common';
import {
  AdminListingInquiriesController,
  AgentListingInquiriesController,
  MessagesController,
  PublicListingInquiriesController,
} from './messages.controller';
import { MessagesService } from './messages.service';
import { ListingInquiriesService } from './listing-inquiries.service';

@Module({
  controllers: [
    MessagesController,
    PublicListingInquiriesController,
    AgentListingInquiriesController,
    AdminListingInquiriesController,
  ],
  providers: [MessagesService, ListingInquiriesService],
})
export class MessagesModule {}
