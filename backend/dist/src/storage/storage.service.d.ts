import { ConfigService } from '@nestjs/config';
export declare class StorageService {
    private configService;
    private readonly logger;
    private s3Client;
    private bucketName;
    private isConfigured;
    constructor(configService: ConfigService);
    private validateFile;
    uploadFile(file: Express.Multer.File, folder: string): Promise<string>;
}
