const imgA = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23070707'/%3E%3Cg fill='none' stroke='%23f2f2f2' stroke-width='10'%3E%3Cpath d='M70 260h500M80 220h470M96 180h420'/%3E%3Crect x='100' y='80' width='120' height='80'/%3E%3Crect x='260' y='60' width='96' height='116'/%3E%3Crect x='410' y='96' width='118' height='76'/%3E%3C/g%3E%3C/svg%3E";
const imgB = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23050505'/%3E%3Cg fill='%23f2f2f2'%3E%3Crect x='96' y='96' width='64' height='64'/%3E%3Crect x='208' y='144' width='64' height='64'/%3E%3Crect x='320' y='80' width='64' height='64'/%3E%3Crect x='432' y='168' width='64' height='64'/%3E%3C/g%3E%3C/svg%3E";
const imgC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23080808'/%3E%3Cg stroke='%23f2f2f2' stroke-width='8' fill='none'%3E%3Cpath d='M80 280 220 88l108 132 82-72 150 132'/%3E%3Ccircle cx='480' cy='92' r='34'/%3E%3C/g%3E%3C/svg%3E";

export type Specimen = {
  name: string;
  why: string;
  lightcode: string;
};

export const specimens: Specimen[] = [
  {
    name: "Status Board",
    why: "Metrics, chart, and progress state in six content lines.",
    lightcode: `0F|st=mono
0Y|kpi|bg=card|bd=fg/24|p=4|r=2
0V|Realtime Agent|Runtime ops|width=xl
1G|auto|min=180|max=3|mh=130
2M|Latency|182ms|p95|s=kpi
2M|Queue|72%|ready|tone=success|s=kpi
2P|72|session budget
1H|line|18,22,17,28,34,30,42|h=150
1ST|Loop|Current turn|items=Listen^done^Wake phrase accepted;Build^active^Rendering compact UI;Speak^wait^Queued`
  },
  {
    name: "Runtime Access",
    why: "The `studio` pack gives access and permission moments paired light and dark product surfaces.",
    lightcode: `0F|st=studio
0V|Runtime Access|Host session ready|width=lg
1C|Session|Connected|s=panel
2B|render:write|s=badge
2B|sources:read|s=badge
1T|Use host-managed permissions to render and update this surface.|muted=true
1N|Continue|s=cta`
  },
  {
    name: "News Brief",
    why: "Structured stories and source chips without repeated card markup.",
    lightcode: `0F|st=mono
0V|Morning Brief|Sourced, compact, skimmable
1NL|Latest|Three rows from one compact field|items=Runtime beta opens^Platform^09:00^Source and permission checks are live;Runtime lands^LensUI^09:12^Depth tokens replaced indentation;Streaming tuned^Realtime^09:40^Live update guardrails are active
1SC|Sources|Tap-through references|items=Docs^https://example.com^now^Protocol;Changelog^https://example.com/changelog^5m^Runtime`
  },
  {
    name: "Timeline",
    why: "Events compress into rows, while the renderer owns rhythm and state treatment.",
    lightcode: `0F|st=mono
0V|Release Path|Beta readiness
1TL|Today|Ship window|items=10:00^Access gate^Require host session before rendering^done;11:30^Recovery panel^Clear next action for blocked flows^done;13:00^Lightcode^No indentation, depth tokens only^active;15:00^Gallery QA^Visual regression pass^wait`
  },
  {
    name: "Comparison",
    why: "Great for decisions: two rows become balanced argument cards.",
    lightcode: `0F|st=mono
0V|Interface Payloads|Same UI, less noise
1CP|Lightcode vs Markup|Renderer owns implementation detail|items=LensUI^46 tokens^Semantic intent, host-portable, easy to patch^success;HTML/React^520 tokens^Repeated DOM, class names, and component ceremony^warning`
  },
  {
    name: "Memory Readback",
    why: "Profile facts stay compact but still feel deliberate on screen.",
    lightcode: `0F|st=mono
0V|User Memory|Useful facts only
1MM|Known Preferences|Durable signals|items=Style^monochrome, minimal, slightly geeky^Use black and white first^profile^high;Flow^fewest clicks^Prefer direct recovery paths^product^high;Media^preserve original colors^Never theme source images or video^decision^medium`
  },
  {
    name: "Media Mosaic",
    why: "Visual storyboards can be composed from URLs or data images in one line.",
    lightcode: `0F|st=gallery
0V|Visual Context|Storyboard
1MO|Signal Frames|First item gets emphasis|items=${imgA}^dashboard^Metric board;${imgB}^nodes^Delegation map;${imgC}^terrain^Search landscape`
  },
  {
    name: "Command Surface",
    why: "Tabs, tables, buttons, separators, and cards give agents enough app UI grammar.",
    lightcode: `0F|st=terminal
0V|Controls|Static stage language
1Y|selected=0
2TB|Summary
3C|Runtime|Connected|Source snapshot loaded
2TB|Usage
3Q|Tools|cols=Tool^State|items=render^ready;patch^ready;fetch^GET only
1Z
1N|Continue`
  },
  {
    name: "Live Web Placeholder",
    why: "A single node reserves a native web-view overlay for real interaction.",
    lightcode: `0F|st=mono
0V|Interactive Surface|Host-mounted browsing
1WV|yt|voice UI demos|h=250
1T|The browser renderer emits a semantic placeholder; hosts can mount an actual web view.|muted=true`
  }
];

