import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  AgentAccountStatus,
  PrismaClient,
  Role,
  UserStatus,
} from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const apiUrl = process.env.VERIFY_API_URL || 'http://127.0.0.1:3013/api';
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
const agentEmail = `delivered+phase2-agent-${suffix}@resend.dev`;
const reviewerEmail = `delivered+phase2-reviewer-${suffix}@resend.dev`;
const authUserIds: string[] = [];
const appUserIds: string[] = [];
let agentId: string | undefined;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

async function signIn(email: string) {
  const client = createClient(supabaseUrl!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return {
    client,
    ...(await client.auth.signInWithPassword({ email, password })),
  };
}

async function main() {
  const { data: reviewerAuth, error: reviewerAuthError } =
    await admin.auth.admin.createUser({
      email: reviewerEmail,
      password,
      email_confirm: true,
    });
  if (reviewerAuthError || !reviewerAuth.user) {
    throw reviewerAuthError || new Error('Reviewer auth user was not created');
  }
  authUserIds.push(reviewerAuth.user.id);
  const reviewer = await prisma.user.create({
    data: {
      authUserId: reviewerAuth.user.id,
      email: reviewerEmail,
      role: Role.SALES_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  appUserIds.push(reviewer.id);
  const reviewerSignIn = await signIn(reviewerEmail);
  if (reviewerSignIn.error || !reviewerSignIn.data.session) {
    throw reviewerSignIn.error || new Error('Reviewer sign-in failed');
  }
  const reviewerToken = reviewerSignIn.data.session.access_token;

  const signup = await request<{ success: boolean }>('/auth/agent-signup', {
    method: 'POST',
    body: JSON.stringify({
      email: agentEmail,
      password,
      companyName: `Phase 2 Realty ${suffix}`,
      contactName: 'Phase Two Agent',
      phone: '816-555-0123',
    }),
  });
  assert(
    signup.response.status === 201 && signup.body.success,
    'Public agent signup failed',
  );

  const agentUser = await prisma.user.findUnique({
    where: { email: agentEmail },
    include: { agentProfile: true },
  });
  assert(agentUser?.agentProfile, 'Pending agent profile was not created');
  appUserIds.push(agentUser.id);
  authUserIds.push(agentUser.authUserId);
  agentId = agentUser.agentProfile.id;
  assert(
    agentUser.agentProfile.accountStatus === AgentAccountStatus.PENDING,
    'Agent signup was not placed in pending review',
  );

  const unverifiedSignIn = await signIn(agentEmail);
  assert(
    Boolean(unverifiedSignIn.error) && !unverifiedSignIn.data.session,
    'Unverified agent received a Supabase session',
  );
  const prematureApproval = await request(
    `/agents/${agentId}/approve`,
    { method: 'PATCH', body: JSON.stringify({}) },
    reviewerToken,
  );
  assert(
    prematureApproval.response.status === 400,
    'Sales Admin approved an unverified agent email',
  );

  const { error: confirmationError } = await admin.auth.admin.updateUserById(
    agentUser.authUserId,
    { email_confirm: true },
  );
  if (confirmationError) throw confirmationError;
  const agentSignIn = await signIn(agentEmail);
  if (agentSignIn.error || !agentSignIn.data.session) {
    throw agentSignIn.error || new Error('Verified agent sign-in failed');
  }
  const agentToken = agentSignIn.data.session.access_token;

  const decline = await request<{ accountStatus: AgentAccountStatus }>(
    `/agents/${agentId}/decline`,
    {
      method: 'PATCH',
      body: JSON.stringify({ reason: 'Upload a current company license' }),
    },
    reviewerToken,
  );
  assert(
    decline.response.status === 200 &&
      decline.body.accountStatus === AgentAccountStatus.DECLINED,
    'Sales Admin decline transition failed',
  );

  const profileUpdate = await request<{ companyName: string }>(
    '/agents/me',
    {
      method: 'PATCH',
      body: JSON.stringify({
        companyName: `Phase 2 Updated Realty ${suffix}`,
        contactName: 'Phase Two Agent',
        phone: '816-555-0199',
      }),
    },
    agentToken,
  );
  assert(
    profileUpdate.response.status === 200 &&
      profileUpdate.body.companyName === `Phase 2 Updated Realty ${suffix}`,
    'Declined agent could not update the application',
  );

  const resubmission = await request<{ accountStatus: AgentAccountStatus }>(
    '/agents/me/resubmit',
    { method: 'POST', body: JSON.stringify({}) },
    agentToken,
  );
  assert(
    resubmission.response.status === 201 &&
      resubmission.body.accountStatus === AgentAccountStatus.PENDING,
    'Declined agent resubmission failed',
  );

  const secondResubmission = await request(
    '/agents/me/resubmit',
    { method: 'POST', body: JSON.stringify({}) },
    agentToken,
  );
  assert(
    secondResubmission.response.status === 400,
    'Pending agent was able to resubmit twice',
  );

  const approval = await request<{ accountStatus: AgentAccountStatus }>(
    `/agents/${agentId}/approve`,
    { method: 'PATCH', body: JSON.stringify({}) },
    reviewerToken,
  );
  assert(
    approval.response.status === 200 &&
      approval.body.accountStatus === AgentAccountStatus.APPROVED,
    'Verified resubmitted agent approval failed',
  );

  const auditEvents = await prisma.auditLog.findMany({
    where: { resource: 'agent', resourceId: agentId },
    orderBy: { createdAt: 'asc' },
    select: { action: true },
  });
  assert(
    JSON.stringify(auditEvents.map(({ action }) => action)) ===
      JSON.stringify([
        'AGENT_REGISTERED',
        'AGENT_DECLINED',
        'AGENT_PROFILE_UPDATED',
        'AGENT_RESUBMITTED',
        'AGENT_APPROVED',
      ]),
    'Agent onboarding audit actions were incomplete or out of order',
  );

  const persistedSession = await agentSignIn.client.auth.getSession();
  assert(
    !persistedSession.error &&
      persistedSession.data.session?.access_token === agentToken,
    'Verified agent session was not retrievable after sign-in',
  );

  const passwordReset = await request<{ success: boolean }>(
    '/auth/password-reset-request',
    {
      method: 'POST',
      body: JSON.stringify({ email: agentEmail }),
    },
  );
  assert(
    passwordReset.response.status === 201 && passwordReset.body.success,
    'Password reset request failed',
  );

  const compromisedPassword = await request(
    '/auth/password-reset-complete',
    {
      method: 'POST',
      body: JSON.stringify({ password: 'Password123!' }),
    },
    agentToken,
  );
  assert(
    compromisedPassword.response.status === 400,
    'Known breached password was accepted',
  );
  const replacementPassword = `Replacement-${randomUUID()}!9aA`;
  const completedReset = await request<{ success: boolean }>(
    '/auth/password-reset-complete',
    {
      method: 'POST',
      body: JSON.stringify({ password: replacementPassword }),
    },
    agentToken,
  );
  assert(
    completedReset.response.status === 201 && completedReset.body.success,
    'Protected password reset completion failed',
  );
  const replacementSignIn = await agentSignIn.client.auth.signInWithPassword({
    email: agentEmail,
    password: replacementPassword,
  });
  assert(
    !replacementSignIn.error && Boolean(replacementSignIn.data.session),
    'Replacement password did not create a Supabase session',
  );

  const { error: agentSignOutError } = await agentSignIn.client.auth.signOut();
  if (agentSignOutError) throw agentSignOutError;
  const sessionAfterSignOut = await agentSignIn.client.auth.getSession();
  assert(
    !sessionAfterSignOut.error && !sessionAfterSignOut.data.session,
    'Agent session remained available after sign-out',
  );

  const { error: reviewerSignOutError } =
    await reviewerSignIn.client.auth.signOut();
  if (reviewerSignOutError) throw reviewerSignOutError;

  console.log('PHASE_2_AGENT_ONBOARDING_VERIFIED');
}

main()
  .finally(async () => {
    if (agentId) {
      await prisma.auditLog.deleteMany({ where: { resourceId: agentId } });
    }
    if (appUserIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { userId: { in: appUserIds } },
      });
      await prisma.agent.deleteMany({ where: { userId: { in: appUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: appUserIds } } });
    }
    for (const authUserId of authUserIds) {
      await admin.auth.admin.deleteUser(authUserId);
    }
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
