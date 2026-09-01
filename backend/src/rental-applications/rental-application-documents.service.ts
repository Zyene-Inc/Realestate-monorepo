import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RentalApplicationStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AttachApplicationDocumentDto,
  CreateApplicationDocumentUploadDto,
} from './dto/rental-application.dto';
import { RentalApplicationsService } from './rental-applications.service';

const RENTAL_APPLICATION_DOCUMENT_BUCKET = 'rental-application-documents';
const MAX_DOCUMENTS = 12;

@Injectable()
export class RentalApplicationDocumentsService {
  private readonly logger = new Logger(RentalApplicationDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly applications: RentalApplicationsService,
  ) {}

  private storageClient() {
    const url = this.config.get<string>('SUPABASE_URL');
    const secretKey = this.config.get<string>('SUPABASE_SECRET_KEY');
    if (!url || !secretKey) {
      throw new InternalServerErrorException(
        'Private document storage is not configured',
      );
    }
    return createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  private assertEditable(status: RentalApplicationStatus) {
    if (
      status !== RentalApplicationStatus.DRAFT &&
      status !== RentalApplicationStatus.NEEDS_INFORMATION
    ) {
      throw new ConflictException(
        'Documents cannot be changed after submission',
      );
    }
  }

  private safeName(value: string) {
    return value
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(-120);
  }

  async createUploadUrl(
    id: string,
    token: string,
    data: CreateApplicationDocumentUploadDto,
  ) {
    const application = await this.applications.authenticate(id, token);
    this.assertEditable(application.status);
    if (application.documents.length >= MAX_DOCUMENTS) {
      throw new BadRequestException(
        `An application can have up to ${MAX_DOCUMENTS} documents`,
      );
    }
    const path = `applications/${id}/${data.type.toLowerCase()}/${randomUUID()}-${this.safeName(data.fileName)}`;
    const { data: signed, error } = await this.storageClient()
      .storage.from(RENTAL_APPLICATION_DOCUMENT_BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !signed) {
      throw new BadRequestException(
        error?.message || 'Unable to prepare document upload',
      );
    }
    return {
      bucket: RENTAL_APPLICATION_DOCUMENT_BUCKET,
      path: signed.path,
      token: signed.token,
      expiresIn: 7200,
    };
  }

  async attach(id: string, token: string, data: AttachApplicationDocumentDto) {
    const application = await this.applications.authenticate(id, token);
    this.assertEditable(application.status);
    if (application.documents.length >= MAX_DOCUMENTS) {
      throw new BadRequestException(
        `An application can have up to ${MAX_DOCUMENTS} documents`,
      );
    }
    const expectedPrefix = `applications/${id}/${data.type.toLowerCase()}/`;
    if (!data.path.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid application document path');
    }
    const slash = data.path.lastIndexOf('/');
    const directory = data.path.slice(0, slash);
    const fileName = data.path.slice(slash + 1);
    const storage = this.storageClient();
    const { data: objects, error } = await storage.storage
      .from(RENTAL_APPLICATION_DOCUMENT_BUCKET)
      .list(directory, { search: fileName, limit: 2 });
    const object = objects?.find((item) => item.name === fileName);
    if (error || !object) {
      throw new BadRequestException('Upload the document before attaching it');
    }
    const actualSize = Number(object.metadata?.size ?? data.sizeBytes);
    if (actualSize > 10 * 1024 * 1024) {
      await storage.storage
        .from(RENTAL_APPLICATION_DOCUMENT_BUCKET)
        .remove([data.path]);
      throw new BadRequestException('Document exceeds the 10 MB limit');
    }
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.rentalApplicationDocument.create({
        data: {
          applicationId: id,
          type: data.type,
          storagePath: data.path,
          originalFileName: this.safeName(data.fileName),
          contentType: data.contentType,
          sizeBytes: actualSize,
        },
      });
      await tx.rentalApplication.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          action: 'RENTAL_APPLICATION_DOCUMENT_ATTACHED',
          resource: 'rental_application',
          resourceId: id,
          newValue: JSON.stringify({
            documentId: document.id,
            type: document.type,
          }),
        },
      });
      return document;
    });
  }

  async createApplicantDownloadUrl(
    id: string,
    token: string,
    documentId: string,
  ) {
    await this.applications.authenticate(id, token);
    return this.createDownloadUrl(id, documentId);
  }

  async createDownloadUrl(id: string, documentId: string) {
    const document = await this.prisma.rentalApplicationDocument.findFirst({
      where: { id: documentId, applicationId: id },
    });
    if (!document)
      throw new NotFoundException('Application document not found');
    const { data, error } = await this.storageClient()
      .storage.from(RENTAL_APPLICATION_DOCUMENT_BUCKET)
      .createSignedUrl(document.storagePath, 300, {
        download: document.originalFileName,
      });
    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Unable to open document',
      );
    }
    return { url: data.signedUrl, expiresIn: 300 };
  }

  async remove(id: string, token: string, documentId: string) {
    const application = await this.applications.authenticate(id, token);
    this.assertEditable(application.status);
    const document = await this.prisma.rentalApplicationDocument.findFirst({
      where: { id: documentId, applicationId: id },
    });
    if (!document)
      throw new NotFoundException('Application document not found');
    await this.prisma.$transaction([
      this.prisma.rentalApplicationDocument.delete({
        where: { id: document.id },
      }),
      this.prisma.rentalApplication.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'RENTAL_APPLICATION_DOCUMENT_REMOVED',
          resource: 'rental_application',
          resourceId: id,
          oldValue: JSON.stringify({ documentId, type: document.type }),
        },
      }),
    ]);
    const { error } = await this.storageClient()
      .storage.from(RENTAL_APPLICATION_DOCUMENT_BUCKET)
      .remove([document.storagePath]);
    if (error) {
      this.logger.warn(`Application document cleanup failed: ${error.message}`);
    }
    return { id: documentId };
  }
}
