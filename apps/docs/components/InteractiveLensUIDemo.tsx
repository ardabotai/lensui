"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { interactiveStageHTML } from "../lib/specimens";

type RenderStatus =
  | { state: "idle"; message: string }
  | { state: "rendering"; message: string }
  | { state: "ok"; message: string }
  | { state: "error"; message: string };

type RenderResultMessage = {
  type?: string;
  requestID?: string | null;
  result?: {
    ok?: boolean;
    error?: string | null;
  };
  size?: {
    contentHeight?: number;
    height?: number;
  };
};

const minFrameHeight = 260;
const maxFrameHeight = 3200;

function normalizedFrameHeight(size: RenderResultMessage["size"], fallback: number): number {
  const contentHeight = Number(size?.contentHeight ?? size?.height);
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) return fallback;
  return Math.max(fallback, Math.min(maxFrameHeight, Math.ceil(contentHeight)));
}

export function InteractiveLensUIDemo({
  lightcode,
  title,
  height,
  externalApply,
  externalRender,
  afterRenderScript = "",
  className = ""
}: Readonly<{
  lightcode: string;
  title: string;
  height?: number;
  externalApply?: { id: number; commandStream: string };
  externalRender?: { id: number; lightcode: string };
  afterRenderScript?: string;
  className?: string;
}>) {
  const [tab, setTab] = useState<"view" | "lightcode">("view");
  const [draft, setDraft] = useState(lightcode.trim());
  const [status, setStatus] = useState<RenderStatus>({ state: "idle", message: "Ready" });
  const [frameHeight, setFrameHeight] = useState(height ?? 420);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const requestID = useRef(0);

  useEffect(() => {
    setDraft(lightcode.trim());
    setStatus({ state: "idle", message: "Ready" });
    setTab("view");
    setFrameHeight(height ?? 420);
  }, [height, lightcode]);

  useEffect(() => {
    function handleMessage(event: MessageEvent<RenderResultMessage>) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "lensui:size") {
        setFrameHeight(normalizedFrameHeight(event.data.size, height ?? minFrameHeight));
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
  }, [height]);

  const renderDraft = useCallback(() => {
    const frame = iframeRef.current?.contentWindow;
    setTab("view");
    setStatus({ state: "rendering", message: "Rendering" });
    frame?.postMessage({
      type: "lensui:render",
      requestID: `${title}-${requestID.current += 1}`,
      lightcode: draft
    }, "*");
  }, [draft, title]);

  const resetDraft = useCallback(() => {
    setDraft(lightcode.trim());
    setStatus({ state: "rendering", message: "Rendering" });
    setTab("view");
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
    iframeRef.current?.contentWindow?.postMessage({
      type: "lensui:apply",
      requestID: `${title}-apply-${externalApply.id}`,
      commandStream: externalApply.commandStream
    }, "*");
  }, [externalApply, title]);

  const lineCount = draft.split("\n").filter(Boolean).length;

  return (
    <div className={`lens-playground ${className}`.trim()}>
      <div className="lens-playground-toolbar">
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
        <div className={`lens-render-status ${status.state}`} role={status.state === "error" ? "alert" : "status"}>
          {status.state === "error" ? "Render failed" : status.message}
        </div>
      </div>

      <div className="lens-playground-body">
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
      </div>

      <div className="lens-playground-footer">
        <span>{lineCount} lines</span>
        <div>
          <button onClick={resetDraft} type="button">Reset</button>
          <button className="primary" onClick={renderDraft} type="button">Render</button>
        </div>
      </div>

      {status.state === "error" ? (
        <p className="lens-playground-error">{status.message}</p>
      ) : null}
    </div>
  );
}
