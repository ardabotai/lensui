import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicRoot = resolve(root, "apps/docs/public");

await copyIntoPublic("dist/lensui.stage.global.js");
await copyIntoPublic("README.md");
await copyIntoPublic("LICENSE");
await copyIntoPublic("NOTICE");
await copyIntoPublic("SECURITY.md");

async function copyIntoPublic(path) {
  const destination = resolve(publicRoot, path);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, path), destination);
}
