import { ConfigService } from '@nestjs/config';
import { OpenRouterChatbotGateway } from './chatbot-ai.gateway';

describe('OpenRouterChatbotGateway', () => {
  it('requires both the explicit feature flag and server-only key', () => {
    expect(
      new OpenRouterChatbotGateway(
        new ConfigService({
          CHATBOT_ENABLED: 'true',
          OPENROUTER_API_KEY: 'sk-or-v1-test',
        }),
      ).isEnabled(),
    ).toBe(true);
    expect(
      new OpenRouterChatbotGateway(
        new ConfigService({ CHATBOT_ENABLED: 'false' }),
      ).isEnabled(),
    ).toBe(false);
  });
});
