#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage:
  pnpm publish:npm [--dry-run] [--skip-build] [--otp 123456] [--tag latest]

Publishes ./packages/lensui to npm as the public \`@ardabot/lensui\` package.

Options:
  --dry-run       Show the tarball and publish target without publishing.
  --skip-build    Publish current package output without running pnpm build first.
  --otp <code>    Pass an npm one-time password for accounts using TOTP.
  --tag <tag>     Publish with a specific npm dist-tag. Defaults to latest.
  --provenance    Ask npm to publish with provenance.
  --help          Print this help.

Authentication:
  If .env or the environment contains NPM_TOKEN, the script writes a temporary
  npm userconfig and deletes it after publishing. Otherwise it uses your normal
  npm login/passkey session.
`;

function parseArgs(argv) {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  const result = {
    dryRun: false,
    skipBuild: false,
    otp: undefined,
    tag: undefined,
    provenance: false,
    extra: []
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      result.extra.push(...args.slice(index + 1));
      break;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    }
    if (arg === "--dry-run") result.dryRun = true;
    else if (arg === "--skip-build") result.skipBuild = true;
    else if (arg === "--provenance") result.provenance = true;
    else if (arg === "--otp") result.otp = args[++index];
    else if (arg.startsWith("--otp=")) result.otp = arg.slice("--otp=".length);
    else if (arg === "--tag") result.tag = args[++index];
    else if (arg.startsWith("--tag=")) result.tag = arg.slice("--tag=".length);
    else result.extra.push(arg);
  }

  return result;
}

async function loadDotEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;

  const source = await readFile(envPath, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  }
}

function run(command, args, options = {}) {
  const pretty = [command, ...args].join(" ");
  console.log(`\n$ ${pretty}`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    ...options
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const options = parseArgs(process.argv.slice(2));
await loadDotEnv();

let tempDir;
try {
  if (!options.skipBuild) run("pnpm", ["run", "build"]);

  const publishArgs = ["publish", "./packages/lensui", "--access", "public"];
  if (options.dryRun) publishArgs.push("--dry-run");
  if (options.otp) publishArgs.push(`--otp=${options.otp}`);
  if (options.tag) publishArgs.push("--tag", options.tag);
  if (options.provenance) publishArgs.push("--provenance");

  if (process.env.NPM_TOKEN) {
    tempDir = await mkdtemp(join(tmpdir(), "lensui-npm-"));
    const userConfig = join(tempDir, "npmrc");
    await writeFile(
      userConfig,
      `registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`,
      { mode: 0o600 }
    );
    publishArgs.push("--userconfig", userConfig);
  }

  publishArgs.push(...options.extra);
  run("npm", publishArgs);
} finally {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
}
