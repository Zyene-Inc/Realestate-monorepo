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
    expect(promptGuardDetectedAttack('0.12')).toBe(false);
    expect(promptGuardDetectedAttack('0.87')).toBe(true);
    expect(promptGuardDetectedAttack('prompt injection')).toBe(true);
    expect(promptGuardDetectedAttack('unrecognized output')).toBeUndefined();
  });

  it('streams a reply when Prompt Guard returns a probability score', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '0.02' } }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n',
                ),
              );
              controller.close();
            },
          }),
          { status: 200 },
        ),
      );
    const originalFetch = global.fetch;
    global.fetch = fetchMock as typeof fetch;

    try {
      const gateway = new GroqChatbotGateway(
        new ConfigService({
          CHATBOT_ENABLED: 'true',
          GROQ_API_KEY: 'gsk_test',
        }),
      );
      const generation = await gateway.generate({
        instructions: 'You are helpful.',
        messages: [{ role: 'user', content: 'hello' }],
        visitorId: 'visitor-1',
      });
      const text = await generation.completion.then((result) => result.text);

      expect(text).toBe('Hello');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const guardBody = JSON.parse(
        String(fetchMock.mock.calls[0]?.[1]?.body),
      ) as { model: string; messages: Array<{ role: string }> };
      expect(guardBody.model).toBe('meta-llama/llama-prompt-guard-2-86m');
      expect(guardBody.messages).toEqual([
        { role: 'user', content: 'hello' },
      ]);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
