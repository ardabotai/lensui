---
name: lensui
description: Generate, revise, validate, and repair LensUI lightcode for agent-rendered visual interfaces. Use when an agent needs to render UI with LensUI, patch an existing LensUI stage, choose compact semantic components, or decide when to save custom HTML/JS/React components instead of emitting verbose markup.
---

# LensUI Agent Skill

LensUI is a token-efficient UI runtime for agents. Generate semantic lightcode plus compact LightStyle tokens, not HTML, JSX, CSS, Tailwind, D3, Three.js, or SVG in normal render payloads. The renderer owns DOM structure, default styling, layout fitting, charts, media mounting, live bindings, and host adapters.

## Live Target Fast Path

When the user gives you a LensUI bridge target (`bridge`, `lensID`, and bearer token), do not scaffold an app, create files, or explain the protocol first. Render to the existing browser surface immediately.

1. If needed, start the loopback bridge:

```sh
npx -y --package @ardabot/lensui@latest lensui bridge --port 5743
```

2. Prove the connection with `/render`:

```sh
curl -sS -X POST <bridge>/lens/<lensID>/render \
  -H "authorization: Bearer <token>" \
  -H "content-type: application/json" \
  --data '{"lightcode":"0F|st=mono|f=mono|d=compact\n0V|Hello from your agent|Live LensUI target\n1G|auto|min=180|max=3\n2M|Bridge|connected|local\n2M|Payload|lightcode|compact\n2M|Target|scoped|secure"}'
```

3. For plain semantic UI, keep using `/render` with `{ "lightcode": "..." }`.
4. For saved components, styles, patches, or source updates, use `/apply` with `{ "commandStream": "..." }`.
5. If the response is `404`, the browser target is not connected yet or the token/lensID is wrong. Ask the user to keep the LensUI page open, recopy the prompt, or restart the local bridge.

## Bridge Transport

The public bridge has two HTTP endpoints. A `200` response means the message was delivered to at least one connected browser container; browser render errors may still appear inside the stage.

- `POST /lens/:lensID/render` with `{ "lightcode": "..." }`: full semantic lightcode render.
- `POST /lens/:lensID/apply` with `{ "commandStream": "..." }`: patches, saved components, saved styles, source updates, and page actions.

Conceptual tool mapping:

| Intent | Bridge transport |
| --- | --- |
| `render(lightcode)` | `/render` body `{ "lightcode": "..." }` or `/apply` command `R` |
| `patch(offset, delete, lightcode)` | `/apply` command `^|offset|delete` |
| `save_component(name, kind, source)` | `/apply` command `@!|name|kind|trust` |
| `patch_component(name, off, del, source)` | `/apply` command `@^|name|off|del` |
| `delete_component(name)` | `/apply` command `@-|name` |
| `save_style(name, source)` | `/apply` command `Y!|name|trust` |
| `patch_style(name, off, del, source)` | `/apply` command `Y^|name|off|del` |
| `delete_style(name)` | `/apply` command `Y-|name` |
| `set_default_style(name)` | `/apply` command `Y*|name` |
| `setSource(id, payload)` | `/apply` command `S|id|content-type` |
| page navigation/action | `/apply` command `P|action` |

Command stream wire format:

```text
!
CMD|field|field
block body for block commands
.
```

- First non-blank line must be `!`.
- Block commands read following lines until a lone `.`. Escape a literal lone dot as `\.`.
- Full command set: `R`, `^`, `@!`, `@^`, `@-`, `Y!`, `Y^`, `Y-`, `Y*`, `S`, `P`.
- Component `kind`: `a`/`alias`, `h`/`html`, `r`/`react`, `s`/`swiftui`.
- Trust: `b`/`built-in`, `u`/`user-saved`, `g`/`agent-generated`, `m`/`remote-imported`. Use `agent-generated` or `g` for normal agent-created components.
- `S|id|application/json` updates a live source; body should usually be JSON. It does not re-render new lightcode; it updates existing `$id.path` bindings.

