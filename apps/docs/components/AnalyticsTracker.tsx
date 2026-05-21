"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const source = "lensui_docs";
const endpointEnv = process.env.NEXT_PUBLIC_LENSUI_ANALYTICS_ENDPOINT;

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackLensUIDocsEvent("page_view", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const node = target?.closest<HTMLElement>("a,button,[data-analytics-event]");
      if (!node) return;

      const explicit = node.dataset.analyticsEvent;
      const href = node instanceof HTMLAnchorElement ? node.href : undefined;
      const eventName = explicit ?? (href ? "outbound_click" : undefined);
      if (!eventName) return;

      trackLensUIDocsEvent(eventName, {
        href,
        label: node.textContent?.trim().slice(0, 120)
      });
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}

export function trackLensUIDocsEvent(event: string, properties: Record<string, unknown> = {}) {
  const endpoint = analyticsEndpoint();
  if (!endpoint || typeof window === "undefined") return;

  const payload = {
    source,
    event,
    anonymousId: stableId("localStorage", "lensui.analytics.anonymous_id"),
    sessionId: stableId("sessionStorage", "lensui.analytics.session_id"),
    page: {
      path: window.location.pathname,
      referrer: document.referrer,
      title: document.title
    },
    properties
  };

  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: "application/json" });
  if (navigator.sendBeacon?.(endpoint, blob) === true) return;

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
}

function analyticsEndpoint() {
  if (endpointEnv) return endpointEnv;
  if (typeof window === "undefined") return undefined;
  return window.location.hostname === "lens.ardabot.ai" || window.location.hostname === "lensui.vercel.app"
    ? "https://gateway.ardabot.ai/api/v1/analytics/events"
    : undefined;
}

function stableId(storageName: "localStorage" | "sessionStorage", key: string) {
  const next = crypto.randomUUID();
  try {
    const storage = window[storageName];
    const existing = storage.getItem(key);
    if (existing) return existing;
    storage.setItem(key, next);
  } catch {
    return next;
  }
  return next;
}
