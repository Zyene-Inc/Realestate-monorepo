import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import {
  createCorsOriginValidator,
  getAllowedFrontendOrigins,
} from './common/config/portal-urls';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  // Vercel terminates the public connection one hop before the Nest server.
  // Trust that hop so IP-based throttling tracks the caller, not the proxy.
  if (process.env.VERCEL) app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  });
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());

  const frontendOrigins = getAllowedFrontendOrigins(configService);
  app.enableCors({
    origin: createCorsOriginValidator(frontendOrigins),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port =
    process.env.PORT || configService.get<number>('BACKEND_PORT') || 3001;
  await app.listen(port);
  logger.log(
    `Application hardened and running on: http://localhost:${port}/api`,
  );
}
void bootstrap();
