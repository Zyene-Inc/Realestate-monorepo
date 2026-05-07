import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { UnitsModule } from './units/units.module';
import { TenantsModule } from './tenants/tenants.module';
import { LeasesModule } from './leases/leases.module';
import { PaymentsModule } from './payments/payments.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { VendorsModule } from './vendors/vendors.module';
import { MessagesModule } from './messages/messages.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { EmailsModule } from './emails/emails.module';
import { StorageModule } from './storage/storage.module';
import { HealthController } from './health/health.controller';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    PrismaModule, 
    AuthModule, 
    PropertiesModule, 
    UnitsModule, 
    TenantsModule, 
    LeasesModule, 
    PaymentsModule, 
    MaintenanceModule, 
    VendorsModule, 
    MessagesModule, 
    AnnouncementsModule, 
    DocumentsModule, 
    NotificationsModule, 
    AuditLogsModule, 
    EmailsModule,
    StorageModule
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
