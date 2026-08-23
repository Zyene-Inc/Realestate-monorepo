import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { OpenRouterChatbotGateway } from './chatbot-ai.gateway';
import { CHATBOT_AI_GATEWAY } from './chatbot.constants';
import { ChatbotService } from './chatbot.service';

@Module({
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    OpenRouterChatbotGateway,
    {
      provide: CHATBOT_AI_GATEWAY,
      useExisting: OpenRouterChatbotGateway,
    },
  ],
})
export class ChatbotModule {}
