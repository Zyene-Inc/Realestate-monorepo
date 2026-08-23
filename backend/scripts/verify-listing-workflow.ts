import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  AgentAccountStatus,
  PrismaClient,
  Role,
  UserStatus,
} from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const apiUrl = process.env.VERIFY_API_URL || 'http://127.0.0.1:3012/api';
const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !publishableKey || !secretKey) {
  throw new Error('Supabase verification credentials are missing');
}

const prisma = new PrismaClient();
const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const suffix = randomUUID().slice(0, 8);
const password = `Verify-${randomUUID()}!`;
const agentEmail = `delivered+listing-agent-${suffix}@resend.dev`;
const reviewerEmail = `delivered+listing-reviewer-${suffix}@resend.dev`;
const tenantAdminEmail = `delivered+listing-tenant-admin-${suffix}@resend.dev`;
const otherAgentEmail = `delivered+listing-other-agent-${suffix}@resend.dev`;
const authUserIds: string[] = [];
const appUserIds: string[] = [];
const listingIds: string[] = [];
const inquiryIds: string[] = [];
const uploadedObjects: Array<{ bucket: string; path: string }> = [];

async function createAuthUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw error || new Error('Auth user was not created');
  authUserIds.push(data.user.id);
  return data.user.id;
}

async function token(email: string) {
  const client = createClient(supabaseUrl!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session)
    throw error || new Error('Verification sign-in failed');
  return data.session.access_token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as T;
  return { response, body };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const agentAuthId = await createAuthUser(agentEmail);
  const reviewerAuthId = await createAuthUser(reviewerEmail);
  const tenantAdminAuthId = await createAuthUser(tenantAdminEmail);
  const otherAgentAuthId = await createAuthUser(otherAgentEmail);

  const agentUser = await prisma.user.create({
    data: {
      authUserId: agentAuthId,
      email: agentEmail,
      role: Role.AGENT,
      status: UserStatus.ACTIVE,
      agentProfile: {
        create: {
          companyName: `Verification Realty ${suffix}`,
          contactName: 'Listing Agent',
          email: agentEmail,
          accountStatus: AgentAccountStatus.APPROVED,
        },
      },
    },
    include: { agentProfile: true },
  });
  appUserIds.push(agentUser.id);
  const reviewerUser = await prisma.user.create({
    data: {
      authUserId: reviewerAuthId,
      email: reviewerEmail,
      role: Role.SALES_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  appUserIds.push(reviewerUser.id);
  const tenantAdminUser = await prisma.user.create({
    data: {
      authUserId: tenantAdminAuthId,
      email: tenantAdminEmail,
      role: Role.TENANT_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  appUserIds.push(tenantAdminUser.id);
  const otherAgentUser = await prisma.user.create({
    data: {
      authUserId: otherAgentAuthId,
      email: otherAgentEmail,
      role: Role.AGENT,
      status: UserStatus.ACTIVE,
      agentProfile: {
        create: {
          companyName: `Other Realty ${suffix}`,
          contactName: 'Other Agent',
          email: otherAgentEmail,
          accountStatus: AgentAccountStatus.APPROVED,
        },
      },
    },
  });
  appUserIds.push(otherAgentUser.id);

  const agentToken = await token(agentEmail);
  const reviewerToken = await token(reviewerEmail);
  const tenantAdminToken = await token(tenantAdminEmail);
  const otherAgentToken = await token(otherAgentEmail);
  const profileUpdate = await request<{ companyName: string; phone: string }>(
    '/agents/me',
    {
      method: 'PATCH',
      body: JSON.stringify({
        companyName: `Verified Company ${suffix}`,
        contactName: 'Listing Agent',
        phone: '816-555-0199',
      }),
    },
    agentToken,
  );
  assert(
    profileUpdate.response.status === 200 &&
      profileUpdate.body.companyName === `Verified Company ${suffix}`,
    'Agent profile update failed',
  );

  const accountDocumentUpload = await request<{
    bucket: string;
    path: string;
    token: string;
  }>(
    '/agents/me/document-upload-url',
    {
      method: 'POST',
      body: JSON.stringify({
        fileName: 'license.pdf',
        contentType: 'application/pdf',
      }),
    },
    agentToken,
  );
  assert(
    accountDocumentUpload.response.status === 201,
    'Agent document upload URL failed',
  );
  uploadedObjects.push({
    bucket: accountDocumentUpload.body.bucket,
    path: accountDocumentUpload.body.path,
  });
  const { error: accountUploadError } = await createClient(
    supabaseUrl!,
    publishableKey!,
  )
    .storage.from(accountDocumentUpload.body.bucket)
    .uploadToSignedUrl(
      accountDocumentUpload.body.path,
      accountDocumentUpload.body.token,
      Buffer.from('%PDF-1.4 license verification'),
      { contentType: 'application/pdf' },
    );
  if (accountUploadError) throw accountUploadError;
  const accountDocument = await request<{ verificationDocuments: string[] }>(
    '/agents/me/documents',
    {
      method: 'POST',
      body: JSON.stringify({ path: accountDocumentUpload.body.path }),
    },
    agentToken,
  );
  assert(
    accountDocument.body.verificationDocuments.length === 1,
    'Agent document attachment failed',
  );
  const ownAccountDocumentUrl = await request<{ url: string }>(
    '/agents/me/documents/0/url',
    {},
    agentToken,
  );
  assert(
    ownAccountDocumentUrl.response.status === 200,
    'Agent account document access failed',
  );
  const reviewerAccountDocumentUrl = await request<{ url: string }>(
    `/agents/${agentUser.agentProfile!.id}/documents/0/url`,
    {},
    reviewerToken,
  );
  assert(
    reviewerAccountDocumentUrl.response.status === 200,
    'Reviewer account document access failed',
  );
  const tenantAccountDocumentUrl = await request(
    `/agents/${agentUser.agentProfile!.id}/documents/0/url`,
    {},
    tenantAdminToken,
  );
  assert(
    tenantAccountDocumentUrl.response.status === 403,
    'Tenant admin accessed an agent verification document',
  );
  const created = await request<{ id: string; listingStatus: string }>(
    '/agent/listings',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `Phase 3 Verification ${suffix}`,
        address: '100 Verification Way',
        city: 'Kansas City',
        state: 'MO',
        zip: '64101',
        propertyType: 'Single Family',
        description: 'A complete listing used to verify the review lifecycle.',
        price: 325000,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1800,
        amenities: ['Garage'],
      }),
    },
    agentToken,
  );
  assert(created.response.status === 201, 'Draft creation failed');
  assert(
    created.body.listingStatus === 'DRAFT',
    'Listing was not created as DRAFT',
  );
  listingIds.push(created.body.id);

  const premature = await request(
    `/agent/listings/${created.body.id}/submit`,
    { method: 'POST', body: '{}' },
    agentToken,
  );
  assert(
    premature.response.status === 400,
    'Photo requirement was not enforced',
  );

  const upload = await request<{
    bucket: string;
    path: string;
    token: string;
  }>(
    `/agent/listings/${created.body.id}/upload-url`,
    {
      method: 'POST',
      body: JSON.stringify({
        kind: 'photo',
        fileName: 'verification.png',
        contentType: 'image/png',
      }),
    },
    agentToken,
  );
  assert(upload.response.status === 201, 'Signed upload URL was not created');
  uploadedObjects.push({ bucket: upload.body.bucket, path: upload.body.path });
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=',
    'base64',
  );
  const { error: uploadError } = await createClient(
    supabaseUrl!,
    publishableKey!,
  )
    .storage.from(upload.body.bucket)
    .uploadToSignedUrl(upload.body.path, upload.body.token, png, {
      contentType: 'image/png',
    });
  if (uploadError) throw uploadError;
  const attached = await request<{ photos: string[] }>(
    `/agent/listings/${created.body.id}/assets`,
    {
      method: 'POST',
      body: JSON.stringify({ kind: 'photo', path: upload.body.path }),
    },
    agentToken,
  );
  assert(attached.response.status === 201, 'Uploaded photo was not attached');
  assert(attached.body.photos.length === 1, 'Attached photo was not persisted');

  const documentUpload = await request<{
    bucket: string;
    path: string;
    token: string;
  }>(
    `/agent/listings/${created.body.id}/upload-url`,
    {
      method: 'POST',
      body: JSON.stringify({
        kind: 'document',
        fileName: 'verification.pdf',
        contentType: 'application/pdf',
      }),
    },
    agentToken,
  );
  assert(documentUpload.response.status === 201, 'Document upload URL failed');
  uploadedObjects.push({
    bucket: documentUpload.body.bucket,
    path: documentUpload.body.path,
  });
  const { error: documentUploadError } = await createClient(
    supabaseUrl!,
    publishableKey!,
  )
    .storage.from(documentUpload.body.bucket)
    .uploadToSignedUrl(
      documentUpload.body.path,
      documentUpload.body.token,
      Buffer.from('%PDF-1.4 verification'),
      { contentType: 'application/pdf' },
    );
  if (documentUploadError) throw documentUploadError;
  const documentAttached = await request<{ documents: string[] }>(
    `/agent/listings/${created.body.id}/assets`,
    {
      method: 'POST',
      body: JSON.stringify({
        kind: 'document',
        path: documentUpload.body.path,
      }),
    },
    agentToken,
  );
  assert(
    documentAttached.body.documents.length === 1,
    'Private document was not attached',
  );
  const agentDocument = await request<{ url: string }>(
    `/agent/listings/${created.body.id}/documents/0/url`,
    {},
    agentToken,
  );
  assert(
    agentDocument.response.status === 200 &&
      agentDocument.body.url.includes('/storage/v1/object/sign/'),
    'Agent private document URL failed',
  );

  const submitted = await request<{ listingStatus: string }>(
    `/agent/listings/${created.body.id}/submit`,
    { method: 'POST', body: '{}' },
    agentToken,
  );
  assert(
    submitted.body.listingStatus === 'PENDING_REVIEW',
    'Submit transition failed',
  );
  const adminDocument = await request<{ url: string }>(
    `/admin/sale-listings/${created.body.id}/documents/0/url`,
    {},
    reviewerToken,
  );
  assert(
    adminDocument.response.status === 200 &&
      adminDocument.body.url.includes('/storage/v1/object/sign/'),
    'Reviewer private document URL failed',
  );
  const tenantAdminReview = await request(
    '/admin/sale-listings?status=PENDING_REVIEW',
    {},
    tenantAdminToken,
  );
  assert(
    tenantAdminReview.response.status === 403,
    'Tenant admin accessed the sales review queue',
  );
  const salesAdminRentalAccess = await request(
    '/admin/properties',
    {},
    reviewerToken,
  );
  assert(
    salesAdminRentalAccess.response.status === 403,
    'Sales admin accessed the rental property API',
  );
  const rentalEndpointBypass = await request(
    `/admin/properties/${created.body.id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ listingStatus: 'APPROVED' }),
    },
    tenantAdminToken,
  );
  assert(
    rentalEndpointBypass.response.status === 400,
    'Legacy rental endpoint accepted sale workflow fields',
  );
  const lockedEdit = await request(
    `/agent/listings/${created.body.id}`,
    { method: 'PATCH', body: JSON.stringify({ price: 330000 }) },
    agentToken,
  );
  assert(
    lockedEdit.response.status === 409,
    'Pending listing edit was not blocked',
  );

  const beforeApproval = await request<Array<{ id: string }>>(
    '/public/sale-listings',
  );
  assert(
    !beforeApproval.body.some((item) => item.id === created.body.id),
    'Pending listing leaked publicly',
  );
  const rejected = await request<{ listingStatus: string }>(
    `/admin/sale-listings/${created.body.id}/reject`,
    {
      method: 'PATCH',
      body: JSON.stringify({ reason: 'Update the sale price.' }),
    },
    reviewerToken,
  );
  assert(
    rejected.body.listingStatus === 'REJECTED',
    'Reject transition failed',
  );

  const edited = await request<{ listingStatus: string }>(
    `/agent/listings/${created.body.id}`,
    { method: 'PATCH', body: JSON.stringify({ price: 330000 }) },
    agentToken,
  );
  assert(
    edited.body.listingStatus === 'REJECTED',
    'Rejected edit changed status early',
  );
  await request(
    `/agent/listings/${created.body.id}/submit`,
    { method: 'POST', body: '{}' },
    agentToken,
  );
  const approved = await request<{ listingStatus: string }>(
    `/admin/sale-listings/${created.body.id}/approve`,
    { method: 'PATCH', body: '{}' },
    reviewerToken,
  );
  assert(
    approved.body.listingStatus === 'APPROVED',
    'Approve transition failed',
  );
  const publicAfterApproval = await request<Array<{ id: string }>>(
    '/public/sale-listings',
  );
  assert(
    publicAfterApproval.body.some((item) => item.id === created.body.id),
    'Approved listing was not public',
  );

  const inquiryCreated = await request<{
    inquiry: { id: string; messages: Array<{ senderType: string }> };
    expiresAt: string;
  }>(`/public/sale-listings/${created.body.id}/inquiries`, {
    method: 'POST',
    body: JSON.stringify({
      buyerName: 'Phase Five Buyer',
      buyerEmail: `delivered+buyer-${suffix}@resend.dev`,
      buyerPhone: '816-555-0101',
      message: 'I would like to schedule a showing for this home.',
      website: '',
    }),
  });
  assert(
    inquiryCreated.response.status === 201,
    'Buyer inquiry creation failed',
  );
  inquiryIds.push(inquiryCreated.body.inquiry.id);
  const buyerCookie = inquiryCreated.response.headers
    .get('set-cookie')
    ?.split(';', 1)[0];
  assert(
    typeof buyerCookie === 'string' &&
      buyerCookie.startsWith(
      `jr_inquiry_${inquiryCreated.body.inquiry.id}=`,
      ),
    'Buyer inquiry access cookie was not issued',
  );
  assert(
    !JSON.stringify(inquiryCreated.body).includes('accessToken'),
    'Buyer access token was exposed in the response body',
  );
  assert(
    inquiryCreated.body.inquiry.messages[0]?.senderType === 'BUYER',
    'Initial buyer message was not created',
  );
  const secondInquiry = await request<{
    inquiry: { id: string };
  }>(`/public/sale-listings/${created.body.id}/inquiries`, {
    method: 'POST',
    body: JSON.stringify({
      buyerName: 'Pagination Buyer',
      buyerEmail: `delivered+pagination-buyer-${suffix}@resend.dev`,
      message: 'I am interested in learning more about this property.',
      website: '',
    }),
  });
  assert(
    secondInquiry.response.status === 201,
    'Second inquiry creation failed',
  );
  inquiryIds.push(secondInquiry.body.inquiry.id);
  const badBuyerAccess = await request(
    `/public/inquiries/${inquiryCreated.body.inquiry.id}/access`,
    {
      method: 'POST',
      body: '{}',
      headers: {
        Cookie: `jr_inquiry_${inquiryCreated.body.inquiry.id}=invalid-token`,
      },
    },
  );
  assert(
    badBuyerAccess.response.status === 404,
    'Invalid buyer token was accepted',
  );

  const agentInbox = await request<{
    items: Array<{ id: string }>;
    nextCursor: string | null;
  }>('/agent/inquiries?limit=1', {}, agentToken);
  assert(
    agentInbox.body.items.length === 1 && agentInbox.body.nextCursor,
    'Agent inquiry cursor page was not bounded',
  );
  const agentInboxPageTwo = await request<{
    items: Array<{ id: string }>;
    nextCursor: string | null;
  }>(
    `/agent/inquiries?limit=1&cursor=${agentInbox.body.nextCursor}`,
    {},
    agentToken,
  );
  assert(
    new Set(
      [...agentInbox.body.items, ...agentInboxPageTwo.body.items].map(
        (item) => item.id,
      ),
    ).has(inquiryCreated.body.inquiry.id),
    'Inquiry was not routed to the listing agent across cursor pages',
  );
  const otherAgentAccess = await request(
    `/agent/inquiries/${inquiryCreated.body.inquiry.id}`,
    {},
    otherAgentToken,
  );
  assert(
    otherAgentAccess.response.status === 404,
    'Another agent accessed the inquiry',
  );
  const markedRead = await request<{
    messages: Array<{ senderType: string; readAt?: string | null }>;
  }>(
    `/agent/inquiries/${inquiryCreated.body.inquiry.id}/read`,
    { method: 'POST', body: '{}' },
    agentToken,
  );
  assert(
    markedRead.body.messages.some(
      (message) => message.senderType === 'BUYER' && message.readAt,
    ),
    'Agent read receipt was not recorded',
  );
  await request(
    `/agent/inquiries/${inquiryCreated.body.inquiry.id}/read`,
    { method: 'POST', body: '{}' },
    agentToken,
  );
  const agentReply = await request<{
    messages: Array<{ senderType: string }>;
  }>(
    `/agent/inquiries/${inquiryCreated.body.inquiry.id}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: 'Yes, I can arrange a showing tomorrow.',
      }),
    },
    agentToken,
  );
  assert(
    agentReply.body.messages.at(-1)?.senderType === 'AGENT',
    'Agent reply was not recorded',
  );
  const buyerAccess = await request<{
    messages: Array<{ senderType: string; readAt?: string | null }>;
    nextMessageCursor: string | null;
  }>(`/public/inquiries/${inquiryCreated.body.inquiry.id}/access`, {
    method: 'POST',
    body: JSON.stringify({
      limit: 1,
    }),
    headers: { Cookie: buyerCookie },
  });
  assert(
    buyerAccess.body.messages.some(
      (message) => message.senderType === 'AGENT' && message.readAt,
    ),
    'Buyer read receipt was not recorded',
  );
  assert(
    buyerAccess.body.messages.length === 1 &&
      Boolean(buyerAccess.body.nextMessageCursor),
    'Buyer message thread was not cursor paginated',
  );
  const buyerReply = await request<{
    messages: Array<{ senderType: string }>;
  }>(`/public/inquiries/${inquiryCreated.body.inquiry.id}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      message: 'Tomorrow afternoon works for me.',
    }),
    headers: { Cookie: buyerCookie },
  });
  assert(
    buyerReply.body.messages.at(-1)?.senderType === 'BUYER',
    'Buyer reply was not recorded',
  );
  const messagePage = await request<{
    messages: Array<{ id: string; senderType: string }>;
    nextMessageCursor: string | null;
  }>(
    `/agent/inquiries/${inquiryCreated.body.inquiry.id}?limit=1`,
    {},
    agentToken,
  );
  assert(
    messagePage.body.messages.length === 1 &&
      messagePage.body.nextMessageCursor,
    'Agent message thread was not cursor paginated',
  );
  const olderMessagePage = await request<{
    messages: Array<{ id: string }>;
  }>(
    `/agent/inquiries/${inquiryCreated.body.inquiry.id}?limit=1&cursor=${messagePage.body.nextMessageCursor}`,
    {},
    agentToken,
  );
  assert(
    olderMessagePage.body.messages[0]?.id !== messagePage.body.messages[0]?.id,
    'Agent message cursor returned a duplicate page',
  );
  const oversight = await request<{
    items: Array<{ id: string }>;
    nextCursor: string | null;
  }>('/admin/inquiries?limit=1', {}, reviewerToken);
  assert(
    oversight.body.items.length === 1 && oversight.body.nextCursor,
    'Johnson Realty oversight cursor page was not bounded',
  );
  const tenantOversight = await request(
    '/admin/inquiries',
    {},
    tenantAdminToken,
  );
  assert(
    tenantOversight.response.status === 403,
    'Tenant admin accessed inquiry oversight',
  );
  const adminReplyAttempt = await request(
    `/agent/inquiries/${inquiryCreated.body.inquiry.id}/messages`,
    { method: 'POST', body: JSON.stringify({ message: 'Unauthorized reply' }) },
    reviewerToken,
  );
  assert(
    adminReplyAttempt.response.status === 403,
    'Oversight admin replied as an agent',
  );
  const closed = await request<{ status: string }>(
    `/agent/inquiries/${inquiryCreated.body.inquiry.id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status: 'CLOSED' }) },
    agentToken,
  );
  assert(closed.body.status === 'CLOSED', 'Inquiry close transition failed');
  const closedReply = await request(
    `/public/inquiries/${inquiryCreated.body.inquiry.id}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: 'This should not be accepted.',
      }),
      headers: { Cookie: buyerCookie },
    },
  );
  assert(
    closedReply.response.status === 400,
    'Closed inquiry accepted a reply',
  );
  const inquiryAuditRows = await prisma.auditLog.findMany({
    where: { resourceId: inquiryCreated.body.inquiry.id },
    select: { action: true },
  });
  const inquiryAuditCounts = inquiryAuditRows.reduce<Record<string, number>>(
    (counts, row) => ({
      ...counts,
      [row.action]: (counts[row.action] ?? 0) + 1,
    }),
    {},
  );
  const expectedInquiryAuditCounts = {
    LISTING_INQUIRY_CREATED: 1,
    INQUIRY_BUYER_MESSAGE_SENT: 2,
    INQUIRY_MESSAGES_READ: 1,
    INQUIRY_AGENT_MESSAGE_SENT: 1,
    INQUIRY_BUYER_MESSAGES_READ: 1,
    INQUIRY_STATUS_CHANGED: 1,
  };
  assert(
    JSON.stringify(
      Object.entries(inquiryAuditCounts).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ) ===
      JSON.stringify(
        Object.entries(expectedInquiryAuditCounts).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    'Inquiry audit action names or exact counts were incorrect',
  );

  const rereview = await request<{ listingStatus: string }>(
    `/agent/listings/${created.body.id}`,
    { method: 'PATCH', body: JSON.stringify({ price: 335000 }) },
    agentToken,
  );
  assert(
    rereview.body.listingStatus === 'PENDING_REVIEW',
    'Approved edit did not trigger re-review',
  );
  const hiddenAgain = await request<Array<{ id: string }>>(
    '/public/sale-listings',
  );
  assert(
    !hiddenAgain.body.some((item) => item.id === created.body.id),
    'Re-review listing remained public',
  );
  const listingAuditHistory = await request<Array<{ action: string }>>(
    `/admin/sale-listings/${created.body.id}/audit-history`,
    {},
    reviewerToken,
  );
  assert(
    JSON.stringify(listingAuditHistory.body.map((event) => event.action)) ===
      JSON.stringify([
        'SALE_LISTING_CREATED',
        'SALE_LISTING_PHOTO_ATTACHED',
        'SALE_LISTING_DOCUMENT_ATTACHED',
        'SALE_LISTING_SUBMITTED',
        'SALE_LISTING_REJECTED',
        'SALE_LISTING_UPDATED',
        'SALE_LISTING_RESUBMITTED',
        'SALE_LISTING_APPROVED',
        'SALE_LISTING_EDITED_AND_RESUBMITTED',
      ]),
    'Listing audit-history endpoint did not return the complete timeline',
  );

  const removedAccountDocument = await request<{
    verificationDocuments: string[];
  }>('/agents/me/documents/0', { method: 'DELETE' }, agentToken);
  assert(
    removedAccountDocument.response.status === 200 &&
      removedAccountDocument.body.verificationDocuments.length === 0,
    'Agent account document removal failed',
  );

  console.log('PHASE_3_TO_5_WORKFLOWS_VERIFIED');
}

main()
  .finally(async () => {
    for (const object of uploadedObjects) {
      await admin.storage.from(object.bucket).remove([object.path]);
    }
    if (listingIds.length) {
      await prisma.auditLog.deleteMany({
        where: { resourceId: { in: listingIds } },
      });
      await prisma.property.deleteMany({ where: { id: { in: listingIds } } });
    }
    if (inquiryIds.length) {
      await prisma.auditLog.deleteMany({
        where: { resourceId: { in: inquiryIds } },
      });
    }
    if (appUserIds.length) {
      await prisma.auditLog.deleteMany({
        where: { userId: { in: appUserIds } },
      });
      await prisma.agent.deleteMany({ where: { userId: { in: appUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: appUserIds } } });
    }
    for (const id of authUserIds) await admin.auth.admin.deleteUser(id);
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
