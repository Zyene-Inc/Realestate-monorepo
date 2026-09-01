import { Prisma, Role, WebsiteLeadIntent } from '@prisma/client';

export const RENTAL_LEAD_INTENTS = new Set<WebsiteLeadIntent>([
  WebsiteLeadIntent.RENTAL_INQUIRY,
  WebsiteLeadIntent.RENTAL_TOUR,
  WebsiteLeadIntent.RENTAL_APPLICATION,
  WebsiteLeadIntent.SIMILAR_RENTAL,
]);

export function websiteLeadAccessScope(
  role: Role,
): Prisma.WebsiteLeadWhereInput {
  if (role === Role.TENANT_ADMIN) {
    return { intent: { in: [...RENTAL_LEAD_INTENTS] } };
  }
  if (role === Role.SALES_ADMIN) {
    return {
      OR: [{ intent: null }, { intent: { notIn: [...RENTAL_LEAD_INTENTS] } }],
    };
  }
  return {};
}

export function isRentalWebsiteLead(intent: WebsiteLeadIntent | null) {
  return intent ? RENTAL_LEAD_INTENTS.has(intent) : false;
}