export function frameHTML(lightcode: string): string {
  return stageFrameHTML(lightcode);
}

export const liveMarketLightcode = `0DS|market|wss://ws-feed.exchange.coinbase.com|mode=stream
0DS|candles|https://api.exchange.coinbase.com/products/BTC-USD/candles|ttl=300|mode=poll
0F|st=studio
0Y|hot|bg=card|bd=fg/24|p=4|r=2
0V|Crypto Live Tape|Coinbase public ticker
1G|auto|min=210|max=2|mh=128
2M|BTC/USD|$market.btc|$market.btcMove|tone=$market.btcTone|flash=$market.btcFlash|s=hot
2M|ETH/USD|$market.eth|$market.ethMove|tone=$market.ethTone|flash=$market.ethFlash|s=hot
1G|auto|min=320|max=2|mh=245
2H|candle|$market.btcCandles|BTC 3H / 5M|h=210
2H|candle|$market.ethCandles|ETH 3H / 5M|h=210
1G|auto|min=280|max=2|mh=260
2TL|Recent tape|$market.clock|items=$market.ticks
1ST|Feed health|$market.status|items=$market.steps`;

export const heroMarketLightcode = `0DS|market|wss://ws-feed.exchange.coinbase.com|mode=stream
0F|st=studio|d=compact
0Y|hot|bg=card|bd=fg/24|p=4|r=2
0V|Crypto Live Tape|Coinbase public ticker
1G|auto|min=190|max=2|mh=110
2M|BTC/USD|$market.btc|$market.btcMove|tone=$market.btcTone|flash=$market.btcFlash|s=hot
2M|ETH/USD|$market.eth|$market.ethMove|tone=$market.ethTone|flash=$market.ethFlash|s=hot
1ST|Feed|$market.status|items=$market.steps|hide=narrow,portrait`;

