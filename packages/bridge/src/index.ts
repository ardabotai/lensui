#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type LensBridgeOptions = {
  host?: string;
  port?: number;
};

export type LensFileRegistryOptions = {
  file?: string;
  cwd?: string;
};

export type LensBridgeComponentKind = "alias" | "html" | "react" | "swiftui";
export type LensBridgeComponentTrust = "built-in" | "user-saved" | "agent-generated" | "remote-imported";

export interface LensBridgeComponentDefinition {
  name: string;
  aliases?: string[];
  kind: LensBridgeComponentKind;
  source: string;
  options?: Record<string, string>;
  trust?: LensBridgeComponentTrust;
}

export interface LensBridgeStyleDefinition {
  name: string;
  aliases?: string[];
  source: string;
  options?: Record<string, string>;
  trust?: LensBridgeComponentTrust;
}

export interface LensUISavedRegistry {
  components: LensBridgeComponentDefinition[];
  styles: LensBridgeStyleDefinition[];
  defaultStyle?: string;
}

type LensBridgeClient = {
  id: string;
  token: string;
  response: ServerResponse;
  connectedAt: number;
};

type BridgeMessage =
  | { type: "render"; requestID: string; lightcode: string }
  | { type: "apply"; requestID: string; commandStream: string };

const defaultHost = "127.0.0.1";
const defaultPort = 5743;
const maxBodyBytes = 512 * 1024;
const defaultRegistryRelativePath = ".lensui/registry.json";

export function defaultLensRegistryPath(options: LensFileRegistryOptions = {}): string {
  return resolve(options.cwd ?? process.cwd(), options.file ?? defaultRegistryRelativePath);
}

export async function loadRegistryFromFile(options: LensFileRegistryOptions = {}): Promise<LensUISavedRegistry> {
  try {
    const raw = await readFile(defaultLensRegistryPath(options), "utf8");
    return normalizeSavedRegistry(JSON.parse(raw));
  } catch {
    return emptySavedRegistry();
  }
}

export async function saveRegistryToFile(registry: LensUISavedRegistry, options: LensFileRegistryOptions = {}): Promise<void> {
  const file = defaultLensRegistryPath(options);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(normalizeSavedRegistry(registry), null, 2)}\n`, "utf8");
}

export async function clearRegistryFile(options: LensFileRegistryOptions = {}): Promise<void> {
  await rm(defaultLensRegistryPath(options), { force: true });
}

export function startLensBridge(options: LensBridgeOptions = {}) {
  const host = options.host ?? defaultHost;
  const port = options.port ?? defaultPort;
  const sessions = new Map<string, Map<string, LensBridgeClient>>();

  const server = createServer(async (request, response) => {
    setCORS(response);
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
    const parts = url.pathname.split("/").filter(Boolean);

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        writeJSON(response, 200, { ok: true, service: "lensui-bridge" });
        return;
      }

      if (request.method === "GET" && url.pathname === "/skill") {
        response.writeHead(200, { "content-type": "text/markdown; charset=utf-8" });
        response.end(readSkill());
        return;
      }

      if (request.method === "GET" && parts[0] === "session" && parts[2] === "events") {
        openEventStream(sessions, parts[1], tokenFromRequest(request, url), response);
        return;
      }

      if (request.method === "POST" && parts[0] === "lens" && parts[2] === "render") {
        const body = await readBody(request);
        const lightcode = parseTextPayload(body, "lightcode");
        const count = broadcast(sessions, parts[1], tokenFromRequest(request, url), {
          type: "render",
          requestID: randomUUID(),
          lightcode
        });
        writeJSON(response, count > 0 ? 200 : 404, count > 0 ? { ok: true, clients: count } : { ok: false, error: "No connected LensUI container for that lensID/token." });
        return;
      }

      if (request.method === "POST" && parts[0] === "lens" && parts[2] === "apply") {
        const body = await readBody(request);
        const commandStream = parseTextPayload(body, "commandStream");
        const count = broadcast(sessions, parts[1], tokenFromRequest(request, url), {
          type: "apply",
          requestID: randomUUID(),
          commandStream
        });
        writeJSON(response, count > 0 ? 200 : 404, count > 0 ? { ok: true, clients: count } : { ok: false, error: "No connected LensUI container for that lensID/token." });
        return;
      }

      writeJSON(response, 404, { ok: false, error: "Not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeJSON(response, 400, { ok: false, error: message });
    }
  });

  server.listen(port, host, () => {
    const address = server.address();
    const boundPort = address && typeof address === "object" ? address.port : port;
    console.log(`LensUI bridge listening on http://${host}:${boundPort}`);
    console.log("Open a LensUI demo target, then paste its generated agent instructions into your coding agent.");
  });

  return server;
}

