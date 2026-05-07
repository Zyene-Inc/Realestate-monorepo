"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const emails_service_1 = require("../emails/emails.service");
const config_1 = require("@nestjs/config");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const client_1 = require("@prisma/client");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    emailsService;
    configService;
    auditLogs;
    BCRYPT_ROUNDS = 12;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwtService, emailsService, configService, auditLogs) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.emailsService = emailsService;
        this.configService = configService;
        this.auditLogs = auditLogs;
    }
    async validateUser(email, pass) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user && await bcrypt.compare(pass, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        await this.auditLogs.log({
            action: 'LOGIN_FAILED',
            resource: 'user',
            resourceId: email,
        });
        return null;
    }
    async login(user) {
        const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: { tenantProfile: true },
        });
        const payload = { email: user.email, sub: user.id, role: user.role };
        await this.auditLogs.log({
            userId: user.id,
            action: 'LOGIN_SUCCESS',
            resource: 'user',
            resourceId: user.id,
        });
        return {
            accessToken: this.jwtService.sign(payload),
            refreshToken: this.jwtService.sign(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: '7d'
            }),
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                status: user.status,
                tenantProfile: fullUser?.tenantProfile || null,
            },
        };
    }
    async refreshToken(token) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            const newPayload = { email: payload.email, sub: payload.sub, role: payload.role };
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                include: { tenantProfile: true },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            return {
                accessToken: this.jwtService.sign(newPayload),
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    tenantProfile: user.tenantProfile || null,
                },
            };
        }
        catch (e) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async inviteTenant(data, adminId) {
        const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (existingUser) {
            throw new common_1.BadRequestException('User with this email already exists');
        }
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteTokenExpires = new Date();
        inviteTokenExpires.setDate(inviteTokenExpires.getDate() + 7);
        const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), this.BCRYPT_ROUNDS);
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                role: client_1.Role.TENANT,
                status: client_1.UserStatus.INVITED,
                inviteToken,
                inviteTokenExpires,
            },
        });
        const tenant = await this.prisma.tenant.create({
            data: {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                userId: user.id,
                unitId: data.unitId,
                status: 'invited',
            },
        });
        await this.auditLogs.log({
            userId: adminId,
            action: 'TENANT_INVITED',
            resource: 'tenant',
            resourceId: tenant.id,
            newValue: JSON.stringify({ email: data.email, unitId: data.unitId }),
        });
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        const inviteLink = `${frontendUrl}/tenant/accept-invite?token=${inviteToken}`;
        await this.emailsService.sendInvite(data.email, inviteLink);
        return { success: true, message: 'Invitation sent' };
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            this.logger.log(`Password reset requested for non-existent email: ${email}`);
            return { success: true, message: 'If an account exists with this email, a reset link has been sent.' };
        }
        const resetTokenPlain = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetTokenPlain).digest('hex');
        const resetTokenExpires = new Date();
        resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: resetTokenHash,
                resetTokenExpires
            },
        });
        await this.auditLogs.log({
            userId: user.id,
            action: 'PASSWORD_RESET_REQUESTED',
            resource: 'user',
            resourceId: user.id,
        });
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/auth/reset-password?token=${resetTokenPlain}`;
        await this.emailsService.sendPasswordReset(email, resetLink);
        return { success: true, message: 'If an account exists with this email, a reset link has been sent.' };
    }
    async resetPassword(token, newPass) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await this.prisma.user.findFirst({
            where: {
                resetToken: tokenHash,
                resetTokenExpires: { gt: new Date() },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const hashedPassword = await bcrypt.hash(newPass, this.BCRYPT_ROUNDS);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpires: null,
            },
        });
        await this.auditLogs.log({
            userId: user.id,
            action: 'PASSWORD_RESET_COMPLETED',
            resource: 'user',
            resourceId: user.id,
        });
        return { success: true, message: 'Password has been successfully reset' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        emails_service_1.EmailsService,
        config_1.ConfigService,
        audit_logs_service_1.AuditLogsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map