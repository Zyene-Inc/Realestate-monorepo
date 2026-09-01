import { ConfigService } from '@nestjs/config';
import {
  GroqChatbotGateway,
  promptGuardDetectedAttack,
} from './chatbot-ai.gateway';

describe('GroqChatbotGateway', () => {
  it('requires both the explicit feature flag and server-only key', () => {
    expect(
      new GroqChatbotGateway(
        new ConfigService({
          CHATBOT_ENABLED: 'true',
          GROQ_API_KEY: 'gsk_test',
        }),
      ).isEnabled(),
    ).toBe(true);
    expect(
      new GroqChatbotGateway(
        new ConfigService({ CHATBOT_ENABLED: 'false' }),
      ).isEnabled(),
    ).toBe(false);
  });

  it('accepts explicit safe Prompt Guard JSON and blocks attack labels', () => {
    expect(promptGuardDetectedAttack('{"promptAttack":false}')).toBe(false);
    expect(promptGuardDetectedAttack('{"promptAttack":true}')).toBe(true);
    expect(promptGuardDetectedAttack('prompt injection')).toBe(true);
    expect(promptGuardDetectedAttack('unrecognized output')).toBeUndefined();
  });
});
