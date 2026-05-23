import { expect, test, type Page } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { startLensBridge } from "../packages/bridge/src/index";

const stageURL = pathToFileURL(path.resolve("examples/stage-template.html")).toString();
const siteRoot = path.resolve("apps/docs/out");
let siteServer: Server;
let siteOrigin = "";

type LensApplyResult = {
  ok: boolean;
  error?: string;
  sourceUpdates?: Array<{ id: string; contentType: string; payload: string }>;
  metadata: {
    dataSources: Array<{ id: string; url: string; ttl: number; mode: string }>;
    bindings: Array<{ nodeKey: string; sourceID: string; path: string; role: string }>;
  };
};

type LensStageHandle = {
  render(lightcode: string, components?: unknown[]): LensApplyResult;
  apply(commandStream: string): LensApplyResult;
  setSource(id: string, payload: unknown): boolean;
  read(kind: "lightcode" | "components" | "styles" | "registry" | "metadata" | "status" | "layout"): unknown;
};

declare global {
  interface Window {
    lensStage?: LensStageHandle;
  }
}

test.beforeAll(async () => {
  siteServer = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      const relative = pathname === "/"
        ? "index.html"
        : path.extname(pathname)
          ? pathname.slice(1)
          : `${pathname.slice(1)}.html`;
      const resolved = path.resolve(siteRoot, relative);
      if (resolved !== siteRoot && !resolved.startsWith(`${siteRoot}${path.sep}`)) {
        response.writeHead(403);
        response.end("forbidden");
        return;
      }
      const body = await readFile(resolved);
      response.writeHead(200, { "content-type": contentType(resolved) });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("not found");
    }
  });

  await new Promise<void>((resolve) => {
    siteServer.listen(0, "127.0.0.1", () => {
      const address = siteServer.address();
      if (address && typeof address === "object") {
        siteOrigin = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    siteServer.close((error) => error ? reject(error) : resolve());
  });
});

test.describe("LensUI browser stage runtime", () => {
  test("mounts from the stage template and renders lightcode", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.goto(stageURL);
    await expect(page).toHaveTitle("LensUI stage");
    await waitForLensStage(page);

    const result = await page.evaluate((lightcode) => {
      return window.lensStage!.render(lightcode);
    }, `0DS|news|https://example.com/feed.json|ttl=60|mode=poll
0F|0|ok=120,50,50
0V|E2E Pulse|Runtime mounted
1G|auto|min=180|max=2
2M|Cost|128|usd|tone=success
2H|line|1,2,3|Trend
1WV|yt|story so far covers|play=1
1X|shader|ready
1VV|network|Relations
1NL|Latest||$news.items`);

    expect(result.ok, result.error).toBe(true);
    expect(result.metadata.dataSources).toEqual([
      { id: "news", url: "https://example.com/feed.json", ttl: 60, mode: "poll" }
    ]);
    expect(result.metadata.bindings.some((binding) => binding.sourceID === "news" && binding.path === "items")).toBe(true);

    await expect(page.locator("#lens-stage-root")).toBeVisible();
    await expect(page.getByText("E2E Pulse")).toBeVisible();
    await expect(page.getByText("128")).toBeVisible();
    await expect(page.locator("[data-lens-adaptive-grid]")).toHaveAttribute("data-min-cell-width", "180");
    await expect(page.locator("[data-lens-scene]")).toHaveAttribute("data-scene-kind", "shader");
    await expect(page.locator("[data-vector-kind]")).toHaveAttribute("data-vector-kind", "network");
    await expect(page.locator("[data-lens-webview-url]")).toHaveAttribute("data-lens-webview-url", /youtube\.com\/results/);

    expect(await page.evaluate(() => window.lensStage!.read("lightcode"))).toContain("E2E Pulse");
    expect(health.errors).toEqual([]);
  });

  test("updates live sources and navigates deck pages", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.goto(stageURL);
    await waitForLensStage(page);

    const initial = await page.evaluate((lightcode) => window.lensStage!.render(lightcode), `0DS|news|https://example.com/feed.json|ttl=600|mode=poll
0F|0
0V|Live Brief|Waiting
1M|Headline|$news.headline|source
1NL|Latest||$news.items
1OB|BTC/USD|$news.spread|items=$news.book|depth=5|h=205
1D
2O|One
3T|Page one
2O|Two
3T|Page two`);

    expect(initial.ok, initial.error).toBe(true);
    await expect(page.getByText("Live Brief")).toBeVisible();
    await expect(page.getByText("No stories yet")).toBeVisible();

    const handled = await page.evaluate(() => {
      return window.lensStage!.setSource("news", {
        headline: "Updated from cache",
        items: "Story A,Desk;Story B,Wire",
        spread: "spread 0.13 / 13.0 bps",
        book: "ask^100.45^0.32^0.32;ask^100.38^0.18^0.50;ask^100.31^0.41^0.91;ask^100.24^0.27^1.18;ask^100.17^0.35^1.53;bid^100.12^0.44^0.44;bid^100.05^0.21^0.65;bid^99.98^0.52^1.17;bid^99.91^0.36^1.53;bid^99.84^0.29^1.82"
      });
    });

    expect(handled).toBe(true);
    await expect(page.getByText("Updated from cache")).toBeVisible();
    await expect(page.getByText("Story A")).toBeVisible();
    await expect(page.getByText("Story B")).toBeVisible();
    await expect(page.locator("[data-lens-order-book]")).toBeVisible();
    await expect(page.locator("[data-lens-order-book]")).toContainText("ASK");
    await expect(page.locator("[data-lens-order-book]")).toContainText("BID");
    await expect(page.locator("[data-lens-order-book]")).toContainText("spread 0.13 / 13.0 bps");
    const bookBody = await page.locator("[data-lens-order-book-body]").evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight
    }));
    expect(bookBody.scrollHeight).toBeLessThanOrEqual(bookBody.clientHeight + 1);

    const deck = page.locator("[data-lens-deck]");
    await expect(deck).toHaveAttribute("data-lens-page", "0");
    await deck.locator("[data-lens-next]").click();
    await expect(deck).toHaveAttribute("data-lens-page", "1");
    await deck.locator("[data-lens-prev]").click();
    await expect(deck).toHaveAttribute("data-lens-page", "0");

    expect(health.errors).toEqual([]);
  });

  test("shows a render failure state and preserves the last valid UI", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.goto(stageURL);
    await waitForLensStage(page);

    const initial = await page.evaluate((lightcode) => window.lensStage!.render(lightcode), `0F|st=mono
0V|Stable Surface|Before failure
1M|State|valid`);

    expect(initial.ok, initial.error).toBe(true);
    await expect(page.getByText("Stable Surface")).toBeVisible();

    const failed = await page.evaluate((lightcode) => window.lensStage!.render(lightcode), `0F|st=mono
 1M|Broken|bad indent`);

    expect(failed.ok).toBe(false);
    expect(failed.error).toContain("lightcode lines must start with a depth token");
    await expect(page.getByText("Stable Surface")).toBeVisible();
    await expect(page.locator("[data-lens-render-failure]")).toBeVisible();
    await expect(page.getByText("Previous UI preserved. Fix the lightcode and render again.")).toBeVisible();

    const recovered = await page.evaluate((lightcode) => window.lensStage!.render(lightcode), `0F|st=mono
0V|Recovered Surface|Valid again
1M|State|ok`);

    expect(recovered.ok, recovered.error).toBe(true);
    await expect(page.getByText("Recovered Surface")).toBeVisible();
    await expect(page.locator("[data-lens-render-failure]")).toHaveCount(0);
    expect(health.errors).toEqual([]);
  });

  test("reflows stage containers for narrow portrait screens without horizontal overflow", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(stageURL);
    await waitForLensStage(page);

    const result = await page.evaluate((lightcode) => window.lensStage!.render(lightcode), `0F|st=studio
0V|Runtime Pulse|Live data + renderer-owned visuals
1G|auto|min=160|max=3
2M|Latency|96ms|p95
2M|Tokens|-64%|vs React
2M|Sources|live|bound
1H|line|18,22,17,28,34,30,42,38,51|signal|h=150
1CP|Payload Choice|Small durable surface|items=Built-ins^default^Metrics, charts, media, timelines, comparisons^success;Saved^when needed^Custom JS or app widgets^warning
1MO|Storyboard||items=https://example.com/a.jpg^A^Frame;https://example.com/b.jpg^B^Frame;https://example.com/c.jpg^C^Frame`);

    expect(result.ok, result.error).toBe(true);
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-size", "narrow");
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-aspect", "portrait");
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-flow", "scroll");

    const report = await stageOverflowReport(page);
    expect(report.gridCols[0]).toBe("1");
    expect(report.scrollWidth).toBeLessThanOrEqual(report.rootWidth + 1);
    expect(report.offenders).toEqual([]);
    expect(health.errors).toEqual([]);
  });

  test("sizes runtime surfaces from their mount container instead of a 16:9 viewport", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto(stageURL);
    await waitForLensStage(page);
    await page.locator("#lens-stage-mount").evaluate((element) => {
      element.style.width = "320px";
      element.style.height = "620px";
    });

    const result = await page.evaluate((lightcode) => window.lensStage!.render(lightcode), `0F|st=studio
0V|Container Fit|Portrait host box
1G|auto|min=180|max=3
2M|Latency|96ms|p95
2M|Tokens|-64%|vs React
1H|line|18,22,17,28,34,30,42,38,51|signal|h=220
1X|shader|host sized|h=260
1MO|Frames||items=https://example.com/a.jpg^A^Frame;https://example.com/b.jpg^B^Frame;https://example.com/c.jpg^C^Frame`);

    expect(result.ok, result.error).toBe(true);
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-container-width", "320");
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-container-height", "620");
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-aspect", "portrait");
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-flow", "scroll");
    expect(await page.evaluate(() => window.lensStage!.read("layout"))).toMatchObject({
      sizing: "stage",
      flow: "scroll",
      aspect: "portrait",
      size: "narrow",
      width: 320,
      height: 620
    });

    let dimensions = await stageDimensionReport(page);
    expect(dimensions.rootWidth).toBe(320);
    expect(dimensions.rootHeight).toBe(620);
    expect(dimensions.viewportWidth).toBe(1100);
    expect(dimensions.chartHeight).toBeLessThanOrEqual(220);
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.rootWidth + 1);

    await page.locator("#lens-stage-mount").evaluate((element) => {
      element.style.width = "860px";
      element.style.height = "320px";
    });
    await page.waitForFunction(() => document.querySelector<HTMLElement>("#lens-stage-root")?.dataset.lensContainerWidth === "860");

    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-container-width", "860");
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-container-height", "320");
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-aspect", "wide");
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-flow", "scroll");
    dimensions = await stageDimensionReport(page);
    expect(dimensions.rootWidth).toBe(860);
    expect(dimensions.rootHeight).toBe(320);
    expect(dimensions.chartHeight).toBeLessThanOrEqual(140);
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.rootWidth + 1);
    expect(health.errors).toEqual([]);
  });

  test("supports runtime auto sizing and stage overflow scroll", async ({ page }) => {
    const health = collectPageHealth(page);
    const tallLightcode = `0F|st=mono
0V|Overflow Surface|Runtime sizing contract
1G|auto|min=180|max=3
2M|Latency|96ms|p95
2M|Tokens|-64%|vs React
2M|Sources|live|bound
1H|line|18,22,17,28,34,30,42,38,51|signal|h=260
1X|shader|host sized|h=360
1ST|Long Loop|Overflow check|items=One^done^Runtime owned;Two^done^Runtime owned;Three^active^Runtime owned;Four^wait^Runtime owned;Five^wait^Runtime owned;Six^wait^Runtime owned;Seven^wait^Runtime owned;Eight^wait^Runtime owned`;

    await page.setViewportSize({ width: 1000, height: 520 });
    await page.goto(stageURL);
    await waitForLensStage(page);
    await page.locator("#lens-stage-mount").evaluate((element) => {
      element.dataset.lensSizing = "stage";
      element.style.width = "760px";
      element.style.height = "340px";
    });

    const stageSize = await renderAndCaptureSize(page, tallLightcode);
    expect(stageSize.sizing).toBe("stage");
    expect(stageSize.flow).toBe("scroll");
    expect(stageSize.overflowY).toBe(true);
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-sizing", "stage");
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-flow", "scroll");
    expect(await page.locator("#lens-stage-root").evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");

    await page.locator("#lens-stage-mount").evaluate((element) => {
      element.dataset.lensSizing = "auto";
      element.style.width = "480px";
      element.style.height = "360px";
    });
    const autoSize = await renderAndCaptureSize(page, tallLightcode);
    expect(autoSize.sizing).toBe("auto");
    expect(autoSize.flow).toBe("auto");
    expect(autoSize.contentHeight).toBeGreaterThan(360);
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-sizing", "auto");
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-flow", "auto");
    expect(await page.locator("#lens-stage-root").evaluate((element) => getComputedStyle(element).overflowY)).toBe("hidden");
    expect(health.errors).toEqual([]);
  });

  test("supports multiple runtime containers in one document", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.goto(stageURL);
    await waitForLensStage(page);

    const registry = await page.evaluate(() => {
      const second = document.createElement("div");
      second.dataset.lensStage = "1";
      second.dataset.lensSizing = "auto";
      second.style.width = "420px";
      second.style.height = "320px";
      document.body.appendChild(second);
      const runtime = (window as any).LensUIBundle.createStageRuntime(second);
      window.lensStage!.render("0F|st=mono\n0V|First Runtime|Original");
      runtime.render("0F|st=studio\n0V|Second Runtime|Scoped");
      return {
        activeText: document.querySelector("#lens-stage-mount")?.textContent ?? "",
        secondText: second.textContent ?? "",
        registrySize: (window as any).lensStages?.size ?? 0,
        secondLensID: second.dataset.lensId ?? ""
      };
    });

    expect(registry.activeText).toContain("First Runtime");
    expect(registry.secondText).toContain("Second Runtime");
    expect(registry.registrySize).toBeGreaterThanOrEqual(2);
    expect(registry.secondLensID).toBeTruthy();
    expect(health.errors).toEqual([]);
  });

  test("resolves system light and dark color modes", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(stageURL);
    await waitForLensStage(page);
    let result = await page.evaluate((lightcode) => window.lensStage!.render(lightcode), "0F|st=mono\n0V|System Theme");
    expect(result.ok, result.error).toBe(true);
    await expect(page.locator("#lens-stage-mount")).toHaveAttribute("data-lens-color-mode", "light");
    await expect(page.locator("#lens-stage-mount")).toHaveAttribute("data-lens-requested-color-mode", "system");
    expect(await page.locator("#lens-stage-mount").evaluate((element) => getComputedStyle(element).getPropertyValue("--background").trim())).toBe("0 0% 98%");

    await page.emulateMedia({ colorScheme: "dark" });
    result = await page.evaluate((lightcode) => window.lensStage!.render(lightcode), "0F|st=mono\n0V|System Theme");
    expect(result.ok, result.error).toBe(true);
    await expect(page.locator("#lens-stage-mount")).toHaveAttribute("data-lens-color-mode", "dark");
    expect(await page.locator("#lens-stage-mount").evaluate((element) => getComputedStyle(element).getPropertyValue("--background").trim())).toBe("0 0% 3%");

    result = await page.evaluate((lightcode) => window.lensStage!.render(lightcode), "0F|st=studio|mode=light\n0V|Forced Light");
    expect(result.ok, result.error).toBe(true);
    await expect(page.locator("#lens-stage-mount")).toHaveAttribute("data-lens-color-mode", "light");
    await expect(page.locator("#lens-stage-mount")).toHaveAttribute("data-lens-requested-color-mode", "light");
    expect(health.errors).toEqual([]);
  });

  test("applies command streams without a page reload", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.goto(stageURL);
    await waitForLensStage(page);

    const applied = await page.evaluate((commandStream) => window.lensStage!.apply(commandStream), `!
@!|KPI|a|g
0@|KPI|M|tone=success
.
R
0F|0
0V|Patch Demo
1KPI|Cost|12|usd
.
^|3|1
1KPI|Cost|14|usd
.`);

    expect(applied.ok, applied.error).toBe(true);
    await expect(page.getByText("Patch Demo")).toBeVisible();
    await expect(page.getByText("14")).toBeVisible();
    expect(await page.evaluate(() => window.lensStage!.read("lightcode"))).toContain("KPI|Cost|14|usd");
    expect(health.errors).toEqual([]);
  });

  test("persists saved components and toggles responsive visibility by container size", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.setViewportSize({ width: 900, height: 720 });
    await page.goto(stageURL);
    await waitForLensStage(page);

    const applied = await page.evaluate(() => {
      window.localStorage.removeItem("e2e:lensui:registry");
      (window.lensStage as any).enablePersistence({ key: "e2e:lensui:registry" });
      const result = window.lensStage!.apply(`!
@!|KPI|a|g
0M|tone=success
.
R
0F|st=mono
0V|Responsive Registry|Saved component
1G|auto|min=180|max=2
2KPI|Wide metric|visible|show=wide
2KPI|Small metric|visible|show=narrow,portrait
.`);
      return {
        result,
        registry: JSON.parse(window.localStorage.getItem("e2e:lensui:registry") ?? "{}")
      };
    });

    expect(applied.result.ok, applied.result.error).toBe(true);
    expect(applied.registry.components?.[0]?.name).toBe("KPI");
    await expect(page.getByText("Wide metric")).toBeVisible();
    await expect(page.getByText("Small metric")).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("#lens-stage-root")).toHaveAttribute("data-lens-size", "narrow");
    await expect(page.getByText("Wide metric")).toBeHidden();
    await expect(page.getByText("Small metric")).toBeVisible();

    const reused = await page.evaluate(() => {
      const second = document.createElement("div");
      second.dataset.lensStage = "1";
      second.dataset.lensSizing = "auto";
      second.style.width = "420px";
      second.style.height = "320px";
      document.body.appendChild(second);
      const runtime = (window as any).LensUIBundle.createStageRuntime(second, { persistence: { key: "e2e:lensui:registry" } });
      return runtime.render("0F|st=mono\n0V|Reused Component\n1KPI|Loaded|from storage");
    });

    expect(reused.ok, reused.error).toBe(true);
    await expect(page.getByText("Reused Component")).toBeVisible();
    await expect(page.getByText("Loaded")).toBeVisible();
    expect(health.errors).toEqual([]);
  });

  test("applies source update messages from command streams", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.goto(stageURL);
    await waitForLensStage(page);

    const initial = await page.evaluate((lightcode) => window.lensStage!.render(lightcode), `0DS|metrics|https://example.com/metrics.json|ttl=3|mode=poll
0F|st=mono
0V|Metric Feed|Polling source
1M|Latency|$metrics.latency|p95`);

    expect(initial.ok, initial.error).toBe(true);
    await expect(page.getByText("Metric Feed")).toBeVisible();

    const applied = await page.evaluate((commandStream) => window.lensStage!.apply(commandStream), `!
S|metrics|application/json
{"latency":"88ms"}
.`);

    expect(applied.ok, applied.error).toBe(true);
    expect(applied.sourceUpdates).toEqual([{ id: "metrics", contentType: "application/json", payload: "{\"latency\":\"88ms\"}" }]);
    await expect(page.getByText("88ms")).toBeVisible();
    expect(health.errors).toEqual([]);
  });

  test("runs scripts from raw html components", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.goto(stageURL);
    await waitForLensStage(page);

    const applied = await page.evaluate((commandStream) => window.lensStage!.apply(commandStream), `!
@!|HotHTML|html|g
<div id="hot-html" onclick="window.__lensHotHTMLClicked = true">
  <span class="value">{{0}}</span>
  {{children}}
  <script>
    window.__lensHotHTMLRuns = (window.__lensHotHTMLRuns || 0) + 1;
    document.querySelector("#hot-html .value").textContent += " scripted";
  </script>
</div>
.
R
0F|0
0V|Raw Component
1HotHTML|active
2T|child node
.`);

    expect(applied.ok, applied.error).toBe(true);
    await expect(page.getByText("active scripted")).toBeVisible();
    await expect(page.getByText("child node")).toBeVisible();
    expect(await page.evaluate(() => (window as any).__lensHotHTMLRuns)).toBe(1);

    await page.locator("#hot-html").click();
    expect(await page.evaluate(() => (window as any).__lensHotHTMLClicked)).toBe(true);
    expect(health.errors).toEqual([]);
  });

  test("renders the blank agent target with copyable bridge instructions", async ({ page }) => {
    test.setTimeout(90_000);
    const health = collectPageHealth(page);

    await page.goto(siteOrigin);
    await expect(page.getByRole("heading", { name: "Connect your agent to this surface.", exact: true })).toBeVisible();

    const demo = page.locator(".demo-stage .lens-playground").first();
    const demoFrame = page.frameLocator('iframe[title="LensUI demo render"]');
    await expect(demoFrame.locator("#lens-stage-root")).toBeVisible();
    await expect(demoFrame.getByText("Connect your agent to stream UI")).toBeVisible();
    await expect(demo.getByRole("tab", { name: "Lightcode" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "brief" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "gallery" })).toHaveCount(0);

    const copyButton = page.getByRole("button", { name: "Copy agent instructions" });
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toBeEnabled();
    const instructions = await page.getByLabel("LensUI agent instructions").inputValue();
    expect(instructions).toContain("npx -y --package @ardabot/lensui@latest lensui skill");
    expect(instructions).toContain("npx -y --package @ardabot/lensui@latest lensui bridge");
    expect(instructions).toContain("/render");
    expect(instructions).toContain("/apply");
    expect(instructions).toContain("Custom HTML/CSS/JS/canvas");
    expect(instructions).toContain("@!|AgentCanvas|html|agent-generated");
    expect(instructions).toContain("No connected LensUI container");
    expect(instructions).toContain("A 200 response means the bridge delivered the message");
    const surfaceOrder = await page.evaluate(() => {
      const bridge = document.querySelector<HTMLElement>(".agent-surface .agent-bridge");
      const iframe = document.querySelector<HTMLIFrameElement>(".agent-surface iframe");
      const bridgeRect = bridge?.getBoundingClientRect();
      const iframeRect = iframe?.getBoundingClientRect();
      return {
        bridgeBottom: bridgeRect?.bottom ?? 0,
        iframeTop: iframeRect?.top ?? 0
      };
    });
    expect(surfaceOrder.iframeTop).toBeGreaterThanOrEqual(surfaceOrder.bridgeBottom - 1);
    await expect(demoFrame.locator("[data-lens-render-failure]")).toHaveCount(0);

    expect(health.errors).toEqual([]);
  });

  test("renders the one-page Next docs app and live demo", async ({ page }) => {
    test.setTimeout(90_000);
    const health = collectPageHealth(page);

    await mockCoinbaseMarketRoutes(page);
    await page.goto(siteOrigin);
    await expect(page.getByRole("heading", { name: "Next-gen UI isn't using AI to generate code to ship to everybody. It's AI streaming UI to each user live.", exact: true })).toBeVisible();
    const sectionOrder = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(".hero-shell");
      const demo = document.querySelector<HTMLElement>("#demo");
      const why = document.querySelector<HTMLElement>("#why");
      return {
        heroTop: hero?.offsetTop ?? -1,
        demoTop: demo?.offsetTop ?? -1,
        whyTop: why?.offsetTop ?? -1
      };
    });
    expect(sectionOrder.demoTop).toBeGreaterThan(sectionOrder.heroTop);
    expect(sectionOrder.whyTop).toBeGreaterThan(sectionOrder.demoTop);
    await expect(page.getByText("runtime patches the mounted page", { exact: true })).toBeVisible();
    await expect(page.getByText("new client bundle per render", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Why", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Live surface", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Agent bridge", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Install", exact: true })).toBeVisible();
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "npm", exact: true })).toHaveAttribute("href", "https://www.npmjs.com/package/@ardabot/lensui");
    await expect(header.getByRole("link", { name: "GitHub", exact: true })).toHaveAttribute("href", "https://github.com/ardabotai/lensui");
    await expect(page.getByText("npm install @ardabot/lensui")).toBeVisible();
    await expect(page.getByRole("heading", { name: "The old loop generates code. LensUI grows a live interface.", exact: true })).toBeVisible();
    await expect(page.getByText("Live Forecast", { exact: true })).toHaveCount(0);
    const heroFrame = page.frameLocator('iframe[title="LensUI live runtime preview"]');
    await expect(heroFrame.locator("#lens-stage-root")).toBeVisible();
    await expect(heroFrame.getByText("Crypto Live Tape")).toBeVisible();
    await expect(heroFrame.getByText("SOL/USD")).toHaveCount(0);
    await expect(heroFrame.getByText("flat")).toHaveCount(0);
    const heroBook = heroFrame.locator("[data-lens-order-book]");
    await expect(heroBook).toBeVisible();
    await expect(heroBook).toContainText("BTC/USD Book");
    await expect(heroBook).toContainText("ASK");
    await expect(heroBook).toContainText("BID");
    const heroBookBody = await heroFrame.locator("[data-lens-order-book-body]").evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight
    }));
    expect(heroBookBody.scrollHeight).toBeLessThanOrEqual(heroBookBody.clientHeight + 1);

    const bridgeServer = startLensBridge({ port: 0 });
    await once(bridgeServer, "listening");
    const bridgeAddress = bridgeServer.address();
    if (!bridgeAddress || typeof bridgeAddress === "string") throw new Error("bridge did not bind to a TCP port");
    const bridgeOrigin = `http://127.0.0.1:${bridgeAddress.port}`;

    try {
      await page.goto(`${siteOrigin}?bridge=${encodeURIComponent(bridgeOrigin)}`);
      await expect(page.getByRole("heading", { name: "Connect your agent to this surface.", exact: true })).toBeVisible();
      let demoFrame = page.frameLocator('iframe[title="LensUI demo render"]');
      await expect(demoFrame.locator("#lens-stage-root")).toBeVisible();
      await expect(demoFrame.locator("#lens-stage-root")).toHaveAttribute("data-lens-sizing", "auto");
      await expect(demoFrame.locator("#lens-stage-root")).toHaveAttribute("data-lens-flow", "auto");
      await expect(demoFrame.getByText("Connect your agent to stream UI")).toBeVisible();
      await expect(demoFrame.getByText("Crypto Live Tape")).toHaveCount(0);
      await expect(demoFrame.getByText("SOL/USD")).toHaveCount(0);
      await expect(demoFrame.getByText("flat")).toHaveCount(0);
      await expect(demoFrame.locator("[data-lens-scene]")).toHaveCount(0);
      await expect(demoFrame.locator("[data-lens-candle-chart]")).toHaveCount(0);
      const playgroundLayout = await page.evaluate(() => {
        const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="LensUI demo render"]');
        const bridge = document.querySelector<HTMLElement>(".agent-bridge");
        const iframeRect = iframe?.getBoundingClientRect();
        const bridgeRect = bridge?.getBoundingClientRect();
        return {
          iframeHeight: iframeRect?.height ?? 0,
          iframeTop: iframeRect?.top ?? 0,
          bridgeBottom: bridgeRect?.bottom ?? 0
        };
      });
      expect(playgroundLayout.iframeHeight).toBe(560);
      expect(playgroundLayout.iframeTop).toBeGreaterThanOrEqual(playgroundLayout.bridgeBottom - 1);
      await expect(page.locator(".demo-stage .lens-live-stream")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Connect bridge" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Copy bridge command" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Copy hello render" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Copy agent instructions" })).toBeVisible();
      const instructions = await page.getByLabel("LensUI agent instructions").inputValue();
      expect(instructions).toContain("You are controlling a live LensUI container");
      expect(instructions).toContain(bridgeOrigin);
      expect(instructions).toContain("@!|AgentCanvas|html|agent-generated");
      await expect(page.getByRole("button", { name: "live data" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "animated art" })).toHaveCount(0);
      await iframeScreenshot(page);

      await expect(page.locator(".bridge-pill.connected")).toBeVisible();
      const bridgeTarget = await page.locator(".agent-bridge").evaluate((element) => ({
        lensID: element.getAttribute("data-lens-id") ?? "",
        token: element.getAttribute("data-lens-token") ?? ""
      }));
      const helloResponse = await fetch(`${bridgeOrigin}/lens/${bridgeTarget.lensID}/render`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${bridgeTarget.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ lightcode: "0F|st=mono\n0V|Hello from your agent|Live target\n1M|Bridge|connected|local" })
      });
      expect(helloResponse.status).toBe(200);
      await expect(demoFrame.getByText("Hello from your agent")).toBeVisible();
      await expect(page.locator(".agent-bridge.streaming")).toBeVisible();
      await expect(page.getByLabel("LensUI agent instructions")).toHaveCount(0);

      const customResponse = await fetch(`${bridgeOrigin}/lens/${bridgeTarget.lensID}/apply`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${bridgeTarget.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          commandStream: `!
@!|TestCanvas|html|agent-generated
<div class="agent-test-canvas"><canvas></canvas><span>{{0}}</span><script>window.__lensuiTestCanvasRan=(window.__lensuiTestCanvasRan||0)+1;const root=document.currentScript.closest(".agent-test-canvas");const canvas=root.querySelector("canvas");canvas.width=64;canvas.height=32;const ctx=canvas.getContext("2d");ctx.fillStyle="#00ffff";ctx.fillRect(0,0,64,32);</script></div>
.
R
0F|st=studio
0V|Custom component|Bridge apply
1TestCanvas|canvas online
.`
        })
      });
      expect(customResponse.status).toBe(200);
      await expect(demoFrame.getByText("canvas online")).toBeVisible();
      await expect(demoFrame.locator(".agent-test-canvas canvas")).toHaveCount(1);
      expect(await demoFrame.locator("body").evaluate(() => (window as any).__lensuiTestCanvasRan)).toBe(1);
    } finally {
      await closeServerNow(bridgeServer);
    }
    expect(health.errors).toEqual([]);
  });

  test("keeps docs homepage and LensUI iframe previews inside a phone viewport", async ({ page }) => {
    const health = collectPageHealth(page);

    await page.setViewportSize({ width: 390, height: 1200 });
    await mockCoinbaseMarketRoutes(page);
    await page.goto(siteOrigin);
    await expect(page.getByRole("heading", { name: "Next-gen UI isn't using AI to generate code to ship to everybody. It's AI streaming UI to each user live.", exact: true })).toBeVisible();

    const docWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(docWidth + 1);

    const heroFrame = page.frameLocator('iframe[title="LensUI live runtime preview"]');
    await expect(heroFrame.locator("#lens-stage-root")).toHaveAttribute("data-lens-size", "narrow");
    await expect(heroFrame.locator("[data-lens-adaptive-grid]").first()).toHaveAttribute("data-lens-cols", "1");
    await expect(heroFrame.locator('[data-lens-component="metric"]').filter({ hasText: "ETH/USD" })).toBeHidden();
    await expect(heroFrame.locator("[data-lens-order-book]")).toBeVisible();
    const heroBookFit = await heroFrame.locator("[data-lens-order-book]").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        viewportHeight: document.documentElement.clientHeight
      };
    });
    expect(heroBookFit.bottom).toBeLessThanOrEqual(heroBookFit.viewportHeight + 1);
    expect(health.errors).toEqual([]);
  });
});

