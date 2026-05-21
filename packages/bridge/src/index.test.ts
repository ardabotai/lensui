import { once } from "node:events";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { clearRegistryFile, isLensBridgeEntrypoint, loadRegistryFromFile, saveRegistryToFile, startLensBridge } from "./index";

describe("@lensui/bridge", () => {
  it("routes authenticated render payloads to a scoped event stream", async () => {
    const server = startLensBridge({ port: 0 });
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server did not bind to a TCP port");
    const base = `http://127.0.0.1:${address.port}`;
    const controller = new AbortController();

    try {
      const events = await fetch(`${base}/session/lens-test/events?token=secret`, { signal: controller.signal });
      expect(events.ok).toBe(true);
      const reader = events.body?.getReader();
      if (!reader) throw new Error("missing event stream reader");

      const response = await fetch(`${base}/lens/lens-test/render`, {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json"
        },
        body: JSON.stringify({ lightcode: "0F|st=mono\n0V|Hello from your agent" })
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, clients: 1 });
      expect(await readUntil(reader, "Hello from your agent")).toContain("lensui");
    } finally {
      controller.abort();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("rejects posts with the wrong token", async () => {
    const server = startLensBridge({ port: 0 });
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server did not bind to a TCP port");
    const base = `http://127.0.0.1:${address.port}`;
    const controller = new AbortController();

    try {
      const events = await fetch(`${base}/session/lens-test/events?token=secret`, { signal: controller.signal });
      expect(events.ok).toBe(true);

      const response = await fetch(`${base}/lens/lens-test/render`, {
        method: "POST",
        headers: {
          authorization: "Bearer nope",
          "content-type": "application/json"
        },
        body: JSON.stringify({ lightcode: "0F|st=mono\n0V|Blocked" })
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ ok: false, error: "No connected LensUI container for that lensID/token." });
    } finally {
      controller.abort();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("persists LensUI registries to a local filesystem adapter", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lensui-registry-"));
    try {
      await saveRegistryToFile({
        components: [
          { name: "KPI", kind: "alias", trust: "agent-generated", source: "0M|tone=success" },
          { name: "Bad Name", kind: "alias", source: "0M" }
        ],
        styles: [
          { name: "MonoCompact", source: "0F|f=mono|d=compact\n0Y|panel|bg=card|bd=fg/28|p=4|r=2" }
        ],
        defaultStyle: "MonoCompact"
      }, { cwd: dir });

      const registry = await loadRegistryFromFile({ cwd: dir });
      expect(registry.components).toHaveLength(1);
      expect(registry.components[0]?.source).toContain("0@|KPI|M|tone=success");
      expect(registry.styles[0]?.name).toBe("MonoCompact");
      expect(registry.defaultStyle).toBe("MonoCompact");

      await clearRegistryFile({ cwd: dir });
      expect(await loadRegistryFromFile({ cwd: dir })).toEqual({ components: [], styles: [] });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects CLI entrypoints through symlinked npm bin paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lensui-bin-"));
    try {
      const realBin = join(dir, "bridge.js");
      const linkedBin = join(dir, "lensui");
      await writeFile(realBin, "#!/usr/bin/env node\n", "utf8");
      await symlink(realBin, linkedBin);

      expect(isLensBridgeEntrypoint(pathToFileURL(realBin).href, linkedBin)).toBe(true);
      expect(isLensBridgeEntrypoint(pathToFileURL(realBin).href, join(dir, "other"))).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

async function readUntil(reader: ReadableStreamDefaultReader<Uint8Array>, needle: string): Promise<string> {
  const decoder = new TextDecoder();
  let collected = "";
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    collected += decoder.decode(value, { stream: true });
    if (collected.includes(needle)) return collected;
  }
  throw new Error(`timed out waiting for ${needle}`);
}