export const liveMarketScript = `
    if (window.__lensMarketSocket) {
      try { window.__lensMarketSocket.close(); } catch {}
      window.__lensMarketSocket = null;
    }
    if (window.__lensMarketFallbackInterval) clearInterval(window.__lensMarketFallbackInterval);
    if (window.__lensMarketCandleInterval) clearInterval(window.__lensMarketCandleInterval);

    const products = ["BTC-USD", "ETH-USD"];
    const priceState = new Map();
    const moveState = new Map();
    const candleState = new Map();
    const recentTicks = [];
    const btcSeries = [34, 36, 35, 39, 38, 42, 41, 44];
    let tickCount = 0;
    let feedStatus = "connecting to Coinbase WebSocket";
    let fallbackStarted = false;
    let candleRefreshCount = 0;
    let lastFlashProduct = "";
    let lastFlashTone = "";

    function formatPrice(value) {
      const price = Number(value);
      if (!Number.isFinite(price)) return "waiting";
      const digits = price >= 1000 ? 0 : price >= 100 ? 2 : 3;
      return "$" + price.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits >= 2 ? 2 : 0 });
    }

    function stepState(name, state, detail) {
      return name + "^" + state + "^" + detail;
    }

    function productLabel(product) {
      return String(product || "").replace("-", "/");
    }

    function tickTime() {
      return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }

    function pctMove(current, previous) {
      if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return "live";
      const delta = ((current - previous) / previous) * 100;
      if (Math.abs(delta) < 0.001) return "flat";
      return (delta > 0 ? "▲ " : "▼ ") + Math.abs(delta).toFixed(3) + "%";
    }

    function stateFor(product) {
      return moveState.get(product) || { label: "waiting", tone: "muted" };
    }

    function candleNumber(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return "";
      return number.toFixed(number >= 1000 ? 2 : 4);
    }

    function candleLabel(epochSeconds) {
      const date = new Date(Number(epochSeconds) * 1000);
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }

    function candleString(product) {
      const candles = candleState.get(product) || [];
      return candles.slice(-36).map((candle) => [
        candleLabel(candle.t),
        candleNumber(candle.open),
        candleNumber(candle.high),
        candleNumber(candle.low),
        candleNumber(candle.close)
      ].join(",")).join(";");
    }

    function updateLiveCandle(product, price) {
      if (!products.includes(product) || !Number.isFinite(price)) return;
      const bucket = Math.floor(Date.now() / 300000) * 300;
      const candles = (candleState.get(product) || []).slice(-36);
      const last = candles[candles.length - 1];
      if (!last || last.t < bucket) {
        candles.push({ t: bucket, open: price, high: price, low: price, close: price });
      } else {
        candles[candles.length - 1] = {
          ...last,
          high: Math.max(last.high, price),
          low: Math.min(last.low, price),
          close: price
        };
      }
      candleState.set(product, candles.slice(-36));
    }

    function recordTick(product, value, source) {
      const price = Number(value);
      if (!products.includes(product) || !Number.isFinite(price)) return false;
      const previous = Number(priceState.get(product));
      const direction = Number.isFinite(previous) ? Math.sign(price - previous) : 0;
      const tone = direction > 0 ? "success" : direction < 0 ? "destructive" : "muted";
      const label = Number.isFinite(previous) ? pctMove(price, previous) : source === "history" ? "3H candle" : "live";
      priceState.set(product, price);
      moveState.set(product, { label, tone });
      updateLiveCandle(product, price);
      tickCount += 1;
      if (direction !== 0) {
        lastFlashProduct = product;
        lastFlashTone = tone;
      }
      recentTicks.unshift({
        product: productLabel(product),
        price: formatPrice(price),
        source,
        time: tickTime(),
        tone: tone === "muted" ? "warning" : tone
      });
      while (recentTicks.length > 6) recentTicks.pop();
      return true;
    }

    function publishMarket() {
      const btc = Number(priceState.get("BTC-USD"));
      if (Number.isFinite(btc)) {
        const normalized = 22 + Math.round((btc % 1000) / 1000 * 48);
        btcSeries.push(normalized);
        while (btcSeries.length > 18) btcSeries.shift();
      }
      window.lensStage.setSource("market", {
        btc: formatPrice(priceState.get("BTC-USD")),
        eth: formatPrice(priceState.get("ETH-USD")),
        btcMove: stateFor("BTC-USD").label,
        ethMove: stateFor("ETH-USD").label,
        btcTone: stateFor("BTC-USD").tone,
        ethTone: stateFor("ETH-USD").tone,
        btcFlash: lastFlashProduct === "BTC-USD" ? lastFlashTone : "",
        ethFlash: lastFlashProduct === "ETH-USD" ? lastFlashTone : "",
        btcCandles: candleString("BTC-USD"),
        ethCandles: candleString("ETH-USD"),
        trend: btcSeries.join(","),
        clock: recentTicks[0]?.time || "waiting",
        ticks: recentTicks.length
          ? recentTicks.map((tick) => tick.time + "^" + tick.product + "^" + tick.price + " via " + tick.source + "^" + tick.tone).join(";")
          : "waiting^No ticks yet^Connecting to Coinbase market data^warning",
        status: feedStatus,
        steps: [
          stepState("Coinbase WS", fallbackStarted ? "wait" : "active", "public exchange ticker"),
          stepState("REST fallback", fallbackStarted ? "active" : "wait", "keeps demo moving if sockets fail"),
          stepState("3H candles", candleRefreshCount > 0 ? "done" : "active", candleRefreshCount + " refreshes"),
          stepState("LensUI source", "active", tickCount + " live updates applied")
        ].join(";")
      });
      lastFlashProduct = "";
      lastFlashTone = "";
    }

    function applyTicker(ticker) {
      const product = ticker.product_id || ticker.productId || ticker.product;
      const price = ticker.price || ticker.last_price || ticker.price_level || ticker.best_bid || ticker.best_ask;
      if (price == null || !recordTick(product, price, "trade")) return;
      feedStatus = "streaming Coinbase trades";
      publishMarket();
    }

    function extractTickers(message) {
      const tickers = [];
      if (Array.isArray(message.events)) {
        for (const event of message.events) {
          if (Array.isArray(event.tickers)) tickers.push(...event.tickers);
        }
      }
      if (message.type === "ticker" || message.channel === "ticker") tickers.push(message);
      return tickers;
    }

    async function pollSpot() {
      fallbackStarted = true;
      feedStatus = "polling Coinbase spot prices";
      await Promise.all(products.map(async (product) => {
        try {
          const response = await fetch("https://api.coinbase.com/v2/prices/" + product + "/spot", { cache: "no-store" });
          if (!response.ok) return;
          const payload = await response.json();
          const amount = payload && payload.data && payload.data.amount;
          if (amount != null) {
            recordTick(product, amount, "spot poll");
          }
        } catch {}
      }));
      publishMarket();
    }

    async function fetchCandles(product) {
      const end = new Date();
      const start = new Date(end.getTime() - 3 * 60 * 60 * 1000);
      const url = "https://api.exchange.coinbase.com/products/" + product + "/candles?granularity=300&start=" + encodeURIComponent(start.toISOString()) + "&end=" + encodeURIComponent(end.toISOString());
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (!Array.isArray(payload)) return;
      const candles = payload.map((row) => ({
        t: Number(row[0]),
        low: Number(row[1]),
        high: Number(row[2]),
        open: Number(row[3]),
        close: Number(row[4])
      })).filter((candle) => [candle.t, candle.low, candle.high, candle.open, candle.close].every(Number.isFinite))
        .sort((a, b) => a.t - b.t)
        .slice(-36);
      if (!candles.length) return;
      candleState.set(product, candles);
      if (!priceState.has(product)) {
        recordTick(product, candles[candles.length - 1].close, "history");
      }
    }

    async function refreshCandles() {
      try {
        await Promise.all(products.map(fetchCandles));
        candleRefreshCount += 1;
        publishMarket();
      } catch {}
    }

    publishMarket();
    refreshCandles();
    try {
      const socket = new WebSocket("wss://ws-feed.exchange.coinbase.com");
      window.__lensMarketSocket = socket;
      socket.addEventListener("open", () => {
        feedStatus = "subscribed to Coinbase ticker";
        socket.send(JSON.stringify({ type: "subscribe", product_ids: products, channels: ["ticker"] }));
        publishMarket();
      });
      socket.addEventListener("message", (event) => {
        try {
          for (const ticker of extractTickers(JSON.parse(event.data))) applyTicker(ticker);
        } catch {}
      });
      socket.addEventListener("error", () => {
        if (!fallbackStarted) pollSpot();
      });
      socket.addEventListener("close", () => {
        if (!fallbackStarted) pollSpot();
      });
      window.setTimeout(() => {
        if (tickCount === 0 && !fallbackStarted) pollSpot();
      }, 4200);
    } catch {
      pollSpot();
    }
    window.__lensMarketFallbackInterval = setInterval(pollSpot, 8000);
    window.__lensMarketCandleInterval = setInterval(refreshCandles, 300000);
  `;

