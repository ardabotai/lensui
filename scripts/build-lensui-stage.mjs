import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const outfile = resolve(root, "dist/lensui.stage.global.js");
await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: [resolve(root, "packages/html/src/stage-global.ts")],
  bundle: true,
  outfile,
  format: "iife",
  globalName: "LensUIBundle",
  platform: "browser",
  target: "es2020",
  sourcemap: false,
  minify: false,
  legalComments: "none"
});

console.log(`built ${outfile}`);
