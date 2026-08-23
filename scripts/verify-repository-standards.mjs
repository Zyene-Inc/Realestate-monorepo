import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

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
const violations = [];

for (const file of repositoryFiles) {
  if (!existsSync(file)) continue;

  if (forbiddenNames.some((pattern) => pattern.test(file))) {
    violations.push(
      `${file}: forbidden temporary, duplicate, or generated path`,
    );
    continue;
  }

  if (productionSource.test(file)) {
    const source = readFileSync(file, "utf8");
    if (debugStatement.test(source)) {
      violations.push(`${file}: production debug statement`);
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  `REPOSITORY_STANDARDS_VERIFIED (${repositoryFiles.length} repository files)\n`,
);