## Core Workflow

1. For a new topic or major layout change, call `render(dsl)` with a full lightcode document. Over the bridge, use `/render`.
2. For a small revision, call `read_dsl(offset?, limit?)`, then `patch(offset, delete, dsl)`. Over the bridge, use `/apply` with `^|offset|delete`.
   Use `patch` for small edits after reading the current lightcode.
3. Put `0F|0` first unless preserving an existing frame line. Every render should carry its visual frame as lightcode.
4. Prefix every lightcode line with a base36 depth token. Do not indent.
5. Prefer short semantic built-ins, compact `items=` rows, and compact `0Y` style recipes.
6. Use saved style packs for durable art direction. Save reusable components when built-ins cannot express the UI compactly, then instantiate them by short name in later turns.
7. For live values, render stable bindings once, then update source snapshots. Do not resend the whole stage just to tick a value or chart.
8. Treat LensUI as screen-size and aspect-ratio agnostic. Use semantic adaptive containers and never depend on a specific phone, laptop, or TV viewport. When a host exposes `lens_read layout` or `stage.read("layout")`, read it before dense renders or after overflow and adapt to the returned width, height, aspect, size, and flow.
9. If a parse/render error returns, fix the invalid line or depth sequence and retry once.

## Lightcode Rules

- One node per line.
- `|` separates fields.
- First character is depth: `0` top level, `1` child, `2` grandchild, then `a-z` after `9`.
- Depth may stay the same, decrease, or increase by one. Never jump from `0` to `2`.
- Args come first; props are `k=v`.
- Escape literal `|` as `\|` and newlines as `\n`.
- Frame/style overrides use compact keys: `st` saved style pack, `f` font, `d` density, `bg`, `fg`, `card`, `p`, `ok`, `w`, `bad`, `br`, `r`, `sh`, `fx`, and `pad`.
- Top-level style recipe directive: `0Y|name|bg=card|fg=fg|bd=fg/24|p=3|r=2|sh=hard|caps=1|mono=1`. Apply with `s=name` on any node.
- Top-level alias directive: `0@|Alias|Base|defaultArg|k=v`.
- Top-level data source directive: `0DS|id|url|ttl=600|mode=poll`, for example `0DS|news|https://example.com/feed.json|ttl=600|mode=poll`.
- Use `$id.path` only for known data sources. Literal dollar amounts like `$28.40` are not bindings.
- Live data uses the same binding syntax. Hosts push updates with `setSource(id, payload)`; bound metrics, rows, charts, progress, and status components update in place.
- Containers are adaptive by default. Prefer `G|auto|min=160-240|max=2-4` for repeated items; the runtime will collapse columns by actual container width and aspect ratio. Host apps choose `data-lens-sizing="stage"` for fixed stages with scroll fallback, or `data-lens-sizing="auto"` for embeds that resize around the rendered content.
- If available, `lens_read layout` returns the actual container contract: `width`, `height`, `contentWidth`, `contentHeight`, `aspect`, `size`, `flow`, `scale`, `overflowX`, and `overflowY`. Use it to choose fewer columns, shorter charts, hidden optional panels, or multiple pages.
- Components can opt into runtime visibility with `show=` and `hide=` tokens such as `show=wide`, `show=narrow,portrait`, `hide=narrow`, or `hide=portrait`. Use this for genuinely optional detail, not for primary content.

Minimal render:

```text
0F|st=mono|f=mono|d=compact
0Y|panel|bg=card|bd=fg/28|p=4|r=2
0V|Pulse|Now
1G|auto|min=180|max=3
2M|Latency|182ms|p95|s=panel
2H|line|4,7,6,10|trend
```

## LightStyle

LightStyle is part of the same lightcode stream. It is semantic tokens, not CSS.

