import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { GroqChatbotGateway } from './chatbot-ai.gateway';
import { CHATBOT_AI_GATEWAY } from './chatbot.constants';
import { ChatbotService } from './chatbot.service';
import {
  AdminWebsiteLeadsController,
  PublicWebsiteContactLeadsController,
  PublicWebsiteLeadsController,
} from './website-leads.controller';
import { WebsiteLeadsService } from './website-leads.service';
import { WebsiteLeadWorkflowService } from './website-lead-workflow.service';

@Module({
  controllers: [
    ChatbotController,
    PublicWebsiteLeadsController,
    PublicWebsiteContactLeadsController,
    AdminWebsiteLeadsController,
  ],
  providers: [
    ChatbotService,
    WebsiteLeadsService,
    WebsiteLeadWorkflowService,
    GroqChatbotGateway,
    {
      provide: CHATBOT_AI_GATEWAY,
      useExisting: GroqChatbotGateway,
    },
  ],
})
export class ChatbotModule {}
