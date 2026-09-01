import { Role, WebsiteLeadIntent } from '@prisma/client';
import {
  isRentalWebsiteLead,
  websiteLeadAccessScope,
} from './website-lead-access';

describe('websiteLeadAccessScope', () => {
  it('limits tenant admins to rental website lead intents', () => {
    expect(websiteLeadAccessScope(Role.TENANT_ADMIN)).toEqual({
      intent: {
        in: [
          WebsiteLeadIntent.RENTAL_INQUIRY,
          WebsiteLeadIntent.RENTAL_TOUR,
          WebsiteLeadIntent.RENTAL_APPLICATION,
          WebsiteLeadIntent.SIMILAR_RENTAL,
        ],
      },
    });
  });

  it('limits sales admins to non-rental website leads', () => {
    expect(websiteLeadAccessScope(Role.SALES_ADMIN)).toEqual({
      OR: [
        { intent: null },
        {
          intent: {
            notIn: [
              WebsiteLeadIntent.RENTAL_INQUIRY,
              WebsiteLeadIntent.RENTAL_TOUR,
              WebsiteLeadIntent.RENTAL_APPLICATION,
              WebsiteLeadIntent.SIMILAR_RENTAL,
            ],
          },
        },
      ],
    });
  });

  it('allows super admins to see every website lead', () => {
    expect(websiteLeadAccessScope(Role.SUPER_ADMIN)).toEqual({});
  });
});

describe('isRentalWebsiteLead', () => {
  it('returns false for null intent', () => {
    expect(isRentalWebsiteLead(null)).toBe(false);
  });

  it('returns true for rental intents', () => {
    expect(isRentalWebsiteLead(WebsiteLeadIntent.RENTAL_TOUR)).toBe(true);
  });

  it('returns false for non-rental intents', () => {
    expect(isRentalWebsiteLead(WebsiteLeadIntent.GENERAL)).toBe(false);
  });
});