function contentType(file: string): string {
  switch (path.extname(file)) {
    case ".html": return "text/html; charset=utf-8";
    case ".js": return "application/javascript; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".json": return "application/json; charset=utf-8";
    default: return "application/octet-stream";
  }
}

function collectPageHealth(page: Page): { errors: string[] } {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return { errors };
}

async function mockCoinbaseMarketRoutes(page: Page): Promise<void> {
  let tick = 0;
  const bases: Record<string, number> = {
    "BTC-USD": 104250,
    "ETH-USD": 3820
  };
  const drift: Record<string, number> = {
    "BTC-USD": 11,
    "ETH-USD": -1.4
  };

  await page.route("https://api.coinbase.com/v2/prices/**/spot", async (route) => {
    tick += 1;
    const product = productFromURL(route.request().url()) ?? "BTC-USD";
    const amount = (bases[product] ?? 100) + tick * (drift[product] ?? 0.2);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          base: product.split("-")[0],
          currency: "USD",
          amount: amount.toFixed(2)
        }
      })
    });
  });

  await page.route("https://api.exchange.coinbase.com/products/**/candles**", async (route) => {
    const product = productFromURL(route.request().url()) ?? "BTC-USD";
    const base = bases[product] ?? 100;
    const step = drift[product] ?? 0.2;
    const end = Math.floor(Date.now() / 300000) * 300;
    const rows = Array.from({ length: 36 }, (_, index) => {
      const t = end - (35 - index) * 300;
      const open = base + index * step + Math.sin(index / 3) * Math.abs(step) * 2;
      const close = open + Math.cos(index / 2) * Math.abs(step) * 1.6;
      const high = Math.max(open, close) + Math.abs(step) * 2.4;
      const low = Math.min(open, close) - Math.abs(step) * 2.2;
      return [t, Number(low.toFixed(4)), Number(high.toFixed(4)), Number(open.toFixed(4)), Number(close.toFixed(4)), 12 + index];
    });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows) });
  });

  await page.route("https://api.exchange.coinbase.com/products/**/book**", async (route) => {
    const product = productFromURL(route.request().url()) ?? "BTC-USD";
    const base = bases[product] ?? 100;
    const bids = Array.from({ length: 12 }, (_, index) => [
      (base - 5 - index * 4).toFixed(2),
      (0.18 + index * 0.035).toFixed(4),
      1 + (index % 3)
    ]);
    const asks = Array.from({ length: 12 }, (_, index) => [
      (base + 5 + index * 4).toFixed(2),
      (0.14 + index * 0.031).toFixed(4),
      1 + (index % 2)
    ]);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bids, asks }) });
  });
}