- Use `0F|st=mono|f=mono|d=compact|r=2|fx=grid` for global frame direction.
- Style packs default to the user's system color scheme. Use `mode=light` or `mode=dark` only when the user asks for a fixed scheme or the content requires it.
- Every durable style pack must provide light and dark colors. Use palette-scoped frame keys such as `light-bg=0,0,98`, `light-fg=0,0,8`, `dark-bg=0,0,3`, and `dark-fg=0,0,94` when defining custom packs.
- Use `0Y|name|...` for reusable recipes inside a render.
- Use `s=name` on nodes to apply a recipe.
- Frequent keys stay short: `st` style pack, `f` font, `d` density, `r` radius, `p` padding, `g` gap, `bg`, `fg`, `bd`, `sh`, `caps`, `mono`.
- Built-in packs include `neutral`, `mono`, `studio`, `paper`, `gallery`, and `terminal`.
- Use `mono` for compact monochrome surfaces, `studio` for focused product interfaces with cyan/mint accents, `paper` for editorial/readable surfaces, `gallery` for media-forward layouts, and `terminal` for dense command/control views. All built-ins support light and dark mode.
- Save durable packs with `save_style`; read/patch them with `read_style` and `patch_style`; use `set_default_style` only when the user asks to make a style the default.
- Inline styles override saved packs for the current render only.
- LightStyle never targets raw selectors and never emits CSS.

Style example:

```text
0F|st=mono|f=mono|d=compact|r=2|fx=grid
0Y|panel|bg=card|bd=fg/28|p=4|r=2
0Y|cta|bg=fg|fg=bg|bd=fg|p=3|r=2|caps=1|mono=1
0V|Runtime|Session ready
1C|Source|Connected|s=panel
1N|Continue|s=cta
```

## Visual Defaults

Default to a compact, monochrome, instrument-panel feel unless the current prompt or remembered theme preference asks for a different palette. The stage should be useful at TV distance, dense enough for scanning, and calm enough for voice-first use.

- Design for unknown containers. LensUI output may render in phones, browser panes, iframes, fullscreen TVs, and odd aspect ratios. Let semantic LensUI containers reflow; do not solve this with fixed widths, viewport-specific CSS, hardcoded 16:9 assumptions, or desktop-only column assumptions.
- Use `G|auto` instead of fixed columns unless the relationship truly requires a fixed arrangement. Even fixed grids are treated as preferences and may collapse on narrow containers.
- Metrics, charts, media, timelines, comparisons, and steps before prose.
- Prefer charts over tables when values can be compared visually.
- In short: prefer charts over tables for visual comparison.
- Actual media matters: use sourced images/video when recognition or context matters.
- In short: actual media should carry context when available.
- Theme is for UI chrome, typography, panels, charts, and semantic renderer accents only. Never recolor, grayscale, tint, or filter source images, video, GIFs, animation, generative art, canvas/WebGL art, or embedded web content; keep those in their original full colors.
- `VV` or `X` for renderer-owned visual metaphors.
- Use `X` for renderer-owned shader/generative art and `VV` for semantic vector animation. These add motion without making the model emit canvas, SVG, WebGL, or animation code.
- `WV` for interactive web surfaces; use `play=1` only for explicit play/watch/open-video intents.
- Short labels, compact hierarchy, fewest pages possible.
- No website sections, decorative filler, title-slide compositions, generic card walls, or Pages/Keynote presentation layouts.
- Aim for an instrument panel, not a Pages/Keynote presentation.
- Do not make cookie-cutter dashboards. The output should feel purpose-built, rich, detailed, and specific to the user's request.
- Do not create status bars, loading indicators, or app chrome in lightcode.

## High-Value Built-Ins

Core layout:

- `0V|title|sub|align=center|justify=center|width=xl`
- `1G|auto|min=220|max=4|mh=140`
- `1S|gap=md`
- `1C|title|sub|body|tone=warning`

Data and visuals:

