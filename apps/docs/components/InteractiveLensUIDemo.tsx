"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackLensUIDocsEvent } from "./AnalyticsTracker";
import { interactiveStageHTML } from "../lib/specimens";

type RenderStatus =
  | { state: "idle"; message: string }
  | { state: "rendering"; message: string }
  | { state: "ok"; message: string }
  | { state: "error"; message: string };

type RenderResultMessage = {
  type?: string;
  requestID?: string | null;
  sourceID?: string;
  payload?: unknown;
  ok?: boolean;
  result?: {
    ok?: boolean;
    error?: string | null;
  };
  size?: {
    contentHeight?: number;
    height?: number;
  };
};

type StreamEntry = {
  id: number;
  kind: "initial" | "render" | "apply" | "local" | "reset" | "source";
  label: string;
  payload: string;
  time: string;
};

const minFrameHeight = 260;
const maxFrameHeight = 3200;
const maxStreamEntries = 16;

function normalizedFrameHeight(size: RenderResultMessage["size"], fallback: number): number {
  const contentHeight = Number(size?.contentHeight ?? size?.height);
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) return fallback;
  return Math.max(fallback, Math.min(maxFrameHeight, Math.ceil(contentHeight)));
}

function initialStreamEntry(lightcode: string): StreamEntry {
  return {
    id: 0,
    kind: "initial",
    label: "initial lightcode",
    payload: lightcode.trim(),
    time: "load"
  };
}

function currentTime(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function appendEntry(entries: StreamEntry[], entry: StreamEntry): StreamEntry[] {
  return [...entries, entry].slice(-maxStreamEntries);
}

function sourceCommand(sourceID: string, payload: unknown): string {
  return `!\nS|${sourceID}|application/json\n${JSON.stringify(compactSourcePayload(payload), null, 2)}\n.`;
}

function compactSourcePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const record = payload as Record<string, unknown>;
  if ("btcCandles" in record || "ethCandles" in record || "solCandles" in record) {
    return {
      btc: record.btc,
      btcMove: record.btcMove,
      btcTone: record.btcTone,
      eth: record.eth,
      ethMove: record.ethMove,
      ethTone: record.ethTone,
      sol: record.sol,
      solMove: record.solMove,
      solTone: record.solTone,
      status: record.status,
      clock: record.clock,
      ticks: firstRows(record.ticks, 3),
      candles: {
        btc: rowCount(record.btcCandles),
        eth: rowCount(record.ethCandles),
        sol: rowCount(record.solCandles)
      },
      steps: record.steps
    };
  }
  return payload;
}

function firstRows(value: unknown, limit: number): string {
  return String(value ?? "").split(";").filter(Boolean).slice(0, limit).join(";");
}

function rowCount(value: unknown): string {
  const count = String(value ?? "").split(";").filter(Boolean).length;
  return count ? `${count} candles` : "waiting";
}

