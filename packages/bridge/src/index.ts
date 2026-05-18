#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type LensBridgeOptions = {
  host?: string;
  port?: number;
};

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

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseCLI(process.argv.slice(2));
  if (options.command === "skill") {
    process.stdout.write(readSkill());
  } else {
    startLensBridge(options);
  }
}