- `1M|label|value|detail|fmt=usd|tone=success`
- `1H|line|1,2,3|label|h=220`
- Live chart: `1H|line|$metrics.trend|live signal|h=220`
- `1VV|kind|label|data=1,2,3|h=260|count=18`; common kinds include `network`, `flow`, `orbit`, and `burst`.
- `1X|shader|label|h=300`; short shader example: `1X|shader`
- Use `1X` for canvas/WebGL/shader animation when motion helps explain or enrich the answer.
- `1P|72|session budget`

Media and web:

- `1J|src|alt|cap|h=220`
- `1W|src|poster|cap|h=300`
- `1U|label|cap|h=180|items=url^alt^cap^kind;...`
- `1MO|title|cap|h=180|items=url^alt^cap^kind;...`
- `1WV|url|title|h=520|full=1|play=1`
- YouTube shorthand: `1WV|yt|search query|full=1`; YouTube TV shorthand: `1WV|yttv|YouTube TV|full=1`.

Semantic surfaces:

- `1NL|title|summary|items=headline^source^time^summary^img;...`
- `1SC|title|cap|items=label^url^time^tone^note;...`
- `1TL|title|range|items=time^title^summary^tone^img;...`
- `1CP|title|summary|items=label^value^detail^tone^img;...`
- `1MM|title|summary|items=label^value^detail^source^conf;...`
- `1ST|title|summary|items=label^state^detail;...`
- `1Q|caption|cols=Name^Value|items=A^1;B^2`
- `1MD|markdown text`
- `1WX|loc|temp|condition|detail|hi=|lo=|wind=|hum=`

Supporting:

- `1R|text|level=2`
- `1T|text|muted=true|align=center`
- `1B|text|variant=secondary`
- `1A|title|desc|variant=destructive`
- `1Z`
- `1L|fallback|label`
- `1N|label|variant=secondary`
- `1Y|selected=0` with `2TB|Label` children

Compact rows use `^` between cells and `;` between rows. Prefer rows for lists, sources, timelines, comparisons, memory facts, status sequences, tables, media rails, and mosaics.

## Patterns

Status sequence:

```text
0F|0
0V|Pipeline|Recovery
1ST|Refresh|Continue rendering|items=Source^done^Snapshot loaded;Transform^active^Normalizing rows;Render^wait^Waiting for update
1N|Refresh
```

Comparison:

```text
0F|0
0V|Decision|Tradeoffs
1CP|Options|Compact comparison|items=LensUI^46 tokens^Semantic and patchable^success;HTML^520 tokens^DOM ceremony^warning
```

News with sources:

```text
0F|0
0V|Brief|Sourced
1NL|Latest|Three rows|items=Runtime opens^Platform^09:00^Source checks are live;Lightcode lands^Runtime^09:12^Depth tokens only
1SC|Sources|References|items=Docs^https://example.com^now^Protocol
```

Live source dashboard:

```text
0DS|metrics|https://example.com/lensui/metrics.json|ttl=1|mode=stream
0F|st=studio
0V|Live Runtime|Source-bound surface
1G|auto|min=180|max=3
2M|Latency|$metrics.latency|p95
2M|Tokens|$metrics.tokens|saved
2P|$metrics.progress|patch budget
1H|line|$metrics.trend|live signal|h=180
1X|shader|Generative field|h=220
1ST|Loop|$metrics.phase|items=$metrics.steps
```

Media storyboard:

```text
0F|0
0V|Visual Context|Storyboard
1MO|Frames|First item is emphasized|items=https://example.com/a.jpg^lead^Frame one;https://example.com/b.jpg^detail^Frame two
```

Patch:

```text
read_dsl(1,20)
patch(4,1,"2M|Queue|72%|ready|tone=success")
```

Saved component:

```text
save_component(name="KPI", kind="alias", source="1M|tone=success")
render("0F|0\n0V|Market\n1KPI|ETH|$4100|spot")
```

