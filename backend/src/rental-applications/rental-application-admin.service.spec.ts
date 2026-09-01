import { ConflictException } from '@nestjs/common';
import {
  RentalApplicationDocumentStatus,
  RentalApplicationDocumentType,
  RentalApplicationFeeStatus,
  RentalApplicationStatus,
} from '@prisma/client';
import { RentalApplicationAdminService } from './rental-application-admin.service';

function serviceWith(prisma: object) {
  return new RentalApplicationAdminService(
    prisma as never,
    { sendRentalApplicationStatus: jest.fn() } as never,
    { get: jest.fn() } as never,
  );
}

const reviewApplication = {
  id: 'application-1',
  status: RentalApplicationStatus.UNDER_REVIEW,
  feeStatus: RentalApplicationFeeStatus.PENDING,
  updatedAt: new Date('2026-08-24T12:00:00.000Z'),
  assignedToUserId: null,
  documents: [
    {
      type: RentalApplicationDocumentType.GOVERNMENT_ID,
      status: RentalApplicationDocumentStatus.ACCEPTED,
    },
    {
      type: RentalApplicationDocumentType.INCOME_PROOF,
      status: RentalApplicationDocumentStatus.ACCEPTED,
    },
  ],
  property: { name: 'Oakwood' },
};

describe('RentalApplicationAdminService', () => {
  it('blocks approval until a required application fee is paid', async () => {
    const prisma = {
      rentalApplication: {
        findUnique: jest.fn().mockResolvedValue(reviewApplication),
      },
    };

    await expect(
      serviceWith(prisma).updateWorkflow('admin-1', reviewApplication.id, {
        status: RentalApplicationStatus.APPROVED,
        expectedUpdatedAt: reviewApplication.updatedAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks approval until both required document categories are accepted', async () => {
    const prisma = {
      rentalApplication: {
        findUnique: jest.fn().mockResolvedValue({
          ...reviewApplication,
          feeStatus: RentalApplicationFeeStatus.PAID,
          documents: reviewApplication.documents.slice(0, 1),
        }),
      },
    };

    await expect(
      serviceWith(prisma).updateWorkflow('admin-1', reviewApplication.id, {
        status: RentalApplicationStatus.APPROVED,
        expectedUpdatedAt: reviewApplication.updatedAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
