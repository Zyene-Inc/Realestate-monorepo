import { PrismaService } from '../prisma/prisma.service';
export declare class AnnouncementsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        propertyId: string | null;
        unitId: string | null;
        content: string;
        title: string;
    }[]>;
    create(data: any): Promise<{
        id: string;
        createdAt: Date;
        propertyId: string | null;
        unitId: string | null;
        content: string;
        title: string;
    }>;
}
