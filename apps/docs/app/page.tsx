import Link from "next/link";
import { Footer } from "../components/Footer";
import { GitHubIcon } from "../components/GitHubIcon";
import { Header } from "../components/Header";
import { InfoCard } from "../components/InfoCard";
import { LensUIFrame } from "../components/LensUIFrame";
import { benchmarkResults, benchmarkSummary } from "../lib/benchmarks";
import { githubURL, npmURL } from "../lib/links";

const proofCase = benchmarkResults[0];

const packageUsage = `import { createStageRuntime } from "@ardabot/lensui/html";

const root = document.querySelector("#lens-stage-mount");
const stage = createStageRuntime(root);

stage.setSource("markets", { bitcoin: { usd: 76448 }, ethereum: { usd: 2098 } });

stage.render(\`0DS|markets|https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd|ttl=30|mode=poll
0F|st=mono|mode=dark
0V|Market Pulse|Live source
1G|auto|min=180|max=3
2M|BTC|$markets.bitcoin.usd|usd
2M|ETH|$markets.ethereum.usd|usd
2M|Tokens|-64%|vs React
1H|line|4,7,6,10,9,13,16|trend|h=190\`);`;

const heroLightcode = `0DS|pulse|https://timeapi.io/api/time/current/zone?timeZone=UTC|ttl=3|mode=poll
0F|st=studio
0V|Runtime Pulse|Live data + renderer-owned visuals
1G|auto|min=160|max=3|mh=120
2M|Latency|$pulse.latency|p95|tone=success
2M|Tokens|$pulse.tokens|vs React
2M|Sources|$pulse.sources|bound
1H|line|$pulse.trend|signal|h=150
1X|shader|Generative field|h=220`;

