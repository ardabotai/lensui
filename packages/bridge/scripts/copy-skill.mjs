import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const source = resolve(root, "skills/lensui/SKILL.md");
const destination = resolve(root, "packages/bridge/skills/lensui/SKILL.md");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
