import { PrismaService } from '../prisma/prisma.service';
export declare class MessagesService {
    private prisma;
    constructor(prisma: PrismaService);
    findForUser(userId: string): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string | null;
        subject: string | null;
        senderId: string;
        receiverId: string;
        body: string;
        isRead: boolean;
    }[]>;
    send(data: any): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string | null;
        subject: string | null;
        senderId: string;
        receiverId: string;
        body: string;
        isRead: boolean;
    }>;
}
