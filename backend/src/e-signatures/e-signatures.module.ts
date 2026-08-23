import { Module } from '@nestjs/common';
import {
  AdminESignaturesController,
  AgentESignaturesController,
  TenantESignaturesController,
  VerdocsWebhookController,
} from './e-signatures.controller';
import { ESignaturesService } from './e-signatures.service';
import { VerdocsService } from './verdocs.service';

@Module({
  controllers: [
    AdminESignaturesController,
    TenantESignaturesController,
    AgentESignaturesController,
    VerdocsWebhookController,
  ],
  providers: [ESignaturesService, VerdocsService],
})
export class ESignaturesModule {}
