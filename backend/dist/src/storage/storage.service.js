"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
let StorageService = StorageService_1 = class StorageService {
    configService;
    logger = new common_1.Logger(StorageService_1.name);
    s3Client = null;
    bucketName;
    isConfigured = false;
    constructor(configService) {
        this.configService = configService;
        const accessKey = this.configService.get('S3_ACCESS_KEY_ID');
        const secretKey = this.configService.get('S3_SECRET_ACCESS_KEY');
        this.bucketName = this.configService.get('S3_BUCKET_NAME') || '';
        const region = this.configService.get('S3_REGION');
        if (accessKey && secretKey && this.bucketName && region) {
            this.s3Client = new client_s3_1.S3Client({
                region,
                credentials: {
                    accessKeyId: accessKey,
                    secretAccessKey: secretKey,
                },
            });
            this.isConfigured = true;
        }
        else {
            this.logger.warn('File storage is not configured. Add storage environment variables.');
        }
    }
    validateFile(file) {
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        const maxSizeBytes = 5 * 1024 * 1024;
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(`Invalid file type: ${file.mimetype}. Allowed types: PDF, JPG, PNG.`);
        }
        if (file.size > maxSizeBytes) {
            throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max size: 5MB.`);
        }
    }
    async uploadFile(file, folder) {
        if (!this.isConfigured || !this.s3Client) {
            throw new Error('File storage is not configured. Add storage environment variables.');
        }
        this.validateFile(file);
        const key = `${folder}/${(0, uuid_1.v4)()}-${file.originalname}`;
        try {
            await this.s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));
            const publicUrl = this.configService.get('S3_PUBLIC_URL');
            return publicUrl ? `${publicUrl}/${key}` : `https://${this.bucketName}.s3.amazonaws.com/${key}`;
        }
        catch (error) {
            this.logger.error('Failed to upload file to S3', error);
            throw new Error(error.message || 'Failed to upload file to storage.');
        }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map