const heroPulseScript = `
    if (window.__lensPulseInterval) clearInterval(window.__lensPulseInterval);
    const pulseURL = "https://timeapi.io/api/time/current/zone?timeZone=UTC";
    let pulseTick = 0;
    async function pushPulse() {
      pulseTick += 1;
      let payload = {};
      try {
        const response = await fetch(pulseURL, { cache: "no-store" });
        if (response.ok) payload = await response.json();
      } catch {}
      const second = Number(payload.seconds ?? new Date().getUTCSeconds());
      const milli = Number(payload.milliSeconds ?? new Date().getUTCMilliseconds());
      const trend = Array.from({ length: 12 }, (_, index) => 22 + ((second + index * 5 + pulseTick) % 38));
      window.lensStage.setSource("pulse", {
        latency: 42 + ((second * 7 + milli) % 78) + "ms",
        tokens: "-" + (${benchmarkSummary.averageReactSavings} + (second % 7)) + "%",
        sources: "live",
        trend: trend.join(",")
      });
    }
    pushPulse();
    window.__lensPulseInterval = setInterval(pushPulse, 3000);
  `;

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="shell">
        <section className="hero compact-hero">
          <div>
            <h1>Agents should emit UI intent, not frontend code.</h1>
            <p className="lead">
              LensUI renders compact lightcode into polished, live browser UI. Agents describe the surface; the runtime owns layout, charts, media, animation, source updates, and rollback.
            </p>
            <div className="actions">
              <Link className="button primary" href="/demo">Try demo</Link>
              <Link className="button accent" href="/components">See specimens</Link>
              <a className="button" href={npmURL} rel="noreferrer" target="_blank">npm package</a>
              <a className="button source" href={githubURL} rel="noreferrer" target="_blank"><GitHubIcon /> GitHub</a>
            </div>
          </div>

          <div className="stage-card runtime-card" aria-label="LensUI stage preview">
            <LensUIFrame afterRenderScript={heroPulseScript} lightcode={heroLightcode} title="LensUI homepage runtime preview" />
          </div>
        </section>

        <section id="why" className="tight-section">
          <h2>What it is.</h2>
          <div className="principle-grid tight-grid">
            <InfoCard title="Small payloads">Agents send semantic nodes and compact rows instead of DOM, JSX, CSS, chart code, and responsive rules.</InfoCard>
            <InfoCard title="Renderer-owned polish">The runtime owns visual rhythm, light/dark modes, adaptive containers, stage scroll fallback, embed auto-sizing, media framing, animation, and safe rollback.</InfoCard>
            <InfoCard title="Live after render">`setSource` updates fields, lists, charts, progress, and status rows without regenerating the whole UI.</InfoCard>
            <InfoCard title="Host-owned authority">Provider keys, auth, billing, memory, files, browser tools, and external effects stay in the host app or gateway.</InfoCard>
          </div>
        </section>

        <section id="proof" className="tight-section">
          <h2>Why it matters.</h2>
          <div className="gain-strip">
            <div className="gain"><strong>{benchmarkSummary.averageReactSavings}%</strong><span>average savings vs equivalent React component payloads</span></div>
            <div className="gain"><strong>{benchmarkSummary.averageHTMLSavings}%</strong><span>average savings vs direct HTML payloads</span></div>
            <div className="gain"><strong>1 line</strong><span>patches can update a metric or chart without resending the stage</span></div>
            <div className="gain"><strong>0 keys</strong><span>provider credentials and side effects are outside the renderer</span></div>
          </div>
          <div className="tri-compare" aria-label="React, HTML, and LensUI payload comparison">
            <article className="compare-panel">
              <div className="compare-head">
                <h3>React</h3>
                <span className="score bad">{proofCase.reactTokens} tokens</span>
              </div>
              <pre className="compare-code"><code>{proofCase.react}</code></pre>
            </article>
            <article className="compare-panel">
              <div className="compare-head">
                <h3>HTML</h3>
                <span className="score bad">{proofCase.htmlTokens} tokens</span>
              </div>
              <pre className="compare-code"><code>{proofCase.html}</code></pre>
            </article>
            <article className="compare-panel good">
              <div className="compare-head">
                <h3>Lightcode</h3>
                <span className="score">{proofCase.lightcodeTokens} tokens</span>
              </div>
              <pre className="compare-code"><code>{proofCase.lightcode}</code></pre>
              <div className="savings-row">
                <span>{proofCase.reactSavings}% saved vs React</span>
                <span>{proofCase.htmlSavings}% saved vs HTML</span>
              </div>
            </article>
          </div>
        </section>

        <section id="start" className="tight-section">
          <h2>Start with the runtime.</h2>
          <p className="section-lead">Install the single `@ardabot/lensui` npm package, mount a stage region, and render lightcode. The package includes the runtime, CLI bridge, and reusable agent skill.</p>
          <div className="install-strip" aria-label="Package install">
            <code>npm install @ardabot/lensui</code>
          </div>
          <pre className="compact-code"><code>{packageUsage}</code></pre>
          <div className="actions section-actions">
            <Link className="button primary" href="/demo">Open editable demo</Link>
            <a className="button" href={`${githubURL}#readme`} rel="noreferrer" target="_blank">Read README</a>
          </div>
        </section>

        <section id="contract" className="tight-section">
          <h2>The agent contract.</h2>
          <div className="grid">
            <InfoCard title="Render semantic intent">Use nodes like `V`, `G`, `M`, `H`, `MO`, `TL`, `CP`, `ST`, `X`, and `WV`; avoid HTML/React/CSS in ordinary turns.</InfoCard>
            <InfoCard title="Patch small edits">For revisions, read the current lightcode and patch the changed lines instead of regenerating a whole stage.</InfoCard>
            <InfoCard title="Use live sources">Declare `0DS` sources and `$source.path` bindings; hosts can push updated snapshots into the existing UI.</InfoCard>
            <InfoCard title="Size by host">Use `stage` sizing for fullscreen canvases with scroll on overflow, or `auto` sizing for embeds that grow around rendered content.</InfoCard>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
