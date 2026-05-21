"use client";

import { useCallback, useState } from "react";
import { AgentBridgePanel, type ExternalApply, type ExternalRender } from "./AgentBridgePanel";
import { InteractiveLensUIDemo } from "./InteractiveLensUIDemo";
import { liveDemoLightcode, liveDemoScript } from "../lib/specimens";

type DemoSample = {
  label?: string;
  description?: string;
  lightcode: string;
  afterRenderScript?: string;
};

type DemoKey = "live" | "animated" | "brief" | "gallery" | "timeline";

const samples: Record<DemoKey, DemoSample> = {
  live: {
    label: "live data",
    description: "Coinbase market data updates price direction, 3-hour candles, BTC trend, and a recent tick tape after the first render.",
    lightcode: liveDemoLightcode,
    afterRenderScript: liveDemoScript
  },
  animated: {
    label: "animated art",
    description: "Renderer-owned shader and vector nodes create motion without model-authored canvas, SVG, WebGL, or animation code.",
    lightcode: `0F|st=terminal
0V|Generative Surface|Renderer-owned motion
1X|shader|Signal field|h=300
1VV|flow|Vector field|h=260|count=28
1G|auto|min=180|max=3
2M|Payload|5 lines|lightcode
2M|JS sent|0|normal render
2M|Motion|runtime|owned`
  },
  brief: {
    lightcode: `0F|st=mono
0V|Live Brief|Runtime-rendered
1G|auto|min=180|max=3
2M|Latency|96ms|p95|tone=success
2M|Sources|3|active
2H|line|4,7,6,10,8,12|trend
1SC|Sources|References|items=Docs^https://example.com^now^Protocol;Runtime^https://example.com/runtime^5m^Renderer`
  },
  gallery: {
    lightcode: `0F|st=gallery
0V|Media Mosaic|Source colors stay original
1MO|Frames|First item gets emphasis|items=data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23070707'/%3E%3Cg fill='none' stroke='%23f2f2f2' stroke-width='10'%3E%3Cpath d='M70 260h500M80 220h470M96 180h420'/%3E%3Crect x='100' y='80' width='120' height='80'/%3E%3Crect x='260' y='60' width='96' height='116'/%3E%3Crect x='410' y='96' width='118' height='76'/%3E%3C/g%3E%3C/svg%3E^workspace^Code surface;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23050505'/%3E%3Cg fill='%23f2f2f2'%3E%3Crect x='96' y='96' width='64' height='64'/%3E%3Crect x='208' y='144' width='64' height='64'/%3E%3Crect x='320' y='80' width='64' height='64'/%3E%3Crect x='432' y='168' width='64' height='64'/%3E%3C/g%3E%3C/svg%3E^geometry^Visual reference;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23080808'/%3E%3Cg stroke='%2328d7d0' stroke-width='8' fill='none'%3E%3Cpath d='M80 280 220 88l108 132 82-72 150 132'/%3E%3C/g%3E%3C/svg%3E^circuit^Signal path`
  },
  timeline: {
    lightcode: `0F|st=studio
0V|Command Stream|Patchable UI
1ST|Render loop|Current turn|items=Intent^done^Prompt accepted;Build^active^Lightcode generated;Apply^wait^Runtime validates
1TL|Flow|Lifecycle|items=0ms^Parse^Depth tokens become hierarchy^done;16ms^Render^DOM and source bindings update^active;32ms^Rollback^Previous UI remains on failure^wait`
  }
};

function sampleDescription(key: DemoKey): string {
  return samples[key].description ?? "Switch payloads, edit lightcode, and let the runtime redraw the stage in place.";
}

function sampleLabel(key: DemoKey): string {
  return samples[key].label ?? key;
}

export function DemoStage() {
  const [active, setActive] = useState<DemoKey>("live");
  const [externalApply, setExternalApply] = useState<ExternalApply>();
  const [externalRender, setExternalRender] = useState<ExternalRender>();
  const handleApply = useCallback((command: ExternalApply) => setExternalApply(command), []);
  const handleRender = useCallback((render: ExternalRender) => {
    setExternalRender(render);
    setActive("live");
  }, []);

  return (
    <div className="demo-layout">
      <aside className="demo-panel">
        <h2>Live render target.</h2>
        <p className="section-lead">{sampleDescription(active)}</p>
        <div className="demo-controls" aria-label="Demo renders">
          {Object.keys(samples).map((name) => (
            <button
              className={active === name ? "active" : undefined}
              key={name}
              onClick={() => setActive(name as DemoKey)}
              type="button"
            >
              {sampleLabel(name as DemoKey)}
            </button>
          ))}
        </div>
        <div className="demo-note">
          <strong>No rebuild loop.</strong>
          <span>The iframe uses `window.lensStage.setSource(...)` to update existing market bindings after render.</span>
        </div>
        <AgentBridgePanel onApply={handleApply} onRender={handleRender} />
      </aside>

      <section className="demo-stage" aria-label="LensUI live demo stage">
        <InteractiveLensUIDemo
          key={active === "live" ? "live" : active}
          afterRenderScript={samples[active].afterRenderScript}
          externalApply={active === "live" ? externalApply : undefined}
          externalRender={active === "live" ? externalRender : undefined}
          height={560}
          lightcode={samples[active].lightcode}
          mode={active === "live" ? "split" : "tabs"}
          title="LensUI demo render"
        />
      </section>
    </div>
  );
}
