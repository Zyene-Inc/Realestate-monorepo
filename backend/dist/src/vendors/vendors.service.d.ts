import { PrismaService } from '../prisma/prisma.service';
export declare class VendorsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        name: string;
        phone: string | null;
        notes: string | null;
        companyName: string | null;
        specialty: string | null;
        rating: number | null;
    }[]>;
    create(data: any): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        name: string;
        phone: string | null;
        notes: string | null;
        companyName: string | null;
        specialty: string | null;
        rating: number | null;
    }>;
}