function openEventStream(
  sessions: Map<string, Map<string, LensBridgeClient>>,
  lensID: string | undefined,
  token: string,
  response: ServerResponse
): void {
  if (!lensID) throw new Error("Missing lensID.");
  if (!token) throw new Error("Missing token.");

  response.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no"
  });
  response.write(`event: ready\ndata: ${JSON.stringify({ lensID })}\n\n`);

  const client: LensBridgeClient = {
    id: randomUUID(),
    token,
    response,
    connectedAt: Date.now()
  };
  const clients = sessions.get(lensID) ?? new Map<string, LensBridgeClient>();
  clients.set(client.id, client);
  sessions.set(lensID, clients);

  const heartbeat = setInterval(() => {
    response.write(`: heartbeat ${Date.now()}\n\n`);
  }, 15000);

  response.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(client.id);
    if (clients.size === 0) sessions.delete(lensID);
  });
}

function broadcast(sessions: Map<string, Map<string, LensBridgeClient>>, lensID: string | undefined, token: string, message: BridgeMessage): number {
  if (!lensID) throw new Error("Missing lensID.");
  if (!token) throw new Error("Missing token.");
  const clients = sessions.get(lensID);
  if (!clients) return 0;
  let count = 0;
  for (const client of clients.values()) {
    if (client.token !== token) continue;
    client.response.write(`event: lensui\ndata: ${JSON.stringify(message)}\n\n`);
    count += 1;
  }
  return count;
}

function parseTextPayload(body: string, key: "lightcode" | "commandStream"): string {
  const trimmed = body.trim();
  if (!trimmed) throw new Error(`Missing ${key}.`);
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const value = parsed[key] ?? parsed.c ?? parsed.dsl;
    if (typeof value === "string" && value.trim()) return value;
  } catch {}
  return body;
}

function tokenFromRequest(request: IncomingMessage, url: URL): string {
  const authorization = request.headers.authorization ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer ?? String(request.headers["x-lensui-token"] ?? url.searchParams.get("token") ?? "");
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buffer.byteLength;
    if (total > maxBodyBytes) throw new Error("Request body too large.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function emptySavedRegistry(): LensUISavedRegistry {
  return { components: [], styles: [] };
}

function normalizeSavedRegistry(value: unknown): LensUISavedRegistry {
  const record = objectRecord(value) ?? {};
  const components = (Array.isArray(record.components) ? record.components : [])
    .map(componentFromUnknown)
    .filter((component): component is LensBridgeComponentDefinition => Boolean(component));
  const styles = (Array.isArray(record.styles) ? record.styles : [])
    .map(styleFromUnknown)
    .filter((style): style is LensBridgeStyleDefinition => Boolean(style));
  const registry: LensUISavedRegistry = { components: dedupeByName(components), styles: dedupeByName(styles) };
  const defaultStyle = typeof record.defaultStyle === "string" ? record.defaultStyle.trim() : "";
  if (defaultStyle && (registry.styles.some((style) => matchesName(style, defaultStyle)) || builtinStyleNames.has(defaultStyle.toLowerCase()))) {
    registry.defaultStyle = defaultStyle;
  }
  return registry;
}

function componentFromUnknown(value: unknown): LensBridgeComponentDefinition | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;
  const name = validName(record.name);
  const kind = componentKind(record.kind);
  const source = typeof record.source === "string" ? record.source.trim() : "";
  if (!name || !kind || !source) return undefined;
  const aliases = stringArray(record.aliases).map(validName).filter((alias): alias is string => Boolean(alias));
  return {
    name,
    aliases,
    kind,
    source: kind === "alias" ? normalizedAliasSource(name, aliases, source) : source,
    options: stringRecord(record.options),
    trust: componentTrust(record.trust) ?? "agent-generated"
  };
}

