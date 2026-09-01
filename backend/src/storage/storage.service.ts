import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    const accessKey = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || '';
    const region = this.configService.get<string>('S3_REGION');

    if (accessKey && secretKey && this.bucketName && region) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
      });
      this.isConfigured = true;
    } else {
      this.logger.warn(
        'File storage is not configured. Add storage environment variables.',
      );
    }
  }

  private validateFile(file: Express.Multer.File) {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    // Vercel Functions cap request and response bodies at 4.5 MB. Keep
    // proxied uploads below that limit, including multipart overhead.
    const maxSizeBytes = 4 * 1024 * 1024;

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(
        `Invalid file type: ${file.mimetype}. Allowed types: PDF, JPG, PNG.`,
      );
    }

    if (file.size > maxSizeBytes) {
      throw new Error(
        `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max size: 4MB.`,
      );
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!this.isConfigured || !this.s3Client) {
      throw new Error(
        'File storage is not configured. Add storage environment variables.',
      );
    }

    this.validateFile(file);

    const key = `${folder}/${uuidv4()}-${file.originalname}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const publicUrl = this.configService.get<string>('S3_PUBLIC_URL');
      return publicUrl
        ? `${publicUrl}/${key}`
        : `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to upload file to storage.';
      this.logger.error('Failed to upload file to S3', message);
      throw new Error(message);
    }
  }
}
