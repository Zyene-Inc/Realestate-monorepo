import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey && apiKey !== 'SG.mock') {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
    } else {
      this.logger.warn('SendGrid is not configured. Emails will not be sent.');
      this.isConfigured = false;
    }
  }

  private async send(msg: any) {
    if (!this.isConfigured) {
      this.logger.log(`SendGrid is not configured. Email to ${msg.to} was not sent. Subject: ${msg.subject}`);
      return;
    }

    try {
      await sgMail.send({
        ...msg,
        from: this.configService.get<string>('EMAIL_FROM') || 'noreply@coachjohnsonrealty.com',
      });
      this.logger.log(`Email sent to ${msg.to} with subject: ${msg.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${msg.to}`, error);
    }
  }

  async sendInvite(email: string, inviteLink: string) {
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

  async sendRentReminder(email: string, amount: number, dueDate: string) {
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

  async sendLateNotice(email: string, amount: number, lateFee: number) {
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

  async sendPaymentRecorded(email: string, amount: number, status: string) {
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

  async sendMaintenanceUpdate(email: string, requestId: string, status: string) {
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

  async sendPasswordReset(email: string, resetLink: string) {
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
}
