import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type TableSecurityRow = {
  tableName: string;
  rlsEnabled: boolean;
};

type ColumnRow = {
  tableName: string;
  columnName: string;
};

type BucketRow = {
  id: string;
  public: boolean;
  fileSizeLimit: number | null;
  allowedMimeTypes: string[] | null;
};

async function main() {
  const [
    enumRows,
    tables,
    browserRoleGrants,
    columns,
    indexes,
    bucket,
    policy,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ enumlabel: string }>>`
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = '"AnnouncementAudience"'::regtype
        ORDER BY enumsortorder
      `,
    prisma.$queryRaw<TableSecurityRow[]>`
        SELECT relname AS "tableName", relrowsecurity AS "rlsEnabled"
        FROM pg_class
        WHERE relnamespace = 'public'::regnamespace
          AND relname IN (
            'Announcement',
            'Document',
            'Notification',
            'AnnouncementAcknowledgement'
          )
      `,
    prisma.$queryRaw<Array<{ tableName: string }>>`
        SELECT table_name AS "tableName"
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND table_name IN (
            'Announcement',
            'Document',
            'Notification',
            'AnnouncementAcknowledgement'
          )
          AND grantee IN ('anon', 'authenticated')
      `,
    prisma.$queryRaw<ColumnRow[]>`
        SELECT table_name AS "tableName", column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'Announcement' AND column_name IN ('audience', 'requiresAcknowledgement'))
            OR (table_name = 'Document' AND column_name = 'uploadedByUserId')
            OR (table_name = 'Notification' AND column_name IN ('href', 'readAt'))
          )
      `,
    prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'Announcement_audience_createdAt_id_idx',
            'Document_uploadedByUserId_idx',
            'Notification_userId_isRead_createdAt_id_idx',
            'AnnouncementAcknowledgement_userId_acknowledgedAt_idx'
          )
      `,
    prisma.$queryRaw<BucketRow[]>`
        SELECT
          id,
          public,
          file_size_limit AS "fileSizeLimit",
          allowed_mime_types AS "allowedMimeTypes"
        FROM storage.buckets
        WHERE id = 'tenant-documents'
      `,
    prisma.$queryRaw<
      Array<{
        cmd: string;
        roles: string[];
        hasUsing: boolean;
        hasWithCheck: boolean;
      }>
    >`
        SELECT
          cmd,
          roles,
          qual IS NOT NULL AS "hasUsing",
          with_check IS NOT NULL AS "hasWithCheck"
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Service role manages tenant documents'
      `,
  ]);

  assert(
    enumRows.map((row) => row.enumlabel).join(',') === 'TENANT,AGENT',
    'AnnouncementAudience is missing or has unexpected values',
  );

  const requiredTables = [
    'Announcement',
    'Document',
    'Notification',
    'AnnouncementAcknowledgement',
  ];
  assert(
    requiredTables.every((tableName) =>
      tables.some((row) => row.tableName === tableName && row.rlsEnabled),
    ),
    'One or more tenant-document/notification tables do not have RLS enabled',
  );
  assert(
    browserRoleGrants.length === 0,
    'anon or authenticated retains direct privileges on tenant-document/notification tables',
  );

  const requiredColumns = [
    'Announcement.audience',
    'Announcement.requiresAcknowledgement',
    'Document.uploadedByUserId',
    'Notification.href',
    'Notification.readAt',
  ];
  const presentColumns = new Set(
    columns.map((row) => `${row.tableName}.${row.columnName}`),
  );
  assert(
    requiredColumns.every((column) => presentColumns.has(column)),
    'One or more tenant-document/notification columns are missing',
  );
  assert(
    indexes.length === 4,
    'One or more tenant-document/notification indexes are missing',
  );

  const tenantDocumentsBucket = bucket[0];
  assert(
    tenantDocumentsBucket &&
      !tenantDocumentsBucket.public &&
      tenantDocumentsBucket.fileSizeLimit === 10 * 1024 * 1024 &&
      tenantDocumentsBucket.allowedMimeTypes?.sort().join(',') ===
        ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].join(','),
    'tenant-documents bucket is missing or has an unexpected privacy/type/size policy',
  );
  assert(
    policy.length === 1 &&
      policy[0].cmd === 'ALL' &&
      policy[0].roles.includes('service_role') &&
      policy[0].hasUsing &&
      policy[0].hasWithCheck,
    'tenant-documents storage service-role policy is missing or incomplete',
  );

  console.log(
    'TENANT_DOCUMENTS_AND_NOTIFICATIONS_VERIFIED: schema, RLS, grants, indexes, and private storage policy are correct.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
