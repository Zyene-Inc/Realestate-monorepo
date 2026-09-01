import { Module } from '@nestjs/common';
import {
  AdminESignaturesController,
  AgentESignaturesController,
  TenantESignaturesController,
  VerdocsWebhookController,
} from './e-signatures.controller';
import { ESignaturesService } from './e-signatures.service';
import { ESignatureRentalLifecycleService } from './e-signature-rental-lifecycle.service';
import { VerdocsService } from './verdocs.service';

@Module({
  controllers: [
    AdminESignaturesController,
    TenantESignaturesController,
    AgentESignaturesController,
    VerdocsWebhookController,
  ],
  providers: [
    ESignaturesService,
    ESignatureRentalLifecycleService,
    VerdocsService,
  ],
  exports: [ESignaturesService, VerdocsService],
})
export class ESignaturesModule {}
