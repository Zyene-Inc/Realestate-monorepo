import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getPortalUrls } from '../common/config/portal-urls';
import { type EmailTemplateVariables } from '../emails/email-template.registry';
import { EmailsService } from '../emails/emails.service';

@Injectable()
export class MoveInInspectionEmailsService {
  constructor(
    private readonly emails: EmailsService,
    private readonly config: ConfigService,
  ) {}

  sendReady(email: string, values: EmailTemplateVariables, eventKey: string) {
    const url = `${getPortalUrls(this.config).tenant}/tenant/move-in`;
    return this.emails.sendTemplate(
      email,
      'move_in.inspection_ready',
      { ...values, url },
      eventKey,
    );
  }

  sendAcknowledged(
    email: string,
    values: EmailTemplateVariables,
    eventKey: string,
  ) {
    const url = `${getPortalUrls(this.config).rentalAdmin}/admin/move-in-inspections`;
    return this.emails.sendTemplate(
      email,
      'move_in.inspection_acknowledged',
      { ...values, url },
      eventKey,
    );
  }
}
