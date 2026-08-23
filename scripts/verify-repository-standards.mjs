import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { repositoryStandards } from "./repository-standards.config.mjs";

const repositoryFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  {
    encoding: "utf8",
  },
)
  .split("\0")
  .filter(Boolean);

const forbiddenNames = [
  /(?:^|\/)tmp(?:\/|$)/,
  /(?:^|\/)(?:dist|coverage|\.next)(?:\/|$)/,
  /(?:^|\/)[^/]+ 2\.(?:css|js|jsx|ts|tsx)$/,
  /(?:\.bak|\.old|\.orig|~)$/,
  /(?:^|\/)[^/]+_(?:copy|backup)(?:\.[^/]+)?$/i,
];

const productionSource = /^(?:backend|frontend)\/src\/.*\.(?:js|jsx|ts|tsx)$/;
const debugStatement = /\b(?:console\.(?:log|debug)|debugger)\b/;
const sourceBaseName = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const sourceDirectoryName = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*|\[[a-z0-9.-]+\]|_components)$/;
const publicAssetName = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+$/;
const violations = [];

for (const file of repositoryFiles) {
  if (!existsSync(file)) continue;

  if (/\s/.test(file)) {
    violations.push(`${file}: path contains whitespace`);
  }

  if (forbiddenNames.some((pattern) => pattern.test(file))) {
    violations.push(
      `${file}: forbidden temporary, duplicate, or generated path`,
    );
    continue;
  }

  if (productionSource.test(file)) {
    const source = readFileSync(file, "utf8");
    const relativeSourcePath = file.replace(/^(?:backend|frontend)\/src\//, "");
    const segments = relativeSourcePath.split("/");
    const fileName = basename(file)
      .replace(/\.(?:js|jsx|ts|tsx)$/, "")
      .replace(/\.spec$/, "");
    if (!sourceBaseName.test(fileName)) {
      violations.push(`${file}: source filename is not lowercase kebab/dot case`);
    }
    for (const directory of segments.slice(0, -1)) {
      if (!sourceDirectoryName.test(directory)) {
        violations.push(`${file}: invalid source directory name ${directory}`);
      }
    }

    const lineCount = source.split(/\r?\n/).length;
    const allowance = repositoryStandards.oversizedFileAllowances[file];
    const maximum = allowance?.maxLines ?? repositoryStandards.maxSourceLines;
    if (lineCount > maximum) {
      violations.push(`${file}: ${lineCount} lines exceeds maximum ${maximum}`);
    }
    if (debugStatement.test(source)) {
      violations.push(`${file}: production debug statement`);
    }
  }

  if (file.startsWith("frontend/public/") && !publicAssetName.test(basename(file))) {
    violations.push(`${file}: public asset filename is not lowercase kebab-case`);
  }
}

for (const [file, allowance] of Object.entries(
  repositoryStandards.oversizedFileAllowances,
)) {
  if (!existsSync(file)) {
    violations.push(`${file}: oversized-file allowance points to a missing file`);
  }
  if (allowance.reason.trim().length < 40) {
    violations.push(`${file}: oversized-file allowance needs a concrete reason`);
  }
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  `REPOSITORY_STANDARDS_VERIFIED (${repositoryFiles.length} repository files)\n`,
);
