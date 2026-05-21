"use client";

import { useCallback, useState } from "react";
import { AgentBridgePanel, type ExternalApply, type ExternalRender } from "./AgentBridgePanel";
import { InteractiveLensUIDemo } from "./InteractiveLensUIDemo";

const blankTargetLightcode = `0F|st=terminal|d=compact
0V|Connect your agent to stream UI|Paste the instructions below into Claude Code, Cursor, Codex, or another local agent.
1T|Waiting for the first render. This surface will update in place when your agent sends lightcode.|muted=true`;

export function DemoStage() {
  const [externalApply, setExternalApply] = useState<ExternalApply>();
  const [externalRender, setExternalRender] = useState<ExternalRender>();
  const handleApply = useCallback((command: ExternalApply) => setExternalApply(command), []);
  const handleRender = useCallback((render: ExternalRender) => setExternalRender(render), []);

  return (
    <div className="agent-surface">
      <AgentBridgePanel onApply={handleApply} onRender={handleRender} />
      <section className="demo-stage agent-target-stage" aria-label="LensUI live agent target">
        <InteractiveLensUIDemo
          autoResize={false}
          externalApply={externalApply}
          externalRender={externalRender}
          height={560}
          lightcode={blankTargetLightcode}
          mode="target"
          title="LensUI demo render"
        />
      </section>
    </div>
  );
}