Use `kind=html` or `kind=react` for genuinely custom interactive or animated components that built-ins cannot express. Save it once, then instantiate it by name with short args/props. A persistent host can store saved components in localStorage, local files, or another adapter, so future turns can reuse the component without resending the full HTML/JS/CSS source.

JavaScript rule: JS belongs in saved components, not normal render payloads. For custom interaction, animation, D3, Three.js, canvas, or app-like widgets, call `save_component(kind="html"|"react")`, then render the saved name with short args/props. Small interactions should use renderer-owned built-ins or style tokens.

## Custom HTML/CSS/JS/Canvas

Use custom components when the user asks for interaction, custom animation, canvas/WebGL, complex DOM, or visuals the built-ins cannot express. Do not send raw HTML as a normal render. Register it once, then render a short component line.

What permissive hosts allow:

- `kind=html` component source is mounted as real HTML.
- `<style>` tags apply.
- `<script>` tags execute after mount. Canvas, RAF loops, WebGL, D3, Three.js, DOM events, and local component state can work.
- The component is saved in the runtime workspace. Later `/render` calls preserve registered components and can instantiate them by name.
- Templating is simple string replacement: `{{0}}`, `{{1}}` from args; `{{key}}` from props; `{{children}}` from nested LensUI children.

Command stream shape:

```text
!
@!|ComponentName|html|agent-generated
<div>raw HTML/CSS/JS template here</div>
.
R
0F|st=studio|d=compact
0V|Custom surface|Rendered from a saved component
1ComponentName|First arg|accent=cyan
.
```

Post that command stream to `/apply`, not `/render`.

HTML component rules:

- Keep component names alphanumeric with `_` or `-`.
- Avoid secrets, tokens, payment forms, destructive actions, and privileged host calls in component code.
- Prefer one self-contained root element. Scope classes/data attributes to the component name to avoid collisions.
- If a script uses `document.currentScript`, put that script inside the component root and use `document.currentScript.parentElement`.
- If a component fails, simplify to static HTML first, then add script/canvas back.
- Use the runtime container contract, not `document.body`, for sizing.

Container sizing facts:

- `#lens-stage-root` is the actual render container.
- `#lens-stage-frame` is the centered content column inside it.
- `data-lens-sizing="stage"` means fixed-height stage; overflow scrolls when needed.
- `data-lens-sizing="auto"` or `content` means the host can grow around rendered content.
- The runtime writes `--lens-container-width` and `--lens-container-height` plus `data-lens-container-width`, `data-lens-container-height`, `data-lens-size`, `data-lens-aspect`, and `data-lens-flow` on `#lens-stage-root`.
- Built-in media, charts, `X`, and `VV` intentionally cap their height to a fraction of the container. If the user wants a full-container custom visual, use a saved HTML/canvas component.

Full-container custom canvas recipe:

```text
!
@!|FullCanvas|html|agent-generated
<div class="lens-full-canvas"><canvas></canvas><strong>{{0}}</strong><script>
(() => {
  const root = document.currentScript.parentElement;
  const stage = root.closest("#lens-stage-root");
  const c = root.querySelector("canvas");
  const ctx = c.getContext("2d");
  let t = 0;
  function fit(){
    const box = root.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, Math.floor(box.width * dpr));
    c.height = Math.max(1, Math.floor(box.height * dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function draw(){
    fit(); t += 0.02;
    const w = c.width / (window.devicePixelRatio || 1), h = c.height / (window.devicePixelRatio || 1);
    ctx.fillStyle = "#050607"; ctx.fillRect(0,0,w,h);
    for (let y=0;y<h;y+=10) for (let x=0;x<w;x+=10) {
      const v = Math.sin(x*.018+t)+Math.cos(y*.024-t);
      ctx.fillStyle = `hsl(${190+v*55} 90% ${44+v*8}%)`;
      ctx.fillRect(x,y,8,8);
    }
    requestAnimationFrame(draw);
  }
  new ResizeObserver(fit).observe(stage || root);
  draw();
})();
</script></div>
<style>
#lens-stage-root:has(.lens-full-canvas){padding:0}
#lens-stage-frame:has(.lens-full-canvas){max-width:none;min-height:var(--lens-container-height,100%);gap:0;justify-content:stretch}
.lens-full-canvas{position:relative;width:var(--lens-container-width,100%);height:var(--lens-container-height,100%);min-height:320px;overflow:hidden;background:#050607}
.lens-full-canvas canvas{display:block;width:100%;height:100%;image-rendering:pixelated}
.lens-full-canvas strong{position:absolute;left:18px;bottom:14px;font:700 13px var(--lens-font-mono);text-transform:uppercase;color:white}
</style>
.
R
0F|st=studio|d=compact
0V
1FullCanvas|full-container canvas
.
```

