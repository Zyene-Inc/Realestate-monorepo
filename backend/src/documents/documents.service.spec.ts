import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { DocumentsService } from './documents.service';

const remove = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: { from: jest.fn(() => ({ remove })) },
  })),
}));

describe('DocumentsService', () => {
  beforeEach(() => jest.clearAllMocks());

  function serviceWith(prisma: object) {
    return new DocumentsService(
      prisma as never,
      new ConfigService({
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SECRET_KEY: 'service-key',
      }),
    );
  }

  it('limits residents to the document types they are authorized to upload', async () => {
    const prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }) },
      document: { count: jest.fn() },
    };

    await expect(
      serviceWith(prisma).createTenantUploadUrl(
        { id: 'tenant-user-1', role: Role.TENANT },
        {
          fileName: 'receipt.pdf',
          type: 'PAYMENT_RECEIPT',
          contentType: 'application/pdf',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.document.count).not.toHaveBeenCalled();
  });

  it('returns the committed deletion when best-effort storage cleanup fails', async () => {
    const document = {
      id: 'document-1',
      tenantId: 'tenant-1',
      type: 'OTHER',
      storagePath: 'tenants/tenant-1/document.pdf',
      uploadedByUserId: 'tenant-user-1',
    };
    const tx = {
      document: { delete: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }) },
      document: { findFirst: jest.fn().mockResolvedValue(document) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    remove.mockResolvedValue({ error: { message: 'Storage unavailable' } });

    await expect(
      serviceWith(prisma).removeForTenant(
        { id: 'tenant-user-1', role: Role.TENANT },
        'document-1',
      ),
    ).resolves.toEqual({ id: 'document-1' });
    expect(tx.document.delete).toHaveBeenCalledWith({
      where: { id: 'document-1' },
    });
    expect(remove).toHaveBeenCalledWith(['tenants/tenant-1/document.pdf']);
  });
});
