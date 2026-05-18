"use client";

import { useEffect, useRef, useState } from "react";
import { staticStageHTML } from "../lib/specimens";

type SizeMessage = {
  type?: string;
  size?: {
    contentHeight?: number;
    height?: number;
  };
};

function frameHeight(size: SizeMessage["size"], fallback: number): number {
  const measured = Number(size?.contentHeight ?? size?.height);
  if (!Number.isFinite(measured) || measured <= 0) return fallback;
  return Math.max(fallback, Math.min(3200, Math.ceil(measured)));
}

export function LensUIFrame({
  afterRenderScript = "",
  lightcode,
  title,
  height,
  className = ""
}: Readonly<{
  afterRenderScript?: string;
  lightcode: string;
  title: string;
  height?: number;
  className?: string;
}>) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [autoHeight, setAutoHeight] = useState(height ?? 360);

  useEffect(() => {
    setAutoHeight(height ?? 360);
  }, [height, lightcode]);

  useEffect(() => {
    function handleMessage(event: MessageEvent<SizeMessage>) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== "lensui:size") return;
      setAutoHeight(frameHeight(event.data.size, height ?? 260));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [height]);

  return (
    <iframe
      className={`lensui-frame ${className}`.trim()}
      ref={iframeRef}
      srcDoc={staticStageHTML(lightcode, afterRenderScript)}
      title={title}
      style={{ height: autoHeight }}
    />
  );
}
