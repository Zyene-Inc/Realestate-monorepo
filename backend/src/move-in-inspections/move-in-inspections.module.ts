import { Module } from '@nestjs/common';
import { AdminMoveInInspectionsController } from './admin-move-in-inspections.controller';
import { MoveInInspectionPhotosService } from './move-in-inspection-photos.service';
import { MoveInInspectionRecordsService } from './move-in-inspection-records.service';
import { MoveInInspectionEmailsService } from './move-in-inspection-emails.service';
import { MoveInInspectionsService } from './move-in-inspections.service';
import { TenantMoveInInspectionsController } from './tenant-move-in-inspections.controller';

@Module({
  controllers: [
    AdminMoveInInspectionsController,
    TenantMoveInInspectionsController,
  ],
  providers: [
    MoveInInspectionsService,
    MoveInInspectionRecordsService,
    MoveInInspectionPhotosService,
    MoveInInspectionEmailsService,
  ],
})
export class MoveInInspectionsModule {}
