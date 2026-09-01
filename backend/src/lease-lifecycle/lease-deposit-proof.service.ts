import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, SecurityDepositDispositionStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AttachDepositProofDto,
  DepositProofUploadDto,
} from './dto/lease-lifecycle.dto';
import {
  LeaseLifecycleService,
  type LifecycleActor,
} from './lease-lifecycle.service';

const BUCKET = 'move-out-documents';
const PROOF_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

@Injectable()
export class LeaseDepositProofService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly lifecycle: LeaseLifecycleService,
  ) {}

  async createProofUpload(id: string, data: DepositProofUploadDto) {
    if (!PROOF_TYPES.includes(data.contentType))
      throw new BadRequestException(
        'Upload a PDF, JPEG, PNG, or WebP proof file',
      );
    const disposition = await this.prisma.securityDepositDisposition.findUnique(
      { where: { id } },
    );
    if (!disposition)
      throw new NotFoundException('Security deposit disposition not found');
    if (disposition.status !== SecurityDepositDispositionStatus.ISSUED)
      throw new ConflictException(
        'Issue the deposit return before attaching proof',
      );
    const path = `dispositions/${id}/${randomUUID()}-${this.safeName(data.fileName)}`;
    const { data: signed, error } = await this.storage()
      .storage.from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !signed)
      throw new BadRequestException(
        error?.message || 'Unable to prepare proof upload',
      );
    return {
      bucket: BUCKET,
      path: signed.path,
      token: signed.token,
      expiresIn: 7200,
    };
  }

  async attachProof(
    actor: LifecycleActor,
    id: string,
    data: AttachDepositProofDto,
  ) {
    if (!PROOF_TYPES.includes(data.contentType)) {
      throw new BadRequestException(
        'Upload a PDF, JPEG, PNG, or WebP proof file',
      );
    }
    if (!data.path.startsWith(`dispositions/${id}/`))
      throw new BadRequestException('Invalid deposit proof path');
    const current = await this.prisma.securityDepositDisposition.findUnique({
      where: { id },
    });
    if (!current)
      throw new NotFoundException('Security deposit disposition not found');
    if (current.status !== SecurityDepositDispositionStatus.ISSUED)
      throw new ConflictException(
        'Proof can only be attached to an issued return',
      );
    const slash = data.path.lastIndexOf('/');
    const directory = data.path.slice(0, slash);
    const fileName = data.path.slice(slash + 1);
    const { data: objects, error } = await this.storage()
      .storage.from(BUCKET)
      .list(directory, { search: fileName, limit: 2 });
    if (error || !objects?.some((item) => item.name === fileName))
      throw new BadRequestException('Upload the proof before attaching it');
    const disposition = await this.prisma.securityDepositDisposition.update({
      where: { id },
      data: {
        proofStoragePath: data.path,
        proofFileName: data.fileName,
        proofContentType: data.contentType,
        proofSizeBytes: data.sizeBytes,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: 'SECURITY_DEPOSIT_RETURN_PROOF_ATTACHED',
        resource: 'security_deposit_disposition',
        resourceId: id,
      },
    });
    return this.lifecycle.getLease(disposition.leaseId);
  }

  async proofUrl(userId: string, role: Role, id: string) {
    const disposition = await this.prisma.securityDepositDisposition.findUnique(
      {
        where: { id },
        select: {
          tenant: { select: { userId: true } },
          proofStoragePath: true,
          proofFileName: true,
        },
      },
    );
    if (
      !disposition ||
      (role === Role.TENANT && disposition.tenant.userId !== userId)
    )
      throw new NotFoundException('Security deposit disposition not found');
    if (!disposition.proofStoragePath)
      throw new NotFoundException('Return proof is not attached');
    const { data, error } = await this.storage()
      .storage.from(BUCKET)
      .createSignedUrl(disposition.proofStoragePath, 300, {
        download: disposition.proofFileName ?? true,
      });
    if (error || !data?.signedUrl)
      throw new BadRequestException(
        error?.message || 'Unable to open return proof',
      );
    return { url: data.signedUrl, expiresIn: 300 };
  }
  private storage() {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SECRET_KEY');
    if (!url || !key) {
      throw new InternalServerErrorException(
        'Move-out document storage is not configured',
      );
    }
    return createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  private safeName(value: string) {
    return value
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(-120);
  }
}