Use this full-container pattern only when the visual should own the stage. For ordinary panels, keep the component inside normal LensUI layout.

Live source update over the bridge:

```text
!
S|market|application/json
{"btc":"$78,100","btcMove":"+0.3%","btcTone":"success"}
.
```

Canvas component example:

```text
!
@!|PixelField|html|agent-generated
<div class="px-field"><canvas></canvas><strong>{{0}}</strong><script>
(() => {
  const root = document.currentScript.parentElement;
  const c = root.querySelector("canvas");
  const ctx = c.getContext("2d");
  let t = 0;
  function fit(){ c.width = Math.max(1, root.clientWidth / 4); c.height = Math.max(1, root.clientHeight / 4); }
  function draw(){
    fit(); t += 0.03;
    const img = ctx.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const p = i / 4, x = p % c.width, y = (p / c.width) | 0;
      const v = Math.sin(x * .15 + t) + Math.cos(y * .12 - t);
      img.data[i] = 80 + v * 60; img.data[i + 1] = 180 + v * 35; img.data[i + 2] = 220; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); requestAnimationFrame(draw);
  }
  draw();
})();
</script></div>
<style>
.px-field{position:relative;min-height:260px;border:1px solid hsl(var(--border));background:#050607;overflow:hidden}
.px-field canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
.px-field strong{position:absolute;left:18px;bottom:14px;font:700 13px var(--lens-font-mono);text-transform:uppercase;color:white}
</style>
.
R
0F|st=studio|d=compact
0V|Canvas field|Agent-authored component
1PixelField|live pixel noise
.
```

Safety stance: raw HTML/CSS/JS components are a power feature and may be enabled by default in permissive hosts. Do not put secrets, auth tokens, billing logic, credential collection, destructive effects, or privileged host calls inside component code. If an action needs external side effects, route it through host-owned tools or APIs that can validate, gate, and confirm it. Assume host policy may reject or sandbox raw components; if that happens, fall back to semantic built-ins or ask the host to promote a reviewed component.

Saved style:

```text
save_style(name="mono-compact", source="0F|f=mono|d=compact|r=2|fx=grid\n0Y|panel|bg=card|bd=fg/28|p=4|r=2\n0Y|cta|bg=fg|fg=bg|p=3|caps=1|mono=1")
render("0F|st=mono-compact\n0V|Runtime\n1N|Continue|s=cta")
```

## Repair Rules

- If the renderer says a line lacks a depth token, add one to every line.
- If depth jumps more than one level, lower the offending depth or add the missing parent.
- If a component is unknown, replace it with a built-in or define an alias at depth `0`.
- If a binding references an unknown data source, add a `0DS` line or replace the binding with literal text.
- If layout overflows, read `layout` when available, then use semantic adaptive containers (`1G|auto`, compact rows, built-in media/chart heights). Fixed stage hosts can scroll on overflow and auto-sized embed hosts can grow, but the lightcode should still avoid avoidable width overflow.
- If media is unavailable, use `media_search` or render a semantic `VV`/`X` alternative.
