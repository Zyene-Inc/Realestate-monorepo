import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { OpenRouterChatbotGateway } from './chatbot-ai.gateway';
import { CHATBOT_AI_GATEWAY } from './chatbot.constants';
import { ChatbotService } from './chatbot.service';
import {
  AdminWebsiteLeadsController,
  PublicWebsiteLeadsController,
} from './website-leads.controller';
import { WebsiteLeadsService } from './website-leads.service';

@Module({
  controllers: [
    ChatbotController,
    PublicWebsiteLeadsController,
    AdminWebsiteLeadsController,
  ],
  providers: [
    ChatbotService,
    WebsiteLeadsService,
    OpenRouterChatbotGateway,
    {
      provide: CHATBOT_AI_GATEWAY,
      useExisting: OpenRouterChatbotGateway,
    },
  ],
})
export class ChatbotModule {}
