import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getPortalUrls } from '../common/config/portal-urls';
import { Resend } from 'resend';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    this.from =
      this.configService.get<string>('RESEND_FROM_EMAIL')?.trim() ||
      'Coach Johnson Realty <onboarding@resend.dev>';

    if (apiKey && apiKey !== 're_your_api_key_here') {
      this.resend = new Resend(apiKey);
    } else {
      this.resend = null;
      this.logger.warn('Resend is not configured. Emails will not be sent.');
    }
  }

  private async send(msg: { to: string; subject: string; html: string }) {
    if (!this.resend) {
      this.logger.log(
        `Resend is not configured. Email to ${msg.to} was not sent. Subject: ${msg.subject}`,
      );
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        ...msg,
        from: this.from,
      });

      if (error) {
        this.logger.error(
          `Resend rejected email to ${msg.to}: ${error.message}`,
        );
        return;
      }

      this.logger.log(
        `Email ${data?.id ?? 'accepted'} sent to ${msg.to} with subject: ${msg.subject}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${msg.to}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private escape(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async sendAgentVerification(
    email: string,
    contactName: string,
    verificationLink: string,
  ) {
    await this.send({
      to: email,
      subject: 'Verify your Johnson Realty agent application',
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: auto;">
          <h2>Verify your email</h2>
          <p>Hello ${this.escape(contactName)},</p>
          <p>Confirm your email address to submit your agent company application for Johnson Realty review.</p>
          <p style="margin: 28px 0;"><a href="${this.escape(verificationLink)}" style="padding: 12px 20px; background: #111827; color: white; text-decoration: none; border-radius: 8px;">Verify application</a></p>
          <p>If you did not submit this application, you can ignore this email.</p>
        </div>
      `,
    });
  }

  async sendAgentApproved(email: string, contactName: string) {
    await this.send({
      to: email,
      subject: 'Your Johnson Realty agent application was approved',
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2>Application approved</h2><p>Hello ${this.escape(contactName)},</p><p>Your agent company has been approved. You can now sign in and continue setting up your account.</p></div>`,
    });
  }

  async sendAgentDeclined(email: string, contactName: string, reason: string) {
    await this.send({
      to: email,
      subject: 'Update on your Johnson Realty agent application',
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2>Application update</h2><p>Hello ${this.escape(contactName)},</p><p>We could not approve your application at this time.</p><p><strong>Reason:</strong> ${this.escape(reason)}</p><p>Contact Johnson Realty if you need clarification or want to submit updated information.</p></div>`,
    });
  }

  async sendAgentResubmissionReceived(email: string, contactName: string) {
    await this.send({
      to: email,
      subject: 'Your Johnson Realty agent application was resubmitted',
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2>Application resubmitted</h2><p>Hello ${this.escape(contactName)},</p><p>We received your updated agent company application. Johnson Realty will email you after the new review is complete.</p></div>`,
    });
  }

  async sendAgentResubmittedForReview(
    email: string,
    companyName: string,
    contactName: string,
    agentId: string,
  ) {
    const reviewUrl = `${getPortalUrls(this.configService).propertiesAdmin}/admin/agents?id=${encodeURIComponent(agentId)}&status=PENDING`;
    await this.send({
      to: email,
      subject: `Agent application resubmitted: ${companyName}`,
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2>Agent application resubmitted</h2><p><strong>${this.escape(companyName)}</strong> (${this.escape(contactName)}) submitted updated information for Johnson Realty review.</p><p style="margin: 28px 0;"><a href="${this.escape(reviewUrl)}" style="padding: 12px 20px; background: #111827; color: white; text-decoration: none; border-radius: 8px;">Review application</a></p></div>`,
    });
  }

  async sendListingSubmitted(
    email: string,
    listingName: string,
    companyName: string,
    listingId: string,
    resubmission: boolean,
  ) {
    const reviewUrl = `${getPortalUrls(this.configService).propertiesAdmin}/admin/listings?id=${encodeURIComponent(listingId)}`;
    await this.send({
      to: email,
      subject: `${resubmission ? 'Sale listing resubmitted' : 'New sale listing for review'}: ${listingName}`,
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2>${resubmission ? 'Sale listing resubmitted' : 'New sale listing submitted'}</h2><p><strong>${this.escape(companyName)}</strong> submitted <strong>${this.escape(listingName)}</strong> for Johnson Realty review.</p><p style="margin: 28px 0;"><a href="${this.escape(reviewUrl)}" style="padding: 12px 20px; background: #111827; color: white; text-decoration: none; border-radius: 8px;">Review listing</a></p></div>`,
    });
  }

  async sendListingApproved(
    email: string,
    contactName: string,
    listingName: string,
  ) {
    await this.send({
      to: email,
      subject: `Sale listing approved: ${listingName}`,
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2>Listing approved</h2><p>Hello ${this.escape(contactName)},</p><p><strong>${this.escape(listingName)}</strong> was approved and is now available in Johnson Realty's public sale listings.</p></div>`,
    });
  }

  async sendListingRejected(
    email: string,
    contactName: string,
    listingName: string,
    reason: string,
  ) {
    await this.send({
      to: email,
      subject: `Changes requested: ${listingName}`,
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2>Listing changes requested</h2><p>Hello ${this.escape(contactName)},</p><p><strong>${this.escape(listingName)}</strong> was returned for changes.</p><p><strong>Reason:</strong> ${this.escape(reason)}</p><p>Edit the listing and submit it again when it is ready.</p></div>`,
    });
  }

  async sendBuyerInquiryToAgent(
    email: string,
    contactName: string,
    listingName: string,
    buyerName: string,
    inquiryId: string,
  ) {
    const inboxUrl = `${getPortalUrls(this.configService).agent}/agent/inquiries?id=${encodeURIComponent(inquiryId)}`;
    await this.send({
      to: email,
      subject: `New buyer inquiry: ${listingName}`,
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2>New buyer inquiry</h2><p>Hello ${this.escape(contactName)},</p><p><strong>${this.escape(buyerName)}</strong> asked about <strong>${this.escape(listingName)}</strong>.</p><p style="margin: 28px 0;"><a href="${this.escape(inboxUrl)}" style="padding: 12px 20px; background: #111827; color: white; text-decoration: none; border-radius: 8px;">Open agent inbox</a></p></div>`,
    });
  }

  async sendBuyerReplyToAgent(
    email: string,
    contactName: string,
    listingName: string,
    buyerName: string,
    inquiryId: string,
  ) {
    const inboxUrl = `${getPortalUrls(this.configService).agent}/agent/inquiries?id=${encodeURIComponent(inquiryId)}`;
    await this.send({
      to: email,
      subject: `Buyer replied: ${listingName}`,
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2>Buyer reply</h2><p>Hello ${this.escape(contactName)},</p><p><strong>${this.escape(buyerName)}</strong> added a message about <strong>${this.escape(listingName)}</strong>.</p><p style="margin: 28px 0;"><a href="${this.escape(inboxUrl)}" style="padding: 12px 20px; background: #111827; color: white; text-decoration: none; border-radius: 8px;">Open conversation</a></p></div>`,
    });
  }

  async sendAgentReplyToBuyer(
    email: string,
    buyerName: string,
    listingName: string,
    agentName: string,
  ) {
    await this.send({
      to: email,
      subject: `Reply about ${listingName}`,
      html: `<div style="font-family: sans-serif; padding: 24px;"><h2>Your listing inquiry has a reply</h2><p>Hello ${this.escape(buyerName)},</p><p><strong>${this.escape(agentName)}</strong> replied to your inquiry about <strong>${this.escape(listingName)}</strong>.</p><p>Return to the inquiry confirmation in the browser where you submitted it to continue the conversation. You can also reply directly to the listing agent using the contact details on the listing page.</p></div>`,
    });
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

  async sendMaintenanceUpdate(
    email: string,
    requestId: string,
    status: string,
  ) {
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