export function InteractiveLensUIDemo({
  lightcode,
  title,
  height,
  externalApply,
  externalRender,
  afterRenderScript = "",
  className = "",
  mode = "tabs"
}: Readonly<{
  lightcode: string;
  title: string;
  height?: number;
  externalApply?: { id: number; commandStream: string };
  externalRender?: { id: number; lightcode: string };
  afterRenderScript?: string;
  className?: string;
  mode?: "tabs" | "split";
}>) {
  const [tab, setTab] = useState<"view" | "lightcode">("view");
  const [draft, setDraft] = useState(lightcode.trim());
  const [streamEntries, setStreamEntries] = useState<StreamEntry[]>(() => [initialStreamEntry(lightcode)]);
  const [status, setStatus] = useState<RenderStatus>({ state: "idle", message: "Ready" });
  const [frameHeight, setFrameHeight] = useState(height ?? 420);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const requestID = useRef(0);
  const lastSourceEntryAt = useRef(0);
  const splitMode = mode === "split";

  useEffect(() => {
    setDraft(lightcode.trim());
    setStreamEntries([initialStreamEntry(lightcode)]);
    setStatus({ state: "idle", message: "Ready" });
    setTab("view");
    setFrameHeight(height ?? 420);
  }, [height, lightcode]);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.scrollTop = stream.scrollHeight;
  }, [streamEntries]);

  useEffect(() => {
    function handleMessage(event: MessageEvent<RenderResultMessage>) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "lensui:size") {
        setFrameHeight(normalizedFrameHeight(event.data.size, height ?? minFrameHeight));
        return;
      }
      if (event.data?.type === "lensui:source-update") {
        if (!splitMode) return;
        const now = Date.now();
        if (now - lastSourceEntryAt.current < 1200) return;
        lastSourceEntryAt.current = now;
        const sourceID = event.data.sourceID ?? "source";
        setStreamEntries((entries) => appendEntry(entries, {
          id: now,
          kind: "source",
          label: `source update: ${sourceID}`,
          payload: sourceCommand(sourceID, event.data.payload),
          time: currentTime()
        }));
        return;
      }
      if (event.data?.type !== "lensui:render-result") return;
      const result = event.data.result;
      if (!result) return;
      setStatus(result.ok
        ? { state: "ok", message: "Rendered" }
        : { state: "error", message: result.error ?? "Render failed" });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [height, splitMode]);

  const renderDraft = useCallback(() => {
    const frame = iframeRef.current?.contentWindow;
    trackLensUIDocsEvent("lensui.demo.render_clicked", { title });
    setTab("view");
    setStatus({ state: "rendering", message: "Rendering" });
    setStreamEntries((entries) => appendEntry(entries, {
      id: Date.now(),
      kind: "local",
      label: "local render",
      payload: draft,
      time: currentTime()
    }));
    frame?.postMessage({
      type: "lensui:render",
      requestID: `${title}-${requestID.current += 1}`,
      lightcode: draft
    }, "*");
  }, [draft, title]);

  const resetDraft = useCallback(() => {
    trackLensUIDocsEvent("lensui.demo.reset_clicked", { title });
    setDraft(lightcode.trim());
    setStatus({ state: "rendering", message: "Rendering" });
    setTab("view");
    setStreamEntries((entries) => appendEntry(entries, {
      id: Date.now(),
      kind: "reset",
      label: "reset render",
      payload: lightcode.trim(),
      time: currentTime()
    }));
    iframeRef.current?.contentWindow?.postMessage({
      type: "lensui:render",
      requestID: `${title}-reset-${requestID.current += 1}`,
      lightcode: lightcode.trim()
    }, "*");
  }, [lightcode, title]);

  useEffect(() => {
    if (!externalRender) return;
    setDraft(externalRender.lightcode);
    setTab("view");
    setStatus({ state: "rendering", message: "Rendering" });
    setStreamEntries((entries) => appendEntry(entries, {
      id: externalRender.id,
      kind: "render",
      label: "bridge render",
      payload: externalRender.lightcode,
      time: currentTime()
    }));
    iframeRef.current?.contentWindow?.postMessage({
      type: "lensui:render",
      requestID: `${title}-external-${externalRender.id}`,
      lightcode: externalRender.lightcode
    }, "*");
  }, [externalRender, title]);

  useEffect(() => {
    if (!externalApply) return;
    setTab("view");
    setStatus({ state: "rendering", message: "Applying" });
    setStreamEntries((entries) => appendEntry(entries, {
      id: externalApply.id,
      kind: "apply",
      label: "bridge patch",
      payload: externalApply.commandStream,
      time: currentTime()
    }));
    iframeRef.current?.contentWindow?.postMessage({
      type: "lensui:apply",
      requestID: `${title}-apply-${externalApply.id}`,
      commandStream: externalApply.commandStream
    }, "*");
  }, [externalApply, title]);

  const lineCount = draft.split("\n").filter(Boolean).length;

  return (
    <div className={`lens-playground ${splitMode ? "split" : ""} ${className}`.trim()}>
      <div className="lens-playground-toolbar">
        {splitMode ? (
          <div className="lens-live-toolbar">
            <span>Rendered UI</span>
            <span>Live lightcode stream</span>
          </div>
        ) : (
          <div className="lens-playground-tabs" role="tablist" aria-label={`${title} tabs`}>
            <button
              aria-selected={tab === "view"}
              className={tab === "view" ? "active" : undefined}
              onClick={() => setTab("view")}
              role="tab"
              type="button"
            >
              View
            </button>
            <button
              aria-selected={tab === "lightcode"}
              className={tab === "lightcode" ? "active" : undefined}
              onClick={() => setTab("lightcode")}
              role="tab"
              type="button"
            >
              Lightcode
            </button>
          </div>
        )}
        <div className={`lens-render-status ${status.state}`} role={status.state === "error" ? "alert" : "status"}>
          {status.state === "error" ? "Render failed" : status.message}
        </div>
      </div>

      <div className="lens-playground-body">
        {splitMode ? (
          <>
            <div className="lens-playground-view active" role="tabpanel" aria-label={`${title} rendered UI`}>
              <iframe
                key={title}
                ref={iframeRef}
                srcDoc={interactiveStageHTML(lightcode.trim(), afterRenderScript)}
                style={{ height: frameHeight }}
                title={title}
              />
            </div>
            <aside className="lens-live-stream" aria-label={`${title} live lightcode stream`} ref={streamRef}>
              {streamEntries.map((entry) => (
                <article className={`lens-stream-entry ${entry.kind}`} key={`${entry.kind}-${entry.id}`}>
                  <div>
                    <strong>{entry.label}</strong>
                    <span>{entry.time}</span>
                  </div>
                  <pre><code>{entry.payload}</code></pre>
                </article>
              ))}
            </aside>
          </>
        ) : (
          <>
            <div className={tab === "view" ? "lens-playground-view active" : "lens-playground-view"} role="tabpanel">
              <iframe
                key={title}
                ref={iframeRef}
                srcDoc={interactiveStageHTML(lightcode.trim(), afterRenderScript)}
                style={{ height: frameHeight }}
                title={title}
              />
            </div>
            <div className={tab === "lightcode" ? "lens-playground-code active" : "lens-playground-code"} role="tabpanel">
              <textarea
                aria-label={`${title} editable lightcode`}
                onChange={(event) => setDraft(event.target.value)}
                spellCheck={false}
                value={draft}
              />
            </div>
          </>
        )}
      </div>

      <div className="lens-playground-footer">
        <span>{splitMode ? `${streamEntries.length} stream events` : `${lineCount} lines`}</span>
        {splitMode ? (
          <span>{lineCount} latest lines</span>
        ) : (
          <div>
            <button onClick={resetDraft} type="button">Reset</button>
            <button className="primary" onClick={renderDraft} type="button">Render</button>
          </div>
        )}
      </div>

      {status.state === "error" ? (
        <p className="lens-playground-error">{status.message}</p>
      ) : null}
    </div>
  );
}
