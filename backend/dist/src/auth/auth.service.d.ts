import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import { ConfigService } from '@nestjs/config';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private emailsService;
    private configService;
    private auditLogs;
    private readonly BCRYPT_ROUNDS;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, emailsService: EmailsService, configService: ConfigService, auditLogs: AuditLogsService);
    validateUser(email: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            role: any;
            status: any;
            tenantProfile: {
                id: string;
                email: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                firstName: string;
                lastName: string;
                phone: string | null;
                dateOfBirth: Date | null;
                emergencyContactName: string | null;
                emergencyContactPhone: string | null;
                vehicleInfo: string | null;
                petInfo: string | null;
                userId: string | null;
                unitId: string | null;
            } | null;
        };
    }>;
    refreshToken(token: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            status: import(".prisma/client").$Enums.UserStatus;
            tenantProfile: {
                id: string;
                email: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                firstName: string;
                lastName: string;
                phone: string | null;
                dateOfBirth: Date | null;
                emergencyContactName: string | null;
                emergencyContactPhone: string | null;
                vehicleInfo: string | null;
                petInfo: string | null;
                userId: string | null;
                unitId: string | null;
            } | null;
        };
    }>;
    inviteTenant(data: {
        email: string;
        firstName: string;
        lastName: string;
        unitId: string;
    }, adminId?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(token: string, newPass: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
