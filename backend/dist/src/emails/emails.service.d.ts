import { ConfigService } from '@nestjs/config';
export declare class EmailsService {
    private configService;
    private readonly logger;
    private readonly isConfigured;
    constructor(configService: ConfigService);
    private send;
    sendInvite(email: string, inviteLink: string): Promise<void>;
    sendRentReminder(email: string, amount: number, dueDate: string): Promise<void>;
    sendLateNotice(email: string, amount: number, lateFee: number): Promise<void>;
    sendPaymentRecorded(email: string, amount: number, status: string): Promise<void>;
    sendMaintenanceUpdate(email: string, requestId: string, status: string): Promise<void>;
    sendPasswordReset(email: string, resetLink: string): Promise<void>;
}
