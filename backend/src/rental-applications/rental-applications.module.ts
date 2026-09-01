import { Module } from '@nestjs/common';
import { ESignaturesModule } from '../e-signatures/e-signatures.module';
import { LeasesModule } from '../leases/leases.module';
import {
  AdminRentalApplicationsController,
  PublicRentalApplicationsController,
} from './rental-applications.controller';
import { RentalApplicationAdminService } from './rental-application-admin.service';
import { RentalApplicationDocumentsService } from './rental-application-documents.service';
import { RentalApplicationFeesService } from './rental-application-fees.service';
import { RentalApplicationHandoffService } from './rental-application-handoff.service';
import { RentalApplicationHandoffPreparationService } from './rental-application-handoff-preparation.service';
import { RentalApplicationsService } from './rental-applications.service';

@Module({
  imports: [LeasesModule, ESignaturesModule],
  controllers: [
    PublicRentalApplicationsController,
    AdminRentalApplicationsController,
  ],
  providers: [
    RentalApplicationsService,
    RentalApplicationDocumentsService,
    RentalApplicationAdminService,
    RentalApplicationFeesService,
    RentalApplicationHandoffService,
    RentalApplicationHandoffPreparationService,
  ],
  exports: [RentalApplicationFeesService],
})
export class RentalApplicationsModule {}
