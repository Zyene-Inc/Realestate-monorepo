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
var EmailsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailsService = void 0;
const common_1 = require("@nestjs/common");
const sgMail = __importStar(require("@sendgrid/mail"));
const config_1 = require("@nestjs/config");
let EmailsService = EmailsService_1 = class EmailsService {
    configService;
    logger = new common_1.Logger(EmailsService_1.name);
    isConfigured;
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('SENDGRID_API_KEY');
        if (apiKey && apiKey !== 'SG.mock') {
            sgMail.setApiKey(apiKey);
            this.isConfigured = true;
        }
        else {
            this.logger.warn('SendGrid is not configured. Emails will not be sent.');
            this.isConfigured = false;
        }
    }
    async send(msg) {
        if (!this.isConfigured) {
            this.logger.log(`SendGrid is not configured. Email to ${msg.to} was not sent. Subject: ${msg.subject}`);
            return;
        }
        try {
            await sgMail.send({
                ...msg,
                from: this.configService.get('EMAIL_FROM') || 'noreply@coachjohnsonrealty.com',
            });
            this.logger.log(`Email sent to ${msg.to} with subject: ${msg.subject}`);
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${msg.to}`, error);
        }
    }
    async sendInvite(email, inviteLink) {
        await this.send({
            to: email,
            subject: 'Welcome to Coach Johnson Realty - Tenant Portal Invite',
            html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
          <h2 style="color: #2563eb;">Welcome to Coach Johnson Realty</h2>
          <p>Hello,</p>
          <p>You have been invited to join our tenant portal where you can pay rent, submit maintenance requests, and view your lease documents.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Complete Account Setup
            </a>
          </div>
          <p style="font-size: 14px; color: #666;">
            This link will expire in 7 days. If you did not expect this invitation, please ignore this email.
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            Coach Johnson Realty Team
          </p>
        </div>
      `,
        });
    }
    async sendRentReminder(email, amount, dueDate) {
        await this.send({
            to: email,
            subject: 'Rent Reminder - Coach Johnson Realty',
            html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto;">
          <h3>Upcoming Rent Payment</h3>
          <p>This is a reminder that your rent of <strong>$${amount}</strong> is due on <strong>${dueDate}</strong>.</p>
          <p>Please log in to the tenant portal to record your payment.</p>
        </div>
      `,
        });
    }
    async sendLateNotice(email, amount, lateFee) {
        await this.send({
            to: email,
            subject: 'IMPORTANT: Late Rent Notice - Coach Johnson Realty',
            html: `
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 10px; max-width: 600px; margin: auto;">
          <h3 style="color: #ef4444;">Late Rent Notice</h3>
          <p>Your rent payment is currently overdue. A late fee of <strong>$${lateFee}</strong> has been applied.</p>
          <p>Total balance due: <strong>$${amount + lateFee}</strong></p>
          <p>Please contact management immediately or pay via the portal.</p>
        </div>
      `,
        });
    }
    async sendPaymentRecorded(email, amount, status) {
        await this.send({
            to: email,
            subject: 'Payment Recorded - Coach Johnson Realty',
            html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto;">
          <h3>Payment Update</h3>
          <p>A payment of <strong>$${amount}</strong> has been recorded.</p>
          <p>Current Status: <strong>${status}</strong></p>
        </div>
      `,
        });
    }
    async sendMaintenanceUpdate(email, requestId, status) {
        await this.send({
            to: email,
            subject: `Maintenance Request Update - #${requestId}`,
            html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto;">
          <h3>Maintenance Update</h3>
          <p>The status of your maintenance request <strong>#${requestId}</strong> has been updated to: <strong>${status}</strong>.</p>
        </div>
      `,
        });
    }
    async sendPasswordReset(email, resetLink) {
        await this.send({
            to: email,
            subject: 'Password Reset Request - Coach Johnson Realty',
            html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
          <h2 style="color: #0f172a;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password for your Coach Johnson Realty account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background-color: #0f172a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset My Password
            </a>
          </div>
          <p style="font-size: 14px; color: #666;">
            This link will expire in 60 minutes. If you did not request a password reset, please ignore this email.
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            Coach Johnson Realty Security Team
          </p>
        </div>
      `,
        });
    }
};
exports.EmailsService = EmailsService;
exports.EmailsService = EmailsService = EmailsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailsService);
//# sourceMappingURL=emails.service.js.map