function styleFromUnknown(value: unknown): LensBridgeStyleDefinition | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;
  const name = validName(record.name);
  const source = typeof record.source === "string" ? record.source.trim() : "";
  if (!name || !source) return undefined;
  return {
    name,
    aliases: stringArray(record.aliases).map(validName).filter((alias): alias is string => Boolean(alias)),
    source,
    options: stringRecord(record.options),
    trust: componentTrust(record.trust) ?? "agent-generated"
  };
}

function normalizedAliasSource(name: string, aliases: string[], source: string): string {
  const first = source.split("\n").find((line) => line.trim());
  if (!first) return source;
  const body = first[0] && /^[0-9a-z]/.test(first[0]) ? first.slice(1) : first;
  if (body.startsWith("@|") || body.startsWith("def|") || body.startsWith("alias|")) return source;
  return `0@|${[name, ...aliases].join(",")}|${body}`;
}

function componentKind(value: unknown): LensBridgeComponentKind | undefined {
  switch (String(value ?? "").toLowerCase()) {
    case "a": case "alias": return "alias";
    case "h": case "html": return "html";
    case "r": case "react": return "react";
    case "s": case "swiftui": case "native": return "swiftui";
    default: return undefined;
  }
}

function componentTrust(value: unknown): LensBridgeComponentTrust | undefined {
  switch (String(value ?? "").toLowerCase()) {
    case "b": case "built-in": return "built-in";
    case "u": case "user-saved": return "user-saved";
    case "g": case "agent-generated": return "agent-generated";
    case "m": case "remote-imported": return "remote-imported";
    default: return undefined;
  }
}

function validName(value: unknown): string | undefined {
  const name = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]+$/.test(name) ? name : undefined;
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function stringRecord(value: unknown): Record<string, string> {
  const record = objectRecord(value);
  if (!record) return {};
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function dedupeByName<T extends { name: string }>(values: T[]): T[] {
  return Array.from(new Map(values.map((value) => [value.name.toLowerCase(), value])).values());
}

function matchesName(value: { name: string; aliases?: string[] }, name: string): boolean {
  const lower = name.toLowerCase();
  return value.name.toLowerCase() === lower || (value.aliases ?? []).some((alias) => alias.toLowerCase() === lower);
}

const builtinStyleNames = new Set(["neutral", "mono", "studio", "paper", "gallery", "terminal"]);

function writeJSON(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(body)}\n`);
}

function setCORS(response: ServerResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization,content-type,x-lensui-token");
}

function readSkill(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(resolve(here, "../skills/lensui/SKILL.md"), "utf8");
}

function parseCLI(argv: string[]): LensBridgeOptions & { command: "serve" | "skill" } {
  const [first, ...rest] = argv;
  const command = first === "skill" ? "skill" : "serve";
  const args = command === "skill" ? rest : argv;
  const portIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
  const hostIndex = args.findIndex((arg) => arg === "--host");
  return {
    command,
    port: portIndex >= 0 ? Number(args[portIndex + 1]) : defaultPort,
    host: hostIndex >= 0 ? args[hostIndex + 1] : defaultHost
  };
}

export function isLensBridgeEntrypoint(moduleURL = import.meta.url, argvPath = process.argv[1]): boolean {
  if (!argvPath) return false;
  try {
    return realpathSync(fileURLToPath(moduleURL)) === realpathSync(argvPath);
  } catch {
    return fileURLToPath(moduleURL) === argvPath;
  }
}

if (isLensBridgeEntrypoint()) {
  const options = parseCLI(process.argv.slice(2));
  if (options.command === "skill") {
    process.stdout.write(readSkill());
  } else {
    startLensBridge(options);
  }
}
