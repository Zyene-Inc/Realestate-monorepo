import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CHATBOT_MODEL } from './chatbot.constants';

export type ChatbotModelMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatbotGeneration = {
  textStream: AsyncIterable<string>;
  completion: Promise<{
    text: string;
    finishReason: string;
    inputTokens?: number;
    outputTokens?: number;
  }>;
};

export interface ChatbotAiGateway {
  isEnabled(): boolean;
  generate(input: {
    instructions: string;
    messages: ChatbotModelMessage[];
    visitorId: string;
    abortSignal?: AbortSignal;
  }): Promise<ChatbotGeneration>;
}

@Injectable()
export class OpenRouterChatbotGateway implements ChatbotAiGateway {
  constructor(private readonly config: ConfigService) {}

  isEnabled() {
    return (
      this.config.get<string>('CHATBOT_ENABLED')?.trim().toLowerCase() ===
        'true' && Boolean(this.config.get<string>('OPENROUTER_API_KEY')?.trim())
    );
  }

  async generate(input: {
    instructions: string;
    messages: ChatbotModelMessage[];
    visitorId: string;
    abortSignal?: AbortSignal;
  }): Promise<ChatbotGeneration> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY')?.trim();
    if (!this.isEnabled() || !apiKey) {
      throw new Error('Public chatbot is not configured');
    }

    const [{ createOpenRouter }, { streamText }] = await Promise.all([
      import('@openrouter/ai-sdk-provider'),
      import('ai'),
    ]);
    const provider = createOpenRouter({
      apiKey,
      compatibility: 'strict',
      appName: 'Coach Johnson Realty Assistant',
      appUrl:
        this.config.get<string>('PUBLIC_SITE_URL')?.trim() ||
        'https://coachjohnsonrealty.com',
    });
    const result = streamText({
      model: provider(CHATBOT_MODEL, { user: input.visitorId }),
      instructions: input.instructions,
      messages: input.messages,
      maxOutputTokens: 500,
      maxRetries: 1,
      providerOptions: {
        openrouter: {
          reasoning: { exclude: true },
        },
      },
      timeout: { totalMs: 30_000, firstChunkMs: 12_000, chunkMs: 10_000 },
      abortSignal: input.abortSignal,
    });

    return {
      textStream: result.textStream,
      completion: Promise.all([
        Promise.resolve(result.text),
        Promise.resolve(result.finishReason),
        Promise.resolve(result.usage),
      ]).then(([text, finishReason, usage]) => ({
        text,
        finishReason,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      })),
    };
  }
}
