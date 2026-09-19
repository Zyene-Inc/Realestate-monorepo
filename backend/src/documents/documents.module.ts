import { Module } from '@nestjs/common';
import {
  AdminTenantDocumentsController,
  TenantDocumentsController,
} from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [TenantDocumentsController, AdminTenantDocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
