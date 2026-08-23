import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { EmailsService } from '../src/emails/emails.service';

const prisma = new PrismaClient();
const pause = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  const suffix = Date.now().toString(36);
  const eventKey = `phase7-live-${suffix}`;
  const recipient = `delivered+${suffix}@resend.dev`;
  const service = new EmailsService(
    new ConfigService(process.env),
    prisma as never,
  );
  let logId: string | undefined;

  try {
    const sent = await service.sendTemplate(
      recipient,
      'account.password_reset',
      { url: 'https://coachjohnsonrealty.com/auth/reset-password' },
      eventKey,
    );
    if (!sent) throw new Error('The email was not persisted');
    logId = sent.id;
    if (!sent.resendEmailId) throw new Error('Resend did not accept the email');

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const log = await prisma.emailLog.findUnique({
        where: { id: logId },
        include: { events: { orderBy: { providerCreatedAt: 'asc' } } },
      });
      if (log?.status === 'DELIVERED') {
        const eventTypes = log.events.map(({ type }) => type);
        if (!log.deliveredAt || !eventTypes.includes('email.delivered')) {
          throw new Error('Delivery status was not backed by a webhook event');
        }
        console.info(
          `PHASE7_EMAIL_VERIFIED status=${log.status} attempts=${log.attemptCount} events=${eventTypes.join(',')}`,
        );
        return;
      }
      await pause(2_000);
    }
    throw new Error('Timed out waiting for the Resend delivery webhook');
  } finally {
    if (logId) {
      await prisma.emailLog.deleteMany({ where: { id: logId } });
      const remaining = await prisma.emailLog.count({ where: { id: logId } });
      if (remaining !== 0) {
        console.error('Verification email cleanup failed');
        process.exitCode = 1;
      } else {
        console.info('PHASE7_EMAIL_TEST_DATA_CLEANED');
      }
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
