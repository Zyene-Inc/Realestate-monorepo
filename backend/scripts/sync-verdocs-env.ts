import { chmod, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const backend = resolve(__dirname, '..');

function values(contents: string) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .filter((line) => line && !line.trimStart().startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

async function main() {
  const envPath = resolve(backend, '.env');
  const credentials = values(
    await readFile(resolve(backend, '.env.verdocs.credentials'), 'utf8'),
  );
  const generated = values(
    await readFile(resolve(backend, '.env.verdocs.generated'), 'utf8'),
  );
  const updates: Record<string, string> = {
    ...credentials,
    ...generated,
    ESIGNATURES_ENABLED: 'true',
    VERDOCS_API_BASE_URL: 'https://api.verdocs.com',
    VERDOCS_SENDER_NAME: '"Coach Johnson Realty"',
    VERDOCS_SENDER_EMAIL: 'support@coachjohnsonrealty.com',
  };
  let contents = await readFile(envPath, 'utf8');
  for (const [key, value] of Object.entries(updates)) {
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    contents = pattern.test(contents)
      ? contents.replace(pattern, `${key}=${value}`)
      : `${contents.trimEnd()}\n${key}=${value}\n`;
  }
  await writeFile(envPath, contents, { mode: 0o600 });
  await chmod(envPath, 0o600);
  console.log(`Synchronized ${Object.keys(updates).length} Verdocs settings.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
