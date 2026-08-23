import { Module } from '@nestjs/common';
import {
  AdminListingInquiriesController,
  AdminTenantMessagesController,
  AgentListingInquiriesController,
  PublicListingInquiriesController,
  TenantMessagesController,
} from './messages.controller';
import { MessagesService } from './messages.service';
import { ListingInquiriesService } from './listing-inquiries.service';

@Module({
  controllers: [
    TenantMessagesController,
    AdminTenantMessagesController,
    PublicListingInquiriesController,
    AgentListingInquiriesController,
    AdminListingInquiriesController,
  ],
  providers: [MessagesService, ListingInquiriesService],
})
export class MessagesModule {}
