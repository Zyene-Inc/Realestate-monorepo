import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ledgerPath = resolve(repositoryRoot, "docs/database-migration-ledger.json");
const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
const violations = [];
const versions = new Set();
const names = new Set();
const mappedSources = new Set();

if (!/^\w{20}$/.test(ledger.projectRef)) {
  violations.push("projectRef must be a 20-character Supabase project reference");
}
if (ledger.authority !== "supabase_migrations.schema_migrations") {
  violations.push("the live Supabase migration table must remain authoritative");
}

for (const migration of ledger.applied) {
  if (!/^\d{14}$/.test(migration.version)) {
    violations.push(`${migration.name}: migration version must contain 14 digits`);
  }
  if (!/^[a-z0-9_]+$/.test(migration.name)) {
    violations.push(`${migration.version}: migration name must be snake_case`);
  }
  if (versions.has(migration.version)) {
    violations.push(`${migration.version}: duplicate applied version`);
  }
  if (names.has(migration.name)) {
    violations.push(`${migration.name}: duplicate applied name`);
  }
  versions.add(migration.version);
  names.add(migration.name);

  if (!Array.isArray(migration.sources) || migration.sources.length === 0) {
    violations.push(`${migration.name}: no checked-in SQL source`);
  }
  for (const source of migration.sources) {
    if (mappedSources.has(source)) {
      violations.push(`${source}: mapped to more than one live migration`);
    }
    mappedSources.add(source);
    if (!existsSync(resolve(repositoryRoot, source))) {
      violations.push(`${migration.name}: missing source ${source}`);
    }
  }
}

for (const exception of ledger.legacyExceptions) {
  if (!exception.reason || !exception.status) {
    violations.push(`${exception.source}: incomplete legacy exception`);
  }
  if (mappedSources.has(exception.source)) {
    violations.push(`${exception.source}: cannot be both applied and exceptional`);
  }
  mappedSources.add(exception.source);
  if (!existsSync(resolve(repositoryRoot, exception.source))) {
    violations.push(`${exception.source}: missing exceptional SQL source`);
  }
}

const checkedInSql = execFileSync(
  "git",
  [
    "ls-files",
    "supabase/migrations/*.sql",
    "backend/prisma/migrations/*/migration.sql",
  ],
  { cwd: repositoryRoot, encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);

for (const source of checkedInSql) {
  if (!mappedSources.has(source)) {
    violations.push(`${source}: migration SQL is absent from the ledger`);
  }
}
for (const source of mappedSources) {
  if (!checkedInSql.includes(source)) {
    violations.push(`${source}: ledger source is not tracked by Git`);
  }
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  `MIGRATION_LEDGER_VERIFIED (${ledger.applied.length} applied, ${ledger.legacyExceptions.length} explicit exception)\n`,
);
