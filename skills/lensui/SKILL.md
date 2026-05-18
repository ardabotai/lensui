---
name: lensui
description: Generate, revise, validate, and repair LensUI lightcode for agent-rendered visual interfaces. Use when an agent needs to render UI with LensUI, patch an existing LensUI stage, choose compact semantic components, or decide when to save custom HTML/JS/React components instead of emitting verbose markup.
---

# LensUI Agent Skill

LensUI is a token-efficient UI runtime for agents. Generate semantic lightcode plus compact LightStyle tokens, not HTML, JSX, CSS, Tailwind, D3, Three.js, or SVG in normal render payloads. The renderer owns DOM structure, default styling, layout fitting, charts, media mounting, live bindings, and host adapters.

## Core Workflow

1. For a new topic or major layout change, call `render(dsl)` with a full lightcode document.
2. For a small revision, call `read_dsl(offset?, limit?)`, then `patch(offset, delete, dsl)`.
   Use `patch` for small edits after reading the current lightcode.
3. Put `0F|0` first unless preserving an existing frame line. Every render should carry its visual frame as lightcode.
4. Prefix every lightcode line with a base36 depth token. Do not indent.
5. Prefer short semantic built-ins, compact `items=` rows, and compact `0Y` style recipes.
6. Use saved style packs for durable art direction. Use saved components only when built-ins cannot express the UI compactly.
7. For live values, render stable bindings once, then update source snapshots. Do not resend the whole stage just to tick a value or chart.
8. Treat LensUI as screen-size and aspect-ratio agnostic. Use semantic adaptive containers and never depend on a specific phone, laptop, or TV viewport.
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

Use `kind=html` only for genuinely custom interactive or animated components that built-ins cannot express. Save it once, then instantiate it by name with short args/props.

JavaScript rule: JS belongs in saved components, not normal render payloads. For custom interaction, animation, D3, Three.js, canvas, or app-like widgets, call `save_component(kind="html"|"react")`, then render the saved name with short args/props. Small interactions should use renderer-owned built-ins or style tokens.

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
- If layout overflows, first use semantic adaptive containers (`1G|auto`, compact rows, built-in media/chart heights). Fixed stage hosts can scroll on overflow and auto-sized embed hosts can grow, but the lightcode should still avoid avoidable width overflow.
- If media is unavailable, use `media_search` or render a semantic `VV`/`X` alternative.
