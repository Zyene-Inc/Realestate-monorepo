import { validate } from 'class-validator';
import {
  WebsiteLeadScreeningStatus,
  WebsiteLeadStatus,
  WebsiteLeadTourStatus,
} from '@prisma/client';
import { UpdateWebsiteLeadWorkflowDto } from './website-lead.dto';

describe('UpdateWebsiteLeadWorkflowDto', () => {
  it('accepts a complete screening and tour update', async () => {
    const dto = Object.assign(new UpdateWebsiteLeadWorkflowDto(), {
      status: WebsiteLeadStatus.TOUR_SCHEDULED,
      assignedToUserId: 'manager-1',
      screeningStatus: WebsiteLeadScreeningStatus.QUALIFIED,
      screeningSummary: 'Pre-screening complete.',
      tourStatus: WebsiteLeadTourStatus.SCHEDULED,
      tourScheduledAt: '2099-09-05T18:00:00.000Z',
      expectedUpdatedAt: '2099-08-01T12:00:00.000Z',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts clearing nullable workflow fields', async () => {
    const dto = Object.assign(new UpdateWebsiteLeadWorkflowDto(), {
      assignedToUserId: null,
      screeningSummary: null,
      tourScheduledAt: null,
      expectedUpdatedAt: '2099-08-01T12:00:00.000Z',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid workflow values and a missing version', async () => {
    const dto = Object.assign(new UpdateWebsiteLeadWorkflowDto(), {
      status: 'BOOKED',
      screeningSummary: '',
      tourScheduledAt: 'tomorrow afternoon',
    });

    const errors = await validate(dto);
    expect(errors.map(({ property }) => property).sort()).toEqual([
      'expectedUpdatedAt',
      'screeningSummary',
      'status',
      'tourScheduledAt',
    ]);
  });
});