export const liveDemoLightcode = liveMarketLightcode;

export const liveDemoScript = liveMarketScript;

export function staticStageHTML(lightcode: string, afterRenderScript = ""): string {
  return stageFrameHTML(lightcode, afterRenderScript);
}

export function interactiveStageHTML(lightcode: string, afterRenderScript = ""): string {
  return stageFrameHTML(lightcode, afterRenderScript);
}

function stageFrameHTML(lightcode: string, afterRenderScript = ""): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
    <script>window.tailwind={config:{theme:{extend:{colors:{border:"hsl(var(--border))",input:"hsl(var(--input))",ring:"hsl(var(--ring))",background:"hsl(var(--background))",foreground:"hsl(var(--foreground))",primary:{DEFAULT:"hsl(var(--primary))",foreground:"hsl(var(--primary-foreground))"},secondary:{DEFAULT:"hsl(var(--secondary))",foreground:"hsl(var(--secondary-foreground))"},destructive:{DEFAULT:"hsl(var(--destructive))",foreground:"hsl(var(--destructive-foreground))"},muted:{DEFAULT:"hsl(var(--muted))",foreground:"hsl(var(--muted-foreground))"},accent:{DEFAULT:"hsl(var(--accent))",foreground:"hsl(var(--accent-foreground))"},card:{DEFAULT:"hsl(var(--card))",foreground:"hsl(var(--card-foreground))"},success:"hsl(var(--success))",warning:"hsl(var(--warning))"},borderRadius:{lg:"var(--radius)",md:"calc(var(--radius) - 2px)",sm:"calc(var(--radius) - 4px)"}}}}};</script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>:root{color-scheme:light dark;--background:0 0% 3%;--foreground:0 0% 94%;--card:0 0% 7%;--card-foreground:0 0% 94%;--primary:0 0% 96%;--primary-foreground:0 0% 4%;--secondary:0 0% 11%;--secondary-foreground:0 0% 92%;--muted:0 0% 13%;--muted-foreground:0 0% 62%;--accent:0 0% 18%;--accent-foreground:0 0% 96%;--destructive:0 84% 68%;--destructive-foreground:0 0% 4%;--border:0 0% 24%;--input:0 0% 24%;--ring:0 0% 96%;--success:150 78% 54%;--warning:42 90% 58%;--surface-raised:0 0% 10%;--radius:.5rem;--lens-stage-padding:16px;--lens-grid-line:255 255 255 / .035;--lens-grid-line-soft:255 255 255 / .032;--lens-panel-sheen:255 255 255 / .035;--lens-stage-background:hsl(var(--background));--lens-panel-background:linear-gradient(180deg,rgb(var(--lens-panel-sheen)),transparent 42%),hsl(var(--card)/.92);--lens-panel-border:hsl(var(--border)/.82);--lens-shadow:0 18px 60px rgb(0 0 0 / .24);--lens-font-body:"Manrope",sans-serif;--lens-font-display:"Space Grotesk","Manrope",sans-serif;--lens-font-mono:"JetBrains Mono","SF Mono",ui-monospace,monospace}html,body,#lens-stage-mount{margin:0;width:100%;height:100%;overflow:hidden;background:hsl(var(--background));color:hsl(var(--foreground));font-family:var(--lens-font-body)}*{box-sizing:border-box;letter-spacing:0;min-width:0}.lens-stage-root{width:100%;height:100%;max-width:100%;max-height:100%;overflow:hidden;overscroll-behavior:contain;padding:var(--lens-stage-padding);background:linear-gradient(90deg,rgb(var(--lens-grid-line)) 1px,transparent 1px),linear-gradient(0deg,rgb(var(--lens-grid-line-soft)) 1px,transparent 1px),hsl(var(--background));background-size:32px 32px}.lens-stage-frame{transform-origin:top center}.lens-stage-frame p,.lens-stage-frame h1,.lens-stage-frame h2,.lens-stage-frame h3,.lens-stage-frame h4,.lens-stage-frame td,.lens-stage-frame th{overflow-wrap:anywhere}.lens-display{font-family:var(--lens-font-display)}.ui-mono{font-family:var(--lens-font-mono)}.lens-panel{background:var(--lens-panel-background);border-color:var(--lens-panel-border);box-shadow:var(--lens-shadow)}</style>
  </head><body><div id="lens-stage-mount" data-lens-sizing="auto"></div><script src="/dist/lensui.stage.global.js"></script><script>const code=${JSON.stringify(lightcode)};let activeRequestID=null;function summarize(result){return{ok:!!result.ok,error:result.error||null,metadata:result.metadata||null}}function send(message){try{window.parent&&window.parent.postMessage(message,"*")}catch{}}function publish(result,requestID){send({type:"lensui:render-result",requestID:requestID||null,result:summarize(result)})}function publishSize(detail,requestID){send({type:"lensui:size",requestID:requestID||activeRequestID||null,size:detail})}function installSourcePublisher(){const stage=window.lensStage;if(!stage||stage.__lensDocsSourcePublisher)return;const original=stage.setSource.bind(stage);stage.setSource=(id,payload)=>{const ok=original(id,payload);send({type:"lensui:source-update",sourceID:id,payload,ok,requestID:activeRequestID||null});return ok};stage.__lensDocsSourcePublisher=true}document.getElementById("lens-stage-mount")?.addEventListener("lensui:size",(event)=>publishSize(event.detail));function renderLightcode(nextCode,requestID){activeRequestID=requestID||null;installSourcePublisher();const result=window.lensStage.render(nextCode);if(result.ok){${afterRenderScript}}publish(result,requestID);activeRequestID=null;return result}function applyCommand(commandStream,requestID){activeRequestID=requestID||null;installSourcePublisher();const result=window.lensStage.apply(commandStream);publish(result,requestID);activeRequestID=null;return result}window.addEventListener("message",(event)=>{const data=event.data||{};if(data.type==="lensui:render"&&typeof data.lightcode==="string")renderLightcode(data.lightcode,data.requestID);if(data.type==="lensui:apply"&&typeof data.commandStream==="string")applyCommand(data.commandStream,data.requestID)});function run(){if(window.lensStage){installSourcePublisher();renderLightcode(code,"initial")}else setTimeout(run,16)}run();</script></body></html>`;
}
