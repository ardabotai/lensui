import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = resolve(root, ".vercel/output");
const staticRoot = resolve(output, "static");
const nextOut = resolve(root, "apps/docs/out");

await rm(output, { recursive: true, force: true });
await mkdir(staticRoot, { recursive: true });
await cp(nextOut, staticRoot, { recursive: true });

await writeFile(
  resolve(output, "config.json"),
  `${JSON.stringify({
    version: 3,
    routes: [
      { src: "^/components/?$", dest: "/components.html" },
      { src: "^/specimens/?$", dest: "/specimens.html" },
      { src: "^/demo/?$", dest: "/demo.html" },
      { src: "^/benchmarks/?$", dest: "/benchmarks.html" },
      { src: "^/agents/?$", dest: "/agents.html" },
      { src: "^/security/?$", dest: "/security.html" }
    ]
  }, null, 2)}\n`
);

console.log(`built ${staticRoot}`);
