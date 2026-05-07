import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantPortalController } from './tenant-portal.controller';
import { TenantsService } from './tenants.service';

@Module({
  controllers: [TenantsController, TenantPortalController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
