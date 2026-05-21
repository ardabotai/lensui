import { DemoStage } from "../components/DemoStage";
import { Footer } from "../components/Footer";
import { GitHubIcon } from "../components/GitHubIcon";
import { Header } from "../components/Header";
import { LensUIFrame } from "../components/LensUIFrame";
import { benchmarkResults, benchmarkSummary } from "../lib/benchmarks";
import { githubURL, npmURL } from "../lib/links";
import { heroMarketLightcode, liveMarketScript } from "../lib/specimens";

const proofCase = benchmarkResults[0];

const installCode = `npm install @ardabot/lensui
npx lensui skill
npx lensui bridge --port 5743`;

const runtimeCode = `import { createPersistentStageRuntime } from "@ardabot/lensui/html";

const stage = createPersistentStageRuntime(document.querySelector("#lens-stage"));

stage.render(\`0F|st=studio
0V|Market Pulse|Live source
1G|auto|min=180|max=3
2M|BTC|$markets.btc|usd
2H|line|$markets.trend|trend\`);

stage.setSource("markets", nextSnapshot);`;

function FlowStep({ label, text }: Readonly<{ label: string; text: string }>) {
  return (
    <li>
      <strong>{label}</strong>
      <span>{text}</span>
    </li>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="hero-shell shell" id="live">
          <div className="hero-copy">
            <h1>Next-gen UI isn't using AI to generate code to ship to everybody. It's AI streaming UI to each user live.</h1>
            <p className="lead">
              LensUI lets agents generate interfaces inside a mounted browser surface, then save the useful pieces as reusable components. Built-ins are just the starter grammar; your agent grows the UI vocabulary while the app is running.
            </p>
            <div className="actions">
              <a className="button primary" href="#demo">Connect an agent</a>
              <a className="button accent" href="#install">Install package</a>
              <a className="button source" href={githubURL} rel="noreferrer" target="_blank"><GitHubIcon /> GitHub</a>
            </div>
            <div className="hero-metrics" aria-label="LensUI live generation highlights">
              <div><strong>no rebuild</strong><span>runtime patches the mounted page</span></div>
              <div><strong>{benchmarkSummary.averageReactSavings}%</strong><span>average token savings vs React</span></div>
              <div><strong>save</strong><span>generated components for later use</span></div>
            </div>
          </div>

          <div className="hero-live" aria-label="Live LensUI generation preview">
            <div className="hero-stage-card">
              <LensUIFrame
                afterRenderScript={liveMarketScript}
                autoResize={false}
                className="hero-frame"
                height={390}
                lightcode={heroMarketLightcode}
                title="LensUI live runtime preview"
              />
            </div>
            <div className="agent-stream-panel" aria-label="Agent lightcode stream">
              <div className="stream-head">
                <span>agent stream</span>
                <strong>rendered after load</strong>
              </div>
              <pre><code>{`voice prompt
  -> builder model
  -> compact lightcode
  -> runtime.validate()
  -> browser surface updates`}</code></pre>
              <div className="stream-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </section>

        <section className="runtime-section wide-shell" id="demo">
          <div className="runtime-intro">
            <h2>Connect your agent to this surface.</h2>
            <p>
              Copy the generated instructions into your local agent, then watch it stream lightcode into the blank target below without a rebuild loop.
            </p>
          </div>
          <DemoStage />
        </section>

        <section className="shift-section shell" id="why">
          <div className="section-copy">
            <h2>The old loop generates code. LensUI grows a live interface.</h2>
            <p>
              Most AI UI demos stop at code generation: the model writes React, a build runs, and the result ships later. LensUI is designed for living surfaces: agents render now, patch what is already on screen, save components that work, and reuse them by name later.
            </p>
          </div>
          <div className="flow-compare">
            <article>
              <h3>Generated code loop</h3>
              <ol>
                <FlowStep label="1. Prompt" text="Ask an agent for an interface." />
                <FlowStep label="2. Code" text="Model emits JSX, CSS, chart code, and glue." />
                <FlowStep label="3. Ship" text="Build, deploy, reload, then hope it fits." />
              </ol>
            </article>
            <article className="live-flow">
              <h3>LensUI live loop</h3>
              <ol>
                <FlowStep label="1. Prompt" text="Ask an agent for a surface." />
                <FlowStep label="2. Lightcode" text="Model emits semantic rows and source bindings." />
                <FlowStep label="3. Render" text="The mounted runtime updates the existing page." />
                <FlowStep label="4. Remember" text="Useful components and styles are saved, patched, and called by short names later." />
              </ol>
            </article>
          </div>
          <div className="memory-loop" aria-label="LensUI generate save reuse loop">
            <article>
              <strong>Generate</strong>
              <span>Agents compose a purpose-built UI for the current request instead of choosing from a fixed gallery.</span>
            </article>
            <article>
              <strong>Save</strong>
              <span>Custom HTML, React, aliases, and LightStyle packs can be stored once when built-ins are not enough.</span>
            </article>
            <article>
              <strong>Recall</strong>
              <span>Future turns instantiate saved pieces by short names, so the UI gets richer without resending bulky code.</span>
            </article>
          </div>
        </section>

        <section className="proof-section shell">
          <div className="section-copy compact">
            <h2>Why stream lightcode instead of HTML/React?</h2>
            <p>
              HTML and React make an agent describe implementation details. Lightcode lets it send compact UI intent to a live renderer that already knows how to lay out, patch, persist, and update the surface.
            </p>
          </div>
          <div className="token-proof" aria-label="React, HTML, and LensUI payload comparison">
            <article>
              <div><h3>React</h3><span>{proofCase.reactTokens} tokens</span></div>
              <pre><code>{proofCase.react}</code></pre>
            </article>
            <article>
              <div><h3>HTML</h3><span>{proofCase.htmlTokens} tokens</span></div>
              <pre><code>{proofCase.html}</code></pre>
            </article>
            <article className="winner">
              <div><h3>Lightcode</h3><span>{proofCase.lightcodeTokens} tokens</span></div>
              <pre><code>{proofCase.lightcode}</code></pre>
              <p>{proofCase.reactSavings}% saved vs React, {proofCase.htmlSavings}% saved vs HTML.</p>
            </article>
          </div>
        </section>

        <section className="safety-section shell" id="safety">
          <div className="section-copy compact">
            <h2>Isn't agent-generated frontend code unsafe?</h2>
            <p>
              Yes. That is a real concern. LensUI is intentionally powerful: raw HTML, CSS, and JavaScript components are enabled by default because the goal is maximum expressive range for agents. Treat those components like untrusted plugin code until your host decides otherwise.
            </p>
          </div>
          <div className="safety-grid">
            <article>
              <strong>Default stance</strong>
              <span>The runtime trusts browser security boundaries, validates lightcode, preserves the last good render, and lets hosts mount LensUI in an iframe or isolated origin.</span>
            </article>
            <article>
              <strong>Host control</strong>
              <span>Apps can add review hooks, component allowlists, CSP, sandboxed iframes, approval flows, or disable raw component kinds when their product needs stricter policy.</span>
            </article>
            <article>
              <strong>Practical rule</strong>
              <span>Keep secrets, billing, auth, and privileged tools out of frontend code. Let raw components draw and interact; route sensitive effects through host-owned capabilities.</span>
            </article>
          </div>
        </section>

        <section className="install-section shell" id="install">
          <div>
            <h2>Install one package.</h2>
            <p>
              The package includes the browser runtime, CLI bridge, MCP server pieces, and the reusable LensUI agent skill.
            </p>
          </div>
          <div className="install-grid">
            <pre><code>{installCode}</code></pre>
            <pre><code>{runtimeCode}</code></pre>
          </div>
          <div className="actions section-actions">
            <a className="button primary" href={npmURL} rel="noreferrer" target="_blank">Open npm</a>
            <a className="button source" href={githubURL} rel="noreferrer" target="_blank"><GitHubIcon /> GitHub repo</a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
