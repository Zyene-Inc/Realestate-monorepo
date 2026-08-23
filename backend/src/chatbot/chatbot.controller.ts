import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Request,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest, Response } from 'express';
import { ChatbotService } from './chatbot.service';
import { CHATBOT_COOKIE_NAME } from './chatbot.constants';
import { SendChatMessageDto } from './dto/chat-message.dto';

@Controller('public/chatbot')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(private readonly chatbot: ChatbotService) {}

  @Get('status')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  status() {
    return this.chatbot.status();
  }

  @Get('history')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  history(@Request() request: ExpressRequest) {
    return this.chatbot.history(
      request.cookies[CHATBOT_COOKIE_NAME] as string | undefined,
    );
  }

  @Post('messages')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async message(
    @Body() body: SendChatMessageDto,
    @Request() request: ExpressRequest,
    @Res() response: Response,
  ) {
    const abortController = new AbortController();
    request.once('aborted', () => abortController.abort());
    const started = await this.chatbot.startReply({
      accessToken: request.cookies[CHATBOT_COOKIE_NAME] as string | undefined,
      message: body.message,
      fingerprint: {
        ipAddress: request.ip || 'unknown',
        userAgent: request.get('user-agent') || 'unknown',
      },
      abortSignal: abortController.signal,
    });

    response.cookie(CHATBOT_COOKIE_NAME, started.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/public/chatbot',
      expires: started.expiresAt,
    });
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    response.write(`event: ready\ndata: {}\n\n`);

    try {
      for await (const text of started.generation.textStream) {
        if (response.destroyed) break;
        response.write(`event: delta\ndata: ${JSON.stringify({ text })}\n\n`);
      }
      if (response.destroyed) return;
      const completion = await started.generation.completion;
      await this.chatbot.completeReply(started.conversationId, completion);
      response.write(`event: done\ndata: {}\n\n`);
    } catch (error) {
      await this.chatbot
        .recordFailure(started.conversationId, request.requestId)
        .catch((auditError: unknown) => {
          this.logger.error(
            `Could not audit chatbot failure for request ${request.requestId ?? 'unknown'}`,
            auditError instanceof Error ? auditError.stack : undefined,
          );
        });
      this.logger.warn(
        `Chatbot response failed for request ${request.requestId ?? 'unknown'}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      if (!response.destroyed) {
        response.write(
          `event: error\ndata: ${JSON.stringify({ message: 'The assistant is temporarily unavailable. Please try again or contact our team.' })}\n\n`,
        );
      }
    } finally {
      if (!response.destroyed && !response.writableEnded) response.end();
    }
  }
}