function productFromURL(rawURL: string): string | undefined {
  const match = rawURL.match(/(?:prices|products)\/([^/?]+)(?:\/spot)?/);
  return match?.[1];
}

async function waitForLensStage(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof window.lensStage === "object");
  await expect(page.locator("#lens-stage-mount")).toBeAttached();
}

async function renderAndCaptureSize(page: Page, lightcode: string): Promise<{
  sizing: string;
  flow: string;
  contentHeight: number;
  overflowY: boolean;
}> {
  return page.evaluate((nextLightcode) => {
    return new Promise<{ sizing: string; flow: string; contentHeight: number; overflowY: boolean }>((resolve) => {
      const mount = document.querySelector<HTMLElement>("#lens-stage-mount");
      mount?.addEventListener("lensui:size", (event) => {
        resolve((event as CustomEvent<{ sizing: string; flow: string; contentHeight: number; overflowY: boolean }>).detail);
      }, { once: true });
      window.lensStage!.render(nextLightcode);
    });
  }, lightcode);
}

async function stageOverflowReport(page: Page): Promise<{
  rootWidth: number;
  scrollWidth: number;
  gridCols: string[];
  offenders: Array<{ tag: string; component: string | null; text: string; left: number; right: number }>;
}> {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("#lens-stage-root");
    if (!root) return { rootWidth: 0, scrollWidth: 0, gridCols: [], offenders: [] };
    const rootRect = root.getBoundingClientRect();
    const offenders = Array.from(root.querySelectorAll<HTMLElement>("#lens-stage-frame, #lens-stage-frame *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return false;
        return rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1;
      })
      .slice(0, 8)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          component: element.getAttribute("data-lens-component"),
          text: (element.textContent ?? "").trim().slice(0, 48),
          left: Math.round(rect.left),
          right: Math.round(rect.right)
        };
      });
    return {
      rootWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      gridCols: Array.from(root.querySelectorAll<HTMLElement>("[data-lens-adaptive-grid]")).map((element) => element.dataset.lensCols ?? ""),
      offenders
    };
  });
}

