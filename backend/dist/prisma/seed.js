"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.auditLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.maintenanceRequest.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.unit.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@coachjohnsonrealty.com',
            password: hashedPassword,
            role: client_1.Role.SUPER_ADMIN,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const neyansPlace = await prisma.property.create({
        data: {
            name: "Neyan's Place",
            address: '2411 E 10th St',
            city: 'Kansas City',
            state: 'MO',
            zip: '64127',
            propertyType: 'Multi-Family (Six-plex)',
            description: 'Quality neighborhood housing rooted in community investment. A historic redevelopment project.',
            status: 'active',
            photos: [],
            documents: [],
            amenities: ['Historic charm', 'Renovated'],
        },
    });
    const property = await prisma.property.create({
        data: {
            name: 'Oakwood Apartments',
            address: '123 Main St',
            city: 'Kansas City',
            state: 'MO',
            zip: '64101',
            propertyType: 'Apartment',
            description: 'Luxury apartments in the heart of downtown',
            status: 'active',
            photos: [],
            documents: [],
            amenities: ['Pool', 'Gym', 'Parking'],
        },
    });
    const unit = await prisma.unit.create({
        data: {
            propertyId: property.id,
            unitNumber: 'A1',
            floor: '1',
            bedrooms: 2,
            bathrooms: 2,
            squareFeet: 1000,
            rentAmount: 1200,
            depositAmount: 1200,
            status: 'occupied',
        },
    });
    const tenantUser = await prisma.user.create({
        data: {
            email: 'tenant@example.com',
            password: hashedPassword,
            role: client_1.Role.TENANT,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const tenant = await prisma.tenant.create({
        data: {
            userId: tenantUser.id,
            firstName: 'John',
            lastName: 'Doe',
            email: 'tenant@example.com',
            unitId: unit.id,
            status: 'active',
        },
    });
    const lease = await prisma.lease.create({
        data: {
            tenantId: tenant.id,
            unitId: unit.id,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            monthlyRent: 1200,
            securityDeposit: 1200,
            status: 'active',
        },
    });
    await prisma.payment.create({
        data: {
            tenantId: tenant.id,
            leaseId: lease.id,
            unitId: unit.id,
            rentAmount: 1200,
            lateFee: 0,
            totalAmount: 1200,
            paidAmount: 1200,
            balanceDue: 0,
            status: client_1.PaymentStatus.PAID,
            paidAt: new Date('2026-04-01'),
            dueDate: new Date('2026-04-01'),
            paymentMethod: 'Zelle',
            referenceNumber: 'REF123456',
        },
    });
    console.log('Seed data created successfully!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map