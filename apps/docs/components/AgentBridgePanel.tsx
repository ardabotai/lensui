"use client";

import { useEffect, useMemo, useState } from "react";

type BridgeStatus = "idle" | "connecting" | "connected" | "error";

type BridgeMessage =
  | { type?: "render"; lightcode?: string; requestID?: string }
  | { type?: "apply"; commandStream?: string; requestID?: string };

export type ExternalApply = { id: number; commandStream: string };
export type ExternalRender = { id: number; lightcode: string };

const defaultBridgeOrigin = "http://127.0.0.1:5743";
const helloLightcode = `0F|st=mono|f=mono|d=compact
0V|Hello from your agent|Live LensUI target
1G|auto|min=180|max=3
2M|Bridge|connected|local
2M|Payload|lightcode|compact
2M|Target|scoped|secure
1T|This surface was rendered through the local LensUI bridge.`;

function newSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function newID(): string {
  return crypto.randomUUID();
}

function curlRender(bridgeOrigin: string, lensID: string, token: string, lightcode = helloLightcode): string {
  return `curl -X POST ${bridgeOrigin}/lens/${lensID}/render \\
  -H "authorization: Bearer ${token}" \\
  -H "content-type: application/json" \\
  --data ${JSON.stringify(JSON.stringify({ lightcode }))}`;
}

function agentInstructions(bridgeOrigin: string, lensID: string, token: string): string {
  return `You are controlling a live LensUI container in the user's browser.

Target:
- lensID: ${lensID}
- bridge: ${bridgeOrigin}
- auth: Bearer ${token}

Setup:
1. Read the LensUI agent skill from the npm package:
   npx -y --package @ardabot/lensui@latest lensui skill > LENSUI_SKILL.md
   Read LENSUI_SKILL.md and follow it when generating lightcode.
2. If the bridge is not already running, start it in a background terminal:
   npx -y --package @ardabot/lensui@latest lensui bridge --port ${new URL(bridgeOrigin).port || "5743"}

First render, to prove the connection works:
${curlRender(bridgeOrigin, lensID, token)}

After that, keep rendering compact LensUI lightcode to the same endpoint. Use semantic LensUI nodes, not HTML/React/CSS, unless you explicitly save a trusted component.`;
}

async function copy(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function AgentBridgePanel({
  onApply,
  onRender
}: Readonly<{
  onApply(command: ExternalApply): void;
  onRender(render: ExternalRender): void;
}>) {
  const [lensID, setLensID] = useState("pending");
  const [token, setToken] = useState("pending");
  const [bridgeOrigin, setBridgeOrigin] = useState(defaultBridgeOrigin);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [status, setStatus] = useState<BridgeStatus>("idle");
  const [copied, setCopied] = useState("");
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    setLensID(newID());
    setToken(newSecret());
    const customOrigin = new URLSearchParams(window.location.search).get("bridge");
    if (customOrigin?.startsWith("http://127.0.0.1:") || customOrigin?.startsWith("http://localhost:")) {
      setBridgeOrigin(customOrigin.replace(/\/$/, ""));
      setShouldConnect(true);
    }
  }, []);

  const eventURL = useMemo(() => {
    if (!shouldConnect) return "";
    if (lensID === "pending" || token === "pending") return "";
    return `${bridgeOrigin}/session/${lensID}/events?token=${token}`;
  }, [bridgeOrigin, lensID, shouldConnect, token]);

  const prompt = useMemo(() => agentInstructions(bridgeOrigin, lensID, token), [bridgeOrigin, lensID, token]);
  const bridgeCommand = `npx -y --package @ardabot/lensui@latest lensui bridge --port ${new URL(bridgeOrigin).port || "5743"}`;
  const helloCommand = useMemo(() => curlRender(bridgeOrigin, lensID, token), [bridgeOrigin, lensID, token]);

  useEffect(() => {
    if (!eventURL) return;
    setStatus("connecting");
    const source = new EventSource(eventURL);
    source.addEventListener("open", () => setStatus("connected"));
    source.addEventListener("error", () => setStatus(source.readyState === EventSource.CLOSED ? "error" : "connecting"));
    source.addEventListener("lensui", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as BridgeMessage;
        if (data.type === "render" && typeof data.lightcode === "string") {
          setMessageCount((count) => count + 1);
          onRender({ id: Date.now(), lightcode: data.lightcode });
        }
        if (data.type === "apply" && typeof data.commandStream === "string") {
          setMessageCount((count) => count + 1);
          onApply({ id: Date.now(), commandStream: data.commandStream });
        }
      } catch {
        setStatus("error");
      }
    });
    return () => source.close();
  }, [eventURL, onApply, onRender]);

  async function copyValue(label: string, value: string) {
    await copy(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1400);
  }

  return (
    <div className="agent-bridge" data-bridge-origin={bridgeOrigin} data-lens-id={lensID} data-lens-token={token}>
      <div className="agent-bridge-head">
        <div>
          <strong>Live agent target.</strong>
          <span>Paste these instructions into Claude Code or another local agent.</span>
        </div>
        <span className={`bridge-pill ${status}`}>{status}</span>
      </div>

      <div className="bridge-fields">
        <label>
          <span>lensID</span>
          <code>{lensID}</code>
        </label>
        <label>
          <span>token</span>
          <code>{token === "pending" ? token : `${token.slice(0, 8)}...${token.slice(-6)}`}</code>
        </label>
        <label>
          <span>messages</span>
          <code>{messageCount}</code>
        </label>
      </div>

      <div className="bridge-actions">
        <button onClick={() => setShouldConnect(true)} type="button">Connect bridge</button>
        <button onClick={() => copyValue("bridge", bridgeCommand)} type="button">Copy bridge command</button>
        <button onClick={() => copyValue("hello", helloCommand)} type="button">Copy hello render</button>
        <button className="primary" onClick={() => copyValue("prompt", prompt)} type="button">Copy agent prompt</button>
      </div>

      <pre className="bridge-prompt"><code>{prompt}</code></pre>
      {copied ? <span className="bridge-copied">Copied {copied}</span> : null}
    </div>
  );
}
