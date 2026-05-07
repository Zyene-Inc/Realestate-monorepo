import { PrismaService } from '../prisma/prisma.service';
export declare class AuditLogsService {
    private prisma;
    constructor(prisma: PrismaService);
    log(data: {
        userId?: string;
        action: string;
        resource: string;
        resourceId?: string;
        oldValue?: any;
        newValue?: any;
        ipAddress?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        oldValue: string | null;
        newValue: string | null;
        ipAddress: string | null;
    }>;
}
