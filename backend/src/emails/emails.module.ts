import { Module, Global } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { ConfigModule } from '@nestjs/config';
import {
  AdminEmailsController,
  EmailRetryController,
  ResendWebhookController,
} from './emails.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [
    ResendWebhookController,
    EmailRetryController,
    AdminEmailsController,
  ],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
