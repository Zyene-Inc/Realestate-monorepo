import { ConfigService } from '@nestjs/config';
import type { ChatbotAiGateway, ChatbotGeneration } from './chatbot-ai.gateway';

export const completedGeneration: ChatbotGeneration = {
  textStream: (async function* () {
    await Promise.resolve();
    yield 'A helpful answer';
  })(),
  completion: Promise.resolve({
    text: 'A helpful answer',
    finishReason: 'stop',
    inputTokens: 120,
    outputTokens: 24,
  }),
};

export function createTestConfig(enabled = true) {
  return new ConfigService({
    CHATBOT_ENABLED: enabled ? 'true' : 'false',
    GROQ_API_KEY: enabled ? 'gsk-test-key' : '',
    CHATBOT_FINGERPRINT_SECRET:
      'chatbot-test-fingerprint-secret-with-more-than-32-characters',
    PUBLIC_SITE_URL: 'https://coachjohnsonrealty.com',
  });
}

export function createTestAi(enabled = true): ChatbotAiGateway {
  return {
    isEnabled: jest.fn().mockReturnValue(enabled),
    generate: jest.fn().mockResolvedValue(completedGeneration),
  };
}

export function firstArgument(mock: { mock: { calls: unknown[][] } }) {
  return mock.mock.calls[0]?.[0];
}

export function argumentAt(mock: { mock: { calls: unknown[][] } }, index: number) {
  return mock.mock.calls[index]?.[0];
}

export function transactionMock(tx: object) {
  return jest.fn((input: unknown) => {
    if (typeof input === 'function') {
      return Promise.resolve(
        (input as (transaction: typeof tx) => unknown)(tx),
      );
    }
    return Promise.all(input as Promise<unknown>[]);
  });
}
