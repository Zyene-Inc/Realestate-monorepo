import { Injectable } from '@nestjs/common';
import { EmailsService } from '../emails/emails.service';
import type { EmailTemplateVariables } from '../emails/email-template.registry';

@Injectable()
export class LeaseLifecycleNotificationsService {
  constructor(private readonly emails: EmailsService) {}

  renewalOffered(email: string, values: EmailTemplateVariables, id: string) {
    return this.send(email, 'lease.renewal_offered', values, id);
  }

  vacateNoticeReceived(
    email: string,
    values: EmailTemplateVariables,
    id: string,
  ) {
    return this.send(email, 'lease.vacate_notice_received', values, id);
  }

  moveOutInspectionScheduled(
    email: string,
    values: EmailTemplateVariables,
    id: string,
  ) {
    return this.send(email, 'lease.move_out_inspection_scheduled', values, id);
  }

  depositItemized(email: string, values: EmailTemplateVariables, id: string) {
    return this.send(email, 'lease.deposit_itemized', values, id);
  }

  depositReturned(email: string, values: EmailTemplateVariables, id: string) {
    return this.send(email, 'lease.deposit_returned', values, id);
  }

  private send(
    email: string,
    key:
      | 'lease.renewal_offered'
      | 'lease.vacate_notice_received'
      | 'lease.move_out_inspection_scheduled'
      | 'lease.deposit_itemized'
      | 'lease.deposit_returned',
    values: EmailTemplateVariables,
    id: string,
  ) {
    return this.emails.sendTemplate(
      email,
      key,
      {
        ...values,
        url: this.emails.portal('/tenant/lease-lifecycle', 'tenant'),
      },
      id,
    );
  }
}