async function iframeScreenshot(page: Page): Promise<Buffer> {
  const iframe = page.locator('iframe[title="LensUI demo render"]');
  await expect(iframe).toBeVisible();
  await iframe.scrollIntoViewIfNeeded();
  const box = await iframe.boundingBox();
  if (!box) throw new Error("LensUI demo iframe is not visible.");
  const viewport = page.viewportSize();
  const clipX = Math.max(0, Math.floor(box.x));
  const clipY = Math.max(0, Math.floor(box.y));
  const maxWidth = Math.max(1, (viewport?.width ?? Math.ceil(box.width)) - clipX);
  const maxHeight = Math.max(1, (viewport?.height ?? Math.ceil(box.height)) - clipY);
  return page.screenshot({
    animations: "disabled",
    clip: {
      x: clipX,
      y: clipY,
      width: Math.max(1, Math.min(maxWidth, Math.ceil(box.width))),
      height: Math.max(1, Math.min(maxHeight, 720, Math.ceil(box.height)))
    }
  });
}

async function closeServerNow(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections?.();
  });
}

async function stageDimensionReport(page: Page): Promise<{
  rootWidth: number;
  rootHeight: number;
  scrollWidth: number;
  viewportWidth: number;
  chartHeight: number;
}> {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("#lens-stage-root");
    const chart = document.querySelector<SVGElement>("[data-lens-role='chartData']");
    return {
      rootWidth: root?.clientWidth ?? 0,
      rootHeight: root?.clientHeight ?? 0,
      scrollWidth: root?.scrollWidth ?? 0,
      viewportWidth: window.innerWidth,
      chartHeight: chart?.getBoundingClientRect().height ?? 0
    };
  });
}
