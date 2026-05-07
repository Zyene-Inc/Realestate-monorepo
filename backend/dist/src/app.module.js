"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const properties_module_1 = require("./properties/properties.module");
const units_module_1 = require("./units/units.module");
const tenants_module_1 = require("./tenants/tenants.module");
const leases_module_1 = require("./leases/leases.module");
const payments_module_1 = require("./payments/payments.module");
const maintenance_module_1 = require("./maintenance/maintenance.module");
const vendors_module_1 = require("./vendors/vendors.module");
const messages_module_1 = require("./messages/messages.module");
const announcements_module_1 = require("./announcements/announcements.module");
const documents_module_1 = require("./documents/documents.module");
const notifications_module_1 = require("./notifications/notifications.module");
const audit_logs_module_1 = require("./audit-logs/audit-logs.module");
const emails_module_1 = require("./emails/emails.module");
const storage_module_1 = require("./storage/storage.module");
const health_controller_1 = require("./health/health.controller");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60000,
                    limit: 10,
                }]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            properties_module_1.PropertiesModule,
            units_module_1.UnitsModule,
            tenants_module_1.TenantsModule,
            leases_module_1.LeasesModule,
            payments_module_1.PaymentsModule,
            maintenance_module_1.MaintenanceModule,
            vendors_module_1.VendorsModule,
            messages_module_1.MessagesModule,
            announcements_module_1.AnnouncementsModule,
            documents_module_1.DocumentsModule,
            notifications_module_1.NotificationsModule,
            audit_logs_module_1.AuditLogsModule,
            emails_module_1.EmailsModule,
            storage_module_1.StorageModule
        ],
        controllers: [app_controller_1.AppController, health_controller_1.HealthController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map