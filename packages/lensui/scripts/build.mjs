import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const outdir = resolve(root, "packages/lensui/dist");
const skillSource = resolve(root, "skills/lensui/SKILL.md");
const skillDestination = resolve(root, "packages/lensui/skills/lensui/SKILL.md");

await mkdir(outdir, { recursive: true });
await copyFile(resolve(root, "LICENSE"), resolve(root, "packages/lensui/LICENSE"));
await copyFile(resolve(root, "NOTICE"), resolve(root, "packages/lensui/NOTICE"));
await copyFile(resolve(root, "README.md"), resolve(root, "packages/lensui/README.md"));

const browserTargets = [
  ["index", "packages/lensui/src/index.ts"],
  ["core", "packages/core/src/index.ts"],
  ["html", "packages/html/src/index.ts"],
  ["stage-global", "packages/html/src/stage-global.ts"],
  ["client", "packages/client/src/index.ts"],
  ["mcp-server", "packages/mcp-server/src/index.ts"],
  ["byok", "packages/byok/src/index.ts"]
];

for (const [name, source] of browserTargets) {
  await build({
    entryPoints: [resolve(root, source)],
    bundle: true,
    outfile: resolve(outdir, `${name}.js`),
    format: "esm",
    platform: "browser",
    target: "es2020",
    sourcemap: true,
    legalComments: "none"
  });
}

await build({
  entryPoints: [resolve(root, "packages/bridge/src/index.ts")],
  bundle: true,
  outfile: resolve(outdir, "bridge.js"),
  format: "esm",
  platform: "node",
  target: "node18",
  sourcemap: true,
  legalComments: "none"
});

await build({
  entryPoints: [resolve(root, "packages/html/src/stage-global.ts")],
  bundle: true,
  outfile: resolve(outdir, "lensui.stage.global.js"),
  format: "iife",
  globalName: "LensUIBundle",
  platform: "browser",
  target: "es2020",
  sourcemap: false,
  legalComments: "none"
});

await writeFile(resolve(outdir, "index.d.ts"), [
  'export * from "./core.js";',
  'export { BrowserLensStageRuntime, LensHTMLRenderer, createStageRuntime } from "./html.js";',
  'export type { LensStageRuntime, LensStageSizeDetail, LensStageSizingMode } from "./html.js";',
  'export { LensClientConnection } from "./client.js";',
  'export type { LensClientOptions } from "./client.js";',
  'export { LensMCPBridge } from "./mcp-server.js";',
  'export type { LensClientBinding, LensSessionContext, LensSessionResolver } from "./mcp-server.js";',
  'export { LensBYOKRuntime } from "./byok.js";',
  'export type { LensAgentRuntime, LensInferenceConfig, LensModelProvider } from "./byok.js";',
  ""
].join("\n"));

await copyDeclaration("core", "core");
await copyDeclaration("html", "html", (source) => source.replaceAll('"@lensui/core"', '"./core.js"'));
await copyDeclaration("client", "client");
await copyDeclaration("mcp-server", "mcp-server");
await copyDeclaration("byok", "byok");
await copyDeclaration("bridge", "bridge");
await copyDeclaration("html", "stage-global", (source) => source.replaceAll('"./index"', '"./html.js"'));
await mkdir(dirname(skillDestination), { recursive: true });
await copyFile(skillSource, skillDestination);

async function copyDeclaration(packageName, outputName, rewrite = (source) => source) {
  const source = await readFile(resolve(root, `packages/${packageName}/dist/${outputName === "stage-global" ? "stage-global" : "index"}.d.ts`), "utf8");
  await writeFile(resolve(outdir, `${outputName}.d.ts`), rewrite(source));
}
