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

const canvasCommandStream = `!
@!|AgentCanvas|html|agent-generated
<div class="agent-canvas"><canvas></canvas><strong>{{0}}</strong><script>
(() => {
  const root = document.currentScript.parentElement;
  const c = root.querySelector("canvas"), ctx = c.getContext("2d");
  let t = 0;
  function draw(){
    c.width = Math.max(1, root.clientWidth / 4); c.height = Math.max(1, root.clientHeight / 4); t += .04;
    const img = ctx.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const p = i / 4, x = p % c.width, y = (p / c.width) | 0, v = Math.sin(x * .18 + t) + Math.cos(y * .14 - t);
      img.data[i] = 80 + v * 50; img.data[i + 1] = 190 + v * 30; img.data[i + 2] = 235; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); requestAnimationFrame(draw);
  }
  draw();
})();
</script></div>
<style>
.agent-canvas{position:relative;min-height:260px;border:1px solid hsl(var(--border));background:#050607;overflow:hidden}
.agent-canvas canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
.agent-canvas strong{position:absolute;left:18px;bottom:14px;font:700 13px var(--lens-font-mono);text-transform:uppercase;color:white}
</style>
.
R
0F|st=studio|d=compact
0V|Custom canvas|Saved HTML/CSS/JS component
1AgentCanvas|hello from custom canvas
.`;

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

function curlApply(bridgeOrigin: string, lensID: string, token: string, commandStream = canvasCommandStream): string {
  return `curl -X POST ${bridgeOrigin}/lens/${lensID}/apply \\
  -H "authorization: Bearer ${token}" \\
  -H "content-type: application/json" \\
  --data ${JSON.stringify(JSON.stringify({ commandStream }))}`;
}

function agentInstructions(bridgeOrigin: string, lensID: string, token: string): string {
  return `You are controlling a live LensUI container in the user's browser.

Target:
- lensID: ${lensID}
- bridge: ${bridgeOrigin}
- auth: Bearer ${token}

Rules:
- Do not scaffold a React app, write an HTML file, or start a web server. The browser already has a LensUI runtime mounted.
- First, run the proof render below exactly. Once it returns {"ok":true}, keep posting lightcode or command streams to this same target.
- Use /render for plain semantic lightcode.
- Use /apply for saved components, custom HTML/CSS/JS/canvas, patches, styles, or source updates.
- If you get "No connected LensUI container for that lensID/token", the browser EventSource is not connected yet or this prompt is stale. Ask the user to keep this page open, refresh it, or copy a fresh prompt.
- A 200 response means the bridge delivered the message to the browser. If the UI does not change, simplify the lightcode/component and retry; render errors appear in the browser surface.

Read the LensUI skill:
   npx -y --package @ardabot/lensui@latest lensui skill > LENSUI_SKILL.md
   Read LENSUI_SKILL.md, especially "Live Target Fast Path" and "Custom HTML/CSS/JS/Canvas".

If the bridge is not already running, start it:
   npx -y --package @ardabot/lensui@latest lensui bridge --port ${new URL(bridgeOrigin).port || "5743"}

1. Proof render:
${curlRender(bridgeOrigin, lensID, token)}

2. Custom HTML/CSS/JS/canvas example using /apply:
${curlApply(bridgeOrigin, lensID, token)}

After that, generate the actual UI the user asked for. Use semantic LensUI nodes for common UI. For custom HTML, CSS, JavaScript, canvas, D3, Three.js, or app-like interaction, register a saved component once with @!, then render it by name with a short line like 1AgentCanvas|label.`;
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
  const hasRendered = messageCount > 0;

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

  async function copyPrompt() {
    setShouldConnect(true);
    await copyValue("agent instructions", prompt);
  }

  return (
    <div className={`agent-bridge ${hasRendered ? "streaming" : ""}`} data-bridge-origin={bridgeOrigin} data-lens-id={lensID} data-lens-token={token}>
      <div className="agent-bridge-head">
        <div>
          <strong>{hasRendered ? "Agent is streaming UI." : "Connect your agent."}</strong>
          <span>{hasRendered ? "The setup prompt is out of the way; keep rendering to this target." : "Copy these instructions into your local coding agent to target the blank LensUI stage above."}</span>
        </div>
        <span className={`bridge-pill ${status}`}>{status}</span>
      </div>

      {hasRendered ? (
        <p className="bridge-summary">{messageCount} render {messageCount === 1 ? "message" : "messages"} received through {bridgeOrigin}.</p>
      ) : (
        <>
          <textarea
            aria-label="LensUI agent instructions"
            readOnly
            spellCheck={false}
            value={prompt}
          />

          <div className="bridge-actions">
            <button className="primary" disabled={lensID === "pending" || token === "pending"} onClick={copyPrompt} type="button">
              Copy agent instructions
            </button>
          </div>
        </>
      )}

      {copied ? <span className="bridge-copied">Copied {copied}</span> : null}
    </div>
  );
}
