import { AuthService } from './auth.service';
import { type Response } from 'express';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: any, response: Response): Promise<{
        accessToken: string;
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
    refresh(request: any): Promise<{
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
    logout(response: Response): Promise<{
        message: string;
    }>;
    invite(body: any, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(body: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
