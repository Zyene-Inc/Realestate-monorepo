import { PrismaClient, Role, UserStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
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

  // Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@coachjohnsonrealty.com',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // Neyan's Place - Featured Project
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

  // Demo Property
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

  // Demo Unit
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

  // Tenant User
  const tenantUser = await prisma.user.create({
    data: {
      email: 'tenant@example.com',
      password: hashedPassword,
      role: Role.TENANT,
      status: UserStatus.ACTIVE,
    },
  });

  // Tenant Profile
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

  // Lease
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

  // Payment
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
      status: PaymentStatus.PAID,
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
