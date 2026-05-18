import {
  LensApplyResult,
  LensBinding,
  LensComponentDefinition,
  LensNode,
  LensNodeComponent,
  LensRenderMetadata,
  LensRenderResult,
  LightStylePackDefinition,
  LightStyleSheet,
  LensTheme,
  LensUIError,
  LensUIWorkspace,
  bindingReference,
  collectBindings,
  defaultTheme,
  emptyMetadata,
  parseLightcode,
  resolveBinding,
  resolvePath
} from "@lensui/core";

export interface LensStageRuntime {
  render(lightcode: string, components?: LensComponentDefinition[], styles?: LightStylePackDefinition[], defaultStyle?: string): LensApplyResult;
  apply(commandStream: string): LensApplyResult;
  patch(offset: number, deleteCount: number, lightcode: string): LensApplyResult;
  registerComponent(definition: LensComponentDefinition): LensApplyResult;
  patchComponent(name: string, offset: number, deleteCount: number, source: string): LensApplyResult;
  deleteComponent(name: string): LensApplyResult;
  registerStyle(definition: LightStylePackDefinition): LensApplyResult;
  patchStyle(name: string, offset: number, deleteCount: number, source: string): LensApplyResult;
  deleteStyle(name: string): LensApplyResult;
  setDefaultStyle(name?: string): LensApplyResult;
  setSource(id: string, payload: unknown): boolean;
  read(kind: "lightcode" | "components" | "styles" | "metadata" | "status"): unknown;
  validate(lightcode: string, components?: LensComponentDefinition[], styles?: LightStylePackDefinition[], defaultStyle?: string): LensApplyResult;
}

export class LensHTMLRenderer {
  private sources: Record<string, unknown> = Object.create(null);
  private styles: LightStyleSheet = { theme: defaultTheme(), recipes: {} };
  private vectorID = 0;
  private sceneID = 0;

  render(lightcode: string, components: LensComponentDefinition[] = [], styles: LightStylePackDefinition[] = [], defaultStyle?: string): LensRenderResult {
    const parsed = parseLightcode(lightcode, components, styles, defaultStyle);
    this.styles = parsed.styles;
    const children = parsed.root.children.filter((node) => node.component !== "root");
    const metadata: LensRenderMetadata = {
      dataSources: parsed.dataSources,
      bindings: collectBindings(parsed.root, parsed.dataSources)
    };
    const html = children.length === 0
      ? this.renderDefaultView()
      : children.length === 1 && children[0].component === "view"
        ? this.renderNode(children[0])
        : this.renderView(undefined, undefined, {}, this.renderNodes(children));
    return { html, metadata, theme: parsed.theme };
  }

  setSource(id: string, payload: unknown): boolean {
    this.sources[id] = normalizePayload(payload);
    return true;
  }

  private renderDefaultView(): string {
    return this.renderView("Ready", "Agent-rendered interface", { align: "center", justify: "center", width: "lg" }, [
      this.renderScene({ component: "scene", key: "ready", args: ["shader", "ready"], props: { height: "260" }, children: [] }),
      `<div class="mx-auto grid w-full max-w-xl gap-2" data-lens-adaptive-grid data-min-cell-width="150" data-max-cols="3">
        <span class="rounded-md border border-border/80 bg-secondary/50 px-3 py-2 text-center text-xs font-medium text-muted-foreground">Semantic lightcode</span>
        <span class="rounded-md border border-border/80 bg-secondary/50 px-3 py-2 text-center text-xs font-medium text-muted-foreground">Live sources</span>
        <span class="rounded-md border border-border/80 bg-secondary/50 px-3 py-2 text-center text-xs font-medium text-muted-foreground">Patchable UI</span>
      </div>`,
      `<p class="text-center text-sm text-muted-foreground">Render compact visual answers through the host application.</p>`
    ].join("\n"));
  }

  private renderNode(node: LensNode): string {
    switch (node.component) {
      case "view": return this.renderView(arg(node, 0), arg(node, 1), node.props, this.renderChildren(node));
      case "stack": return `<div class="flex min-w-0 flex-col ${gapClass(node.props.gap)}" ${this.attrs(node, "stack")}>${this.renderChildren(node)}</div>`;
      case "grid": return this.renderGrid(node);
      case "card": return this.renderCard(node);
      case "heading": return this.renderHeading(node);
      case "text": return this.renderText(node);
      case "badge": return this.renderBadge(node);
      case "alert": return this.renderAlert(node);
      case "progress": return this.renderProgress(node);
      case "table": return this.renderTable(node);
      case "tableHead": return this.renderTableHead(node);
      case "tableRow": return this.renderTableRow(node);
      case "empty": return `<div class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">${boundText(this.sources, arg(node, 0), "No data")}</div>`;
      case "separator": return `<div class="h-px w-full bg-border/80" ${this.attrs(node, "separator")}></div>`;
      case "avatar": return this.renderAvatar(node);
      case "image": return this.renderImage(node);
      case "video": return this.renderVideo(node);
      case "mediaStrip": return this.renderMediaStrip(node);
      case "webview": return this.renderWebView(node);
      case "vector": return this.renderVector(node);
      case "button": return `<button type="button" disabled class="inline-flex h-9 max-w-full items-center justify-center truncate rounded-md border border-foreground/80 bg-foreground px-4 py-2 font-mono text-xs font-semibold uppercase text-background shadow-[4px_4px_0_rgb(255_255_255_/_0.16)] opacity-95" ${this.attrs(node, "button")}>${esc(arg(node, 0) ?? "")}</button>`;
      case "tabs": return this.renderTabs(node);
      case "deck": return this.renderDeck(node);
      case "page": return this.renderCard(node);
      case "metric": return this.renderMetric(node);
      case "chart": return this.renderChart(node);
      case "scene": return this.renderScene(node);
      case "markdown": return `<div class="prose max-w-none text-sm text-foreground">${renderMarkdown(boundText(this.sources, arg(node, 0), ""))}</div>`;
      case "weather": return this.renderWeather(node);
      case "newsList": return this.renderNewsList(node);
      case "newsDetail": return this.renderNewsDetail(node);
      case "sourceStrip": return this.renderSourceStrip(node);
      case "sourceRef": return this.renderSourceRef(node);
      case "timeline": return this.renderTimeline(node);
      case "event": return this.renderEvent(node);
      case "comparison": return this.renderComparison(node);
      case "comparisonItem": return this.renderComparisonItem(node);
      case "memoryProfile": return this.renderMemoryProfile(node);
      case "memoryFact": return this.renderMemoryFact(node);
      case "steps": return this.renderSteps(node);
      case "step": return this.renderStep(node);
      case "mosaic": return this.renderMosaic(node);
      case "customHTML": return renderTemplate(node.htmlTemplate ?? "", node, this.sources, this.renderChildren(node));
      case "react": return `<div class="lens-panel rounded-lg border p-4 text-sm text-muted-foreground">React component ${esc(node.reactExport ?? "default")} registered.</div>`;
      case "swiftui": return `<div class="lens-panel rounded-lg border p-4 text-sm text-muted-foreground">Native adapter ${esc(arg(node, 0) ?? node.key)} registered.</div>`;
      default: return "";
    }
  }

  private renderChildren(node: LensNode): string {
    return this.renderNodes(node.children);
  }

  private renderNodes(nodes: LensNode[]): string {
    return nodes.map((node) => this.renderNode(node)).join("\n");
  }

  private attrs(node: LensNode, component: string): string {
    return `${runtimeAttrs(node, component)}${styleAttrs(node, this.styles)}`;
  }

  private renderView(title?: string, description?: string, props: Record<string, string> = {}, children = ""): string {
    const width = widthClass(props.width);
    const align = textAlignClass(props.align);
    const justify = justifyClass(props.justify);
    const header = title || description ? `
      <header class="flex min-w-0 flex-col gap-2 ${align}">
        ${title ? `<h1 class="lens-display text-3xl font-semibold leading-tight sm:text-5xl">${boundText(this.sources, title)}</h1>` : ""}
        ${description ? `<p class="text-sm text-muted-foreground sm:text-base">${boundText(this.sources, description)}</p>` : ""}
      </header>` : "";
    return `<main id="lens-stage-root" class="lens-stage-root bg-background text-foreground">
      <div id="lens-stage-frame" class="lens-stage-frame mx-auto flex min-h-full w-full ${width} flex-col ${justify} gap-5">
        ${header}
        ${children}
      </div>
    </main>`;
  }

  private renderGrid(node: LensNode): string {
    if ((node.props.cols ?? arg(node, 0) ?? "").toLowerCase() === "auto") {
      return `<div class="grid min-w-0 gap-4" data-lens-adaptive-grid data-grid-mode="auto" data-min-cell-width="${esc(node.props.min ?? "220")}" data-max-cols="${esc(node.props.max ?? "4")}" data-min-cell-height="${esc(node.props.mh ?? "140")}" ${this.attrs(node, "grid")}>${this.renderChildren(node)}</div>`;
    }
    const cols = Math.max(1, Math.min(6, Number.parseInt(node.props.cols ?? "2", 10) || 2));
    return `<div class="grid min-w-0 gap-4" data-lens-adaptive-grid data-grid-mode="fixed" data-min-cell-width="${esc(node.props.min ?? "180")}" data-max-cols="${cols}" ${this.attrs(node, "grid")}>${this.renderChildren(node)}</div>`;
  }

  private renderCard(node: LensNode): string {
    const title = arg(node, 0);
    const description = arg(node, 1);
    const body = arg(node, 2);
    const children = this.renderChildren(node);
    return `<section class="lens-panel min-w-0 overflow-hidden rounded-lg border p-5 text-card-foreground" ${this.attrs(node, "card")}>
      ${title || description ? `<header class="mb-4 flex min-w-0 flex-col gap-1">${title ? `<h2 class="lens-display text-lg font-semibold">${boundText(this.sources, title)}</h2>` : ""}${description ? `<p class="text-sm text-muted-foreground">${boundText(this.sources, description)}</p>` : ""}</header>` : ""}
      <div class="min-w-0">${children || (body ? `<p class="text-sm leading-6 text-foreground/82">${boundText(this.sources, body)}</p>` : "")}</div>
    </section>`;
  }

  private renderHeading(node: LensNode): string {
    const level = Math.max(1, Math.min(4, Number.parseInt(node.props.level ?? "2", 10) || 2));
    const tag = `h${level}`;
    const cls = level === 1 ? "text-4xl" : level === 2 ? "text-2xl" : "text-lg";
    return `<${tag} class="lens-display ${cls} font-semibold leading-tight" ${this.attrs(node, "heading")}>${boundText(this.sources, arg(node, 0), "")}</${tag}>`;
  }

  private renderText(node: LensNode): string {
    const muted = truthy(node.props.muted) ? "text-muted-foreground" : "text-foreground/90";
    return `<p class="${textAlignClass(node.props.align)} text-sm ${muted}" ${this.attrs(node, "text")}>${boundText(this.sources, arg(node, 0), "")}</p>`;
  }

  private renderBadge(node: LensNode): string {
    const tone = toneClass(node.props.tone ?? node.props.variant);
    return `<span class="inline-flex w-fit items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${tone}" ${this.attrs(node, "badge")}>${boundText(this.sources, arg(node, 0), "")}</span>`;
  }

  private renderAlert(node: LensNode): string {
    const tone = node.props.tone ?? node.props.variant ?? "warning";
    const title = arg(node, 0);
    const description = arg(node, 1);
    return `<div class="rounded-lg border p-4 text-sm ${tonePanelClass(tone)}" ${this.attrs(node, "alert")}><div class="font-mono text-xs font-semibold uppercase">${boundText(this.sources, title, "Notice")}</div>${description ? `<p class="mt-1 text-muted-foreground">${boundText(this.sources, description)}</p>` : ""}</div>`;
  }

  private renderProgress(node: LensNode): string {
    const value = Math.max(0, Math.min(100, Number(arg(node, 0) ?? node.props.value ?? 0) || 0));
    const label = arg(node, 1) ?? node.props.label;
    return `<div class="grid gap-2" ${this.attrs(node, "progress")}>${label ? `<div class="flex items-center justify-between font-mono text-[11px] uppercase text-muted-foreground"><span>${boundText(this.sources, label)}</span><span>${value}%</span></div>` : ""}<div class="h-2 overflow-hidden rounded-sm bg-muted"><div class="h-full bg-primary" style="width:${value}%"></div></div></div>`;
  }

  private renderTable(node: LensNode): string {
    const cols = compactRow(node.props.cols ?? arg(node, 1));
    const rows = compactRows(resolveBinding(node.props.items, this.sources, node.props.items ?? ""));
    const generatedHead = cols.length ? `<thead class="bg-muted/70"><tr>${cols.map((cell) => `<th class="px-3 py-2 font-mono text-[11px] font-semibold uppercase text-muted-foreground">${esc(cell)}</th>`).join("")}</tr></thead>` : "";
    const generatedRows = rows.map((row) => `<tr class="border-t border-border/80">${row.map((cell) => `<td class="px-3 py-2">${esc(cell)}</td>`).join("")}</tr>`).join("");
    const caption = arg(node, 0);
    return `<div class="overflow-hidden rounded-lg border" ${this.attrs(node, "table")}>${caption ? `<div class="border-b border-border/80 px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">${boundText(this.sources, caption)}</div>` : ""}<table class="w-full text-left text-sm">${this.renderChildren(node) || `${generatedHead}<tbody>${generatedRows}</tbody>`}</table></div>`;
  }

  private renderTableHead(node: LensNode): string {
    return `<thead class="bg-muted/70"><tr>${node.args.map((cell) => `<th class="px-3 py-2 font-mono text-[11px] font-semibold uppercase text-muted-foreground">${esc(cell)}</th>`).join("")}</tr></thead>`;
  }

  private renderTableRow(node: LensNode): string {
    return `<tr class="border-t border-border/80">${node.args.map((cell) => `<td class="px-3 py-2">${boundText(this.sources, cell)}</td>`).join("")}</tr>`;
  }

  private renderAvatar(node: LensNode): string {
    const label = arg(node, 0) ?? "?";
    return `<div class="flex h-10 w-10 items-center justify-center rounded-md border border-foreground/80 bg-foreground font-mono text-sm font-semibold text-primary-foreground" ${this.attrs(node, "avatar")}>${esc(label.slice(0, 2).toUpperCase())}</div>`;
  }

  private renderImage(node: LensNode): string {
    const src = resolvedURL(this.sources, arg(node, 0) ?? node.props.src);
    const alt = arg(node, 1) ?? "";
    const caption = arg(node, 2);
    const height = numberProp(node, "h", 220);
    if (!src) return `<div class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">image unavailable</div>`;
    return `<figure class="overflow-hidden rounded-lg border bg-secondary/30" ${this.attrs(node, "image")}><img src="${esc(src)}" alt="${esc(alt)}" class="block w-full object-cover" style="${adaptiveHeightStyle(height, 0.32, 120)}" loading="lazy">${caption ? `<figcaption class="border-t border-border/70 px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">${boundText(this.sources, caption)}</figcaption>` : ""}</figure>`;
  }

  private renderVideo(node: LensNode): string {
    const src = resolvedURL(this.sources, arg(node, 0) ?? node.props.src);
    if (!src) return `<div class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">video unavailable</div>`;
    const poster = resolvedURL(this.sources, arg(node, 1));
    const caption = arg(node, 2);
    const height = numberProp(node, "h", 260);
    return `<figure class="overflow-hidden rounded-lg border bg-secondary/40" ${this.attrs(node, "video")}><video src="${esc(src)}" ${poster ? `poster="${esc(poster)}"` : ""} class="block w-full object-cover" style="${adaptiveHeightStyle(height, 0.34, 130)}" playsinline controls></video>${caption ? `<figcaption class="border-t border-border/70 px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">${boundText(this.sources, caption)}</figcaption>` : ""}</figure>`;
  }

  private renderMediaStrip(node: LensNode): string {
    const title = arg(node, 0);
    const caption = arg(node, 1);
    const height = numberProp(node, "h", 170);
    const rows = compactRows(resolveBinding(node.props.items, this.sources, node.props.items ?? ""));
    const generated = rows.map((row) => this.renderCompactMedia(row, height)).join("");
    const cells = node.children.length ? node.children.map((child) => `<div class="min-w-0 flex-1" style="min-width:min(220px, 100%)">${child.component === "video" ? this.renderVideo(child) : this.renderImage(child)}</div>`).join("") : generated;
    return `<section class="lens-panel rounded-lg border p-4" data-lens-media-strip ${this.attrs(node, "mediaStrip")}>${title ? `<h2 class="lens-display text-lg font-semibold">${boundText(this.sources, title)}</h2>` : ""}${caption ? `<p class="mb-3 text-sm text-muted-foreground">${boundText(this.sources, caption)}</p>` : ""}<div class="flex flex-wrap gap-3 overflow-hidden" style="min-height:min(${height}px, calc(var(--lens-container-height, ${height * 3}px) * 0.28))">${cells}</div></section>`;
  }

  private renderWebView(node: LensNode): string {
    const id = node.props.id ?? node.key;
    const raw = arg(node, 0) ?? node.props.url ?? "";
    const url = webViewURL(raw, node.props);
    const title = arg(node, 1) ?? node.props.title ?? "Web";
    const height = truthy(node.props.full) ? "max(220px, calc(var(--lens-container-height, 720px) - 80px))" : `clamp(180px, calc(var(--lens-container-height, 720px) * 0.54), ${numberProp(node, "h", 420)}px)`;
    return `<section id="lens_webview_${esc(id)}" class="lens-panel relative overflow-hidden rounded-lg border" style="height:${height}" data-lens-webview-url="${esc(url)}" data-lens-webview-title="${esc(title)}" data-lens-webview-play="${truthy(node.props.play) ? "1" : "0"}" ${this.attrs(node, "webview")}><div class="absolute inset-0 grid place-items-center text-center" style="background-image:linear-gradient(90deg,rgb(255 255 255 / 0.035) 1px,transparent 1px),linear-gradient(0deg,rgb(255 255 255 / 0.032) 1px,transparent 1px);background-size:24px 24px"><div><div class="font-mono text-xs uppercase text-muted-foreground">interactive web view</div><div class="mt-2 lens-display text-2xl font-semibold">${esc(title)}</div></div></div></section>`;
  }

  private renderVector(node: LensNode): string {
    const id = ++this.vectorID;
    const label = arg(node, 1) ?? arg(node, 0) ?? "Vector";
    const height = numberProp(node, "h", 220);
    return `<svg class="w-full rounded-lg border bg-secondary/20" style="${adaptiveHeightStyle(height, 0.3, 120)}" viewBox="0 0 640 240" preserveAspectRatio="none" role="img" aria-label="${esc(label)}" data-vector-kind="${esc(arg(node, 0) ?? "flow")}" ${this.attrs(node, "vector")}>
      <defs><pattern id="lens_vec_grid_${id}" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="hsl(var(--border))" stroke-width="1" opacity=".55"/></pattern></defs>
      <rect width="640" height="240" fill="url(#lens_vec_grid_${id})"/>
      <path d="M36 166 C 142 44, 246 204, 360 86 S 532 142, 604 52" fill="none" stroke="hsl(var(--foreground))" stroke-width="4" stroke-linecap="square"/>
      ${Array.from({ length: 10 }, (_, i) => `<rect x="${48 + i * 58}" y="${82 + Math.round(Math.sin(i) * 42)}" width="${8 + (i % 3) * 4}" height="${8 + (i % 3) * 4}" fill="hsl(var(--foreground))" opacity="${0.92 - i * 0.045}"/>`).join("")}
    </svg>`;
  }

  private renderTabs(node: LensNode): string {
    const selected = Math.max(0, Math.min(node.children.length - 1, Number(node.props.selected ?? arg(node, 0) ?? 0) || 0));
    return `<div class="flex flex-col gap-3" ${this.attrs(node, "tabs")}><div role="tablist" class="flex max-w-full flex-wrap gap-1 rounded-md border border-border bg-muted p-1 font-mono text-xs uppercase">${node.children.map((tab, index) => `<span class="rounded-sm px-3 py-1 ${index === selected ? "bg-foreground text-background" : "text-muted-foreground"}">${esc(arg(tab, 0) ?? "Tab")}</span>`).join("")}</div>${node.children[selected] ? this.renderChildren(node.children[selected]) : ""}</div>`;
  }

  private renderDeck(node: LensNode): string {
    const pages = node.children.filter((child) => child.component === "page");
    return `<section data-lens-deck data-lens-page="0" class="relative min-w-0" ${this.attrs(node, "deck")}>${pages.map((page, index) => `<div data-lens-deck-page="${index}" class="${index === 0 ? "" : "hidden"}">${this.renderCard(page)}</div>`).join("")}<button data-lens-prev class="absolute left-2 top-1/2 -translate-y-1/2 rounded-md border bg-background/90 px-3 py-2 font-mono text-xs">PREV</button><button data-lens-next class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border bg-background/90 px-3 py-2 font-mono text-xs">NEXT</button></section>`;
  }

  private renderMetric(node: LensNode): string {
    const tone = toneTextClass(node.props.tone);
    return `<div class="lens-panel rounded-lg border p-4" ${this.attrs(node, "metric")}><div class="font-mono text-[11px] font-semibold uppercase text-muted-foreground">${boundText(this.sources, arg(node, 0), "")}</div><div class="mt-1 lens-display text-2xl font-semibold sm:text-3xl ${tone}" ${bindAttr(arg(node, 1), "text")}>${boundText(this.sources, arg(node, 1), "—")}</div>${arg(node, 2) ? `<div class="mt-1 text-xs text-muted-foreground">${boundText(this.sources, arg(node, 2))}</div>` : ""}</div>`;
  }

  private renderChart(node: LensNode): string {
    const kind = (arg(node, 0) ?? node.props.kind ?? "line").toLowerCase();
    const dataValue = arg(node, 1) ?? node.props.data ?? "";
    const data = chartData(resolveBinding(dataValue, this.sources, dataValue));
    const height = numberProp(node, "height", numberProp(node, "h", 220));
    const max = Math.max(1, ...data);
    const scaled = data.map((value) => Math.max(4, (value / max) * 168));
    const bars = scaled.map((value, index) => `<rect x="${34 + index * (560 / Math.max(1, scaled.length))}" y="${204 - value}" width="${Math.max(8, 440 / Math.max(1, scaled.length))}" height="${value}" rx="2" fill="hsl(var(--foreground))" opacity="${0.42 + (index / Math.max(1, scaled.length)) * 0.45}"/>`).join("");
    const points = scaled.map((value, index) => `${34 + index * (560 / Math.max(1, scaled.length - 1))},${204 - value}`).join(" ");
    const mark = kind === "bar" ? bars : `<polyline points="${points}" fill="none" stroke="hsl(var(--foreground))" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"/>`;
    return `<svg class="w-full rounded-lg border bg-secondary/20" style="${adaptiveHeightStyle(height, 0.32, 120)}" viewBox="0 0 640 240" preserveAspectRatio="none" aria-label="chart" data-lens-role="chartData" ${bindAttr(dataValue, "chartData")} ${this.attrs(node, "chart")}><path d="M32 36V204H612" fill="none" stroke="hsl(var(--border))" stroke-width="1"/>${mark}</svg>`;
  }

  private renderScene(node: LensNode): string {
    const id = `lens_scene_${++this.sceneID}`;
    const kind = arg(node, 0) ?? "shader";
    const label = arg(node, 1) ?? kind;
    const height = numberProp(node, "height", numberProp(node, "h", 260));
    return `<canvas id="${id}" class="block w-full rounded-lg border bg-secondary/20" style="${adaptiveHeightStyle(height, 0.34, 140)}" data-lens-scene data-scene-kind="${esc(kind)}" data-scene-mood="${esc(label)}" ${this.attrs(node, "scene")}></canvas>`;
  }

  private renderWeather(node: LensNode): string {
    const meta = [
      ["HI", node.props.hi],
      ["LO", node.props.lo],
      ["WIND", node.props.wind],
      ["HUM", node.props.hum]
    ].filter(([, value]) => value);
    return `<section class="lens-panel rounded-lg border p-5" ${this.attrs(node, "weather")}><div class="font-mono text-[11px] font-semibold uppercase text-muted-foreground">${boundText(this.sources, arg(node, 0) ?? "Weather")}</div><div class="lens-display mt-1 text-5xl font-semibold">${boundText(this.sources, arg(node, 1), "—")}</div><p class="mt-2 text-sm text-muted-foreground">${boundText(this.sources, arg(node, 2), "")}</p>${meta.length ? `<div class="mt-4 grid gap-2" data-lens-adaptive-grid data-min-cell-width="120" data-max-cols="2">${meta.map(([label, value]) => `<div class="rounded-md border border-border/80 p-2"><div class="font-mono text-[10px] text-muted-foreground">${label}</div><div class="text-sm">${boundText(this.sources, value)}</div></div>`).join("")}</div>` : ""}</section>`;
  }

  private renderNewsList(node: LensNode): string {
    const title = arg(node, 0) ?? "Latest";
    const summary = arg(node, 1);
    const itemValue = arg(node, 2) ?? node.props.items;
    const itemFallback = bindingReference(itemValue) ? "" : itemValue ?? "";
    const items = compactRows(resolveBinding(itemValue, this.sources, itemFallback));
    const rows = node.children.length ? node.children.map((child) => this.renderNewsDetail(child, true)).join("") : items.map((item) => this.renderNewsRow(item)).join("");
    return `<section class="lens-panel rounded-lg border p-5" data-lens-repeat="news" ${this.attrs(node, "newsList")}><h2 class="lens-display text-xl font-semibold">${boundText(this.sources, title)}</h2>${summary ? `<p class="mt-1 text-sm text-muted-foreground">${boundText(this.sources, summary)}</p>` : ""}<div class="mt-3 grid gap-3">${rows || `<p class="text-sm text-muted-foreground">No stories yet</p>`}</div></section>`;
  }

  private renderNewsDetail(node: LensNode, compact = false): string {
    const image = resolvedURL(this.sources, node.props.img ?? node.props.image ?? arg(node, 4));
    const source = arg(node, 1);
    const summary = arg(node, 2);
    const time = arg(node, 3);
    return `<article class="overflow-hidden rounded-lg border ${compact ? "p-3" : "lens-panel p-5"}" ${this.attrs(node, "newsDetail")}>${image ? `<img src="${esc(image)}" class="mb-3 h-36 w-full rounded-md object-cover">` : ""}<div class="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">${source ? `<span>${boundText(this.sources, source)}</span>` : ""}${time ? `<span>${boundText(this.sources, time)}</span>` : ""}</div><h3 class="lens-display mt-1 text-lg font-semibold">${boundText(this.sources, arg(node, 0), "Story")}</h3>${summary ? `<p class="mt-1 text-sm text-muted-foreground">${boundText(this.sources, summary)}</p>` : ""}</article>`;
  }

  private renderSourceStrip(node: LensNode): string {
    const title = arg(node, 0);
    const caption = arg(node, 1);
    const rows = compactRows(resolveBinding(node.props.items ?? arg(node, 2), this.sources, node.props.items ?? arg(node, 2) ?? ""));
    const sources = node.children.length ? node.children.map((child) => this.renderSourceRef(child)).join("") : rows.map((row) => this.renderSourceRow(row)).join("");
    return `<section class="${title || caption ? "lens-panel rounded-lg border p-4" : ""}" data-lens-repeat="sources" ${this.attrs(node, "sourceStrip")}>${title ? `<h2 class="lens-display text-lg font-semibold">${boundText(this.sources, title)}</h2>` : ""}${caption ? `<p class="mt-1 text-sm text-muted-foreground">${boundText(this.sources, caption)}</p>` : ""}<div class="${title || caption ? "mt-3 " : ""}flex flex-wrap gap-2">${sources}</div></section>`;
  }

  private renderSourceRef(node: LensNode): string {
    const title = arg(node, 0) ?? "Source";
    const url = arg(node, 1) ?? "#";
    const time = arg(node, 2);
    const note = node.props.note ?? arg(node, 3);
    return `<a class="rounded-md border px-3 py-2 text-xs text-muted-foreground hover:text-foreground" href="${esc(url)}"><span class="font-mono uppercase">${boundText(this.sources, title)}</span>${time ? `<span class="ml-2 opacity-70">${boundText(this.sources, time)}</span>` : ""}${note ? `<span class="ml-2">${boundText(this.sources, note)}</span>` : ""}</a>`;
  }

  private renderTimeline(node: LensNode): string {
    const title = arg(node, 0) ?? "Timeline";
    const range = arg(node, 1);
    const rows = compactRows(resolveBinding(node.props.items ?? arg(node, 2), this.sources, node.props.items ?? arg(node, 2) ?? ""));
    const events = node.children.length ? node.children.map((child) => this.renderEvent(child)).join("") : rows.map((row) => this.renderEventRow(row)).join("");
    return `<section class="lens-panel rounded-lg border p-5" data-lens-repeat="timeline" ${this.attrs(node, "timeline")}><div class="flex items-baseline justify-between gap-3"><h2 class="lens-display text-xl font-semibold">${boundText(this.sources, title)}</h2>${range ? `<span class="font-mono text-[11px] uppercase text-muted-foreground">${boundText(this.sources, range)}</span>` : ""}</div><div class="mt-4 space-y-3">${events}</div></section>`;
  }

  private renderEvent(node: LensNode): string {
    const image = resolvedURL(this.sources, node.props.img ?? node.props.image ?? arg(node, 4));
    return `<div class="border-l-2 ${toneBorderClass(node.props.tone ?? arg(node, 3))} pl-3">${image ? `<img src="${esc(image)}" class="mb-2 h-20 w-full rounded-md object-cover">` : ""}<div class="font-mono text-[11px] uppercase text-muted-foreground">${boundText(this.sources, arg(node, 0), "")}</div><div class="font-medium">${boundText(this.sources, arg(node, 1), "")}</div><p class="text-sm text-muted-foreground">${boundText(this.sources, arg(node, 2), "")}</p></div>`;
  }

  private renderComparison(node: LensNode): string {
    const title = arg(node, 0);
    const summary = arg(node, 1);
    const rows = compactRows(resolveBinding(node.props.items ?? arg(node, 2), this.sources, node.props.items ?? arg(node, 2) ?? ""));
    const items = node.children.length ? node.children.map((child) => this.renderComparisonItem(child)).join("") : rows.map((row) => this.renderComparisonRow(row)).join("");
    return `<section class="lens-panel rounded-lg border p-5" data-lens-repeat="comparison" ${this.attrs(node, "comparison")}>${title ? `<h2 class="lens-display text-xl font-semibold">${boundText(this.sources, title)}</h2>` : ""}${summary ? `<p class="mt-1 text-sm text-muted-foreground">${boundText(this.sources, summary)}</p>` : ""}<div class="mt-3 grid min-w-0 gap-3" data-lens-adaptive-grid data-min-cell-width="220" data-max-cols="2">${items}</div></section>`;
  }

  private renderComparisonItem(node: LensNode): string {
    const image = resolvedURL(this.sources, node.props.img ?? node.props.image ?? arg(node, 4));
    return `<div class="rounded-lg border p-4 ${tonePanelClass(node.props.tone ?? arg(node, 3))}">${image ? `<img src="${esc(image)}" class="mb-3 h-28 w-full rounded-md object-cover">` : ""}<h3 class="font-semibold">${boundText(this.sources, arg(node, 0), "")}</h3><div class="mt-1 lens-display text-2xl font-semibold">${boundText(this.sources, arg(node, 1), "")}</div>${arg(node, 2) ? `<p class="mt-1 text-sm text-muted-foreground">${boundText(this.sources, arg(node, 2), "")}</p>` : ""}</div>`;
  }

  private renderMemoryProfile(node: LensNode): string {
    const rows = compactRows(resolveBinding(node.props.items ?? arg(node, 2), this.sources, node.props.items ?? arg(node, 2) ?? ""));
    const facts = node.children.length ? node.children.map((child) => this.renderMemoryFact(child)).join("") : rows.map((row) => this.renderMemoryRow(row)).join("");
    return `<section class="lens-panel rounded-lg border p-5" data-lens-repeat="memory" ${this.attrs(node, "memoryProfile")}><h2 class="lens-display text-xl font-semibold">${boundText(this.sources, arg(node, 0), "Memory")}</h2>${arg(node, 1) ? `<p class="mt-1 text-sm text-muted-foreground">${boundText(this.sources, arg(node, 1))}</p>` : ""}<div class="mt-3 grid gap-2">${facts}</div></section>`;
  }

  private renderMemoryFact(node: LensNode): string {
    return `<div class="rounded-md border border-border/70 bg-muted/40 p-3"><div class="font-mono text-[11px] uppercase text-muted-foreground">${boundText(this.sources, arg(node, 0), "")}</div><div class="text-sm">${boundText(this.sources, arg(node, 1), "")}</div>${arg(node, 2) ? `<p class="mt-1 text-xs text-muted-foreground">${boundText(this.sources, arg(node, 2))}</p>` : ""}</div>`;
  }

  private renderSteps(node: LensNode): string {
    const rows = compactRows(resolveBinding(node.props.items ?? arg(node, 2), this.sources, node.props.items ?? arg(node, 2) ?? ""));
    const steps = node.children.length ? node.children.map((child) => this.renderStep(child)).join("") : rows.map((row) => this.renderStepRow(row)).join("");
    return `<section class="lens-panel rounded-lg border p-5" data-lens-repeat="steps" ${this.attrs(node, "steps")}><h2 class="lens-display text-xl font-semibold">${boundText(this.sources, arg(node, 0), "Steps")}</h2>${arg(node, 1) ? `<p class="mt-1 text-sm text-muted-foreground">${boundText(this.sources, arg(node, 1))}</p>` : ""}<div class="mt-3 space-y-2">${steps}</div></section>`;
  }

  private renderStep(node: LensNode): string {
    const status = (arg(node, 1) ?? "todo").toLowerCase();
    return `<div class="flex items-start gap-3 rounded-md border border-border/70 p-3"><span class="mt-0.5 font-mono text-xs text-muted-foreground">${stepMark(status)}</span><span class="min-w-0"><span class="block text-sm">${boundText(this.sources, arg(node, 0), "")}</span>${arg(node, 2) ? `<span class="mt-1 block text-xs text-muted-foreground">${boundText(this.sources, arg(node, 2))}</span>` : ""}</span></div>`;
  }

  private renderMosaic(node: LensNode): string {
    const title = arg(node, 0);
    const caption = arg(node, 1);
    const height = numberProp(node, "h", 180);
    const rows = compactRows(resolveBinding(node.props.items ?? arg(node, 2), this.sources, node.props.items ?? arg(node, 2) ?? ""));
    const items = node.children.length
      ? node.children.map((child, index) => `<div class="${index === 0 ? "sm:col-span-2 sm:row-span-2" : ""}">${child.component === "video" ? this.renderVideo(child) : this.renderImage(child)}</div>`).join("")
      : rows.map((row, index) => this.renderCompactMedia(row, index === 0 ? height * 2 + 12 : height, index === 0)).join("");
    return `<section class="lens-panel rounded-lg border p-4" data-lens-repeat="mosaic" ${this.attrs(node, "mosaic")}>${title ? `<h2 class="lens-display text-lg font-semibold">${boundText(this.sources, title)}</h2>` : ""}${caption ? `<p class="mb-3 text-sm text-muted-foreground">${boundText(this.sources, caption)}</p>` : ""}<div class="grid min-w-0 gap-3" data-lens-adaptive-grid data-min-cell-width="180" data-max-cols="3">${items}</div></section>`;
  }

  private renderNewsRow(row: string | string[]): string {
    const cells = compactRow(row);
    const image = resolvedURL(this.sources, cells[4]);
    return `<article class="overflow-hidden rounded-lg border p-3">${image ? `<img src="${esc(image)}" class="mb-3 h-28 w-full rounded-md object-cover">` : ""}<div class="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">${cells[1] ? `<span>${esc(cells[1])}</span>` : ""}${cells[2] ? `<span>${esc(cells[2])}</span>` : ""}</div><h3 class="mt-1 font-medium">${esc(cells[0] ?? "Story")}</h3>${cells[3] ? `<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">${esc(cells[3])}</p>` : ""}</article>`;
  }

  private renderSourceRow(row: string | string[]): string {
    const cells = compactRow(row);
    const title = cells[0] ?? "Source";
    const url = cells[1] ?? "#";
    const time = cells[2];
    const note = cells[4] ?? cells[3];
    return `<a class="rounded-md border px-3 py-2 text-xs text-muted-foreground hover:text-foreground" href="${esc(url)}"><span class="font-mono uppercase">${esc(title)}</span>${time ? `<span class="ml-2 opacity-70">${esc(time)}</span>` : ""}${note ? `<span class="ml-2">${esc(note)}</span>` : ""}</a>`;
  }

  private renderEventRow(row: string | string[]): string {
    const cells = compactRow(row);
    const image = resolvedURL(this.sources, cells[4]);
    return `<div class="border-l-2 ${toneBorderClass(cells[3])} pl-3">${image ? `<img src="${esc(image)}" class="mb-2 h-20 w-full rounded-md object-cover">` : ""}<div class="font-mono text-[11px] uppercase text-muted-foreground">${esc(cells[0] ?? "")}</div><div class="font-medium">${esc(cells[1] ?? "")}</div>${cells[2] ? `<p class="text-sm text-muted-foreground">${esc(cells[2])}</p>` : ""}</div>`;
  }

  private renderComparisonRow(row: string | string[]): string {
    const cells = compactRow(row);
    const image = resolvedURL(this.sources, cells[4]);
    return `<div class="rounded-lg border p-4 ${tonePanelClass(cells[3])}">${image ? `<img src="${esc(image)}" class="mb-3 h-28 w-full rounded-md object-cover">` : ""}<h3 class="font-semibold">${esc(cells[0] ?? "")}</h3><div class="mt-1 lens-display text-2xl font-semibold">${esc(cells[1] ?? "")}</div>${cells[2] ? `<p class="mt-1 text-sm text-muted-foreground">${esc(cells[2])}</p>` : ""}</div>`;
  }

  private renderMemoryRow(row: string | string[]): string {
    const cells = compactRow(row);
    const confidence = cells[4] ? `<span class="font-mono text-[10px] uppercase text-muted-foreground">${esc(cells[4])}</span>` : "";
    return `<div class="rounded-md border border-border/70 bg-muted/40 p-3"><div class="flex items-center justify-between gap-2"><div class="font-mono text-[11px] uppercase text-muted-foreground">${esc(cells[0] ?? "")}</div>${confidence}</div><div class="text-sm">${esc(cells[1] ?? "")}</div>${cells[2] ? `<p class="mt-1 text-xs text-muted-foreground">${esc(cells[2])}</p>` : ""}${cells[3] ? `<div class="mt-2 font-mono text-[10px] uppercase text-muted-foreground">${esc(cells[3])}</div>` : ""}</div>`;
  }

  private renderStepRow(row: string | string[]): string {
    const cells = compactRow(row);
    const status = (cells[1] ?? "todo").toLowerCase();
    return `<div class="flex items-start gap-3 rounded-md border border-border/70 p-3"><span class="mt-0.5 font-mono text-xs text-muted-foreground">${stepMark(status)}</span><span class="min-w-0"><span class="block text-sm">${esc(cells[0] ?? "")}</span>${cells[2] ? `<span class="mt-1 block text-xs text-muted-foreground">${esc(cells[2])}</span>` : ""}</span></div>`;
  }

  private renderCompactMedia(row: string | string[], height: number, featured = false): string {
    const cells = Array.isArray(row) ? row : compactRow(row);
    const src = resolvedURL(this.sources, cells[0]) ?? "";
    const alt = cells[1] ?? "";
    const caption = cells[2];
    const kind = (cells[3] ?? "").toLowerCase();
    if (!src) return `<div class="${featured ? "sm:col-span-2 sm:row-span-2 " : ""}min-w-0 flex-1 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground" style="min-width:min(220px, 100%)">media unavailable</div>`;
    const content = kind === "video"
      ? `<video src="${esc(src)}" class="block w-full object-cover" style="${adaptiveHeightStyle(height, 0.34, 120)}" playsinline controls></video>`
      : `<img src="${esc(src)}" alt="${esc(alt)}" class="block w-full object-cover" style="${adaptiveHeightStyle(height, 0.34, 120)}" loading="lazy">`;
    return `<figure class="${featured ? "sm:col-span-2 sm:row-span-2 " : ""}min-w-0 flex-1 overflow-hidden rounded-lg border bg-secondary/30" style="min-width:min(220px, 100%)">${content}${caption ? `<figcaption class="border-t border-border/70 px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">${esc(caption)}</figcaption>` : ""}</figure>`;
  }
}

export class BrowserLensStageRuntime implements LensStageRuntime {
  private workspace = new LensUIWorkspace();
  private renderer = new LensHTMLRenderer();
  private metadata: LensRenderMetadata = emptyMetadata();
  private theme: LensTheme = defaultTheme();
  private root: HTMLElement;
  private colorSchemeMedia?: MediaQueryList;

  constructor(root: HTMLElement) {
    this.root = root;
    this.colorSchemeMedia = window.matchMedia?.("(prefers-color-scheme: dark)");
    this.colorSchemeMedia?.addEventListener?.("change", () => {
      if (this.theme.mode === "system") applyTheme(this.theme, this.root);
    });
  }

  render(lightcode: string, components?: LensComponentDefinition[], styles?: LightStylePackDefinition[], defaultStyle?: string): LensApplyResult {
    return this.commit(() => {
      if (components) this.workspace.components = components.slice();
      if (styles) this.workspace.styles = styles.slice();
      if (defaultStyle !== undefined) this.workspace.defaultStyle = defaultStyle || undefined;
      this.workspace.replaceLightcode(lightcode);
    });
  }

  apply(commandStream: string): LensApplyResult {
    let applied: LensApplyResult | undefined;
    const result = this.commit(() => {
      applied = this.workspace.apply(commandStream);
      for (const update of applied.sourceUpdates) {
        this.renderer.setSource(update.id, update.payload);
      }
    });
    return result.ok && applied
      ? { ...result, sourceUpdates: applied.sourceUpdates, pageActions: applied.pageActions }
      : result;
  }

  patch(offset: number, deleteCount: number, lightcode: string): LensApplyResult {
    return this.commit(() => {
      this.workspace.patchLightcode(offset, deleteCount, lightcode);
    });
  }

  registerComponent(definition: LensComponentDefinition): LensApplyResult {
    return this.commit(() => {
      this.workspace.saveComponent(definition);
    });
  }

  patchComponent(name: string, offset: number, deleteCount: number, source: string): LensApplyResult {
    return this.commit(() => {
      this.workspace.patchComponent(name, offset, deleteCount, source);
    });
  }

  deleteComponent(name: string): LensApplyResult {
    return this.commit(() => {
      this.workspace.deleteComponent(name);
    });
  }

  registerStyle(definition: LightStylePackDefinition): LensApplyResult {
    return this.commit(() => {
      this.workspace.saveStyle(definition);
    });
  }

  patchStyle(name: string, offset: number, deleteCount: number, source: string): LensApplyResult {
    return this.commit(() => {
      this.workspace.patchStyle(name, offset, deleteCount, source);
    });
  }

  deleteStyle(name: string): LensApplyResult {
    return this.commit(() => {
      this.workspace.deleteStyle(name);
    });
  }

  setDefaultStyle(name?: string): LensApplyResult {
    return this.commit(() => {
      this.workspace.setDefaultStyle(name);
    });
  }

  setSource(id: string, payload: unknown): boolean {
    this.renderer.setSource(id, payload);
    const result = this.render(this.workspace.lightcode, this.workspace.components, this.workspace.styles, this.workspace.defaultStyle);
    return result.ok;
  }

  read(kind: "lightcode" | "components" | "styles" | "metadata" | "status"): unknown {
    switch (kind) {
      case "lightcode": return this.workspace.lightcode;
      case "components": return this.workspace.components;
      case "styles": return this.workspace.readStyles();
      case "metadata": return this.metadata;
      case "status": return { ok: true, lightcodeLength: this.workspace.lightcode.length, components: this.workspace.components.length, styles: this.workspace.styles.length, defaultStyle: this.workspace.defaultStyle ?? null };
    }
  }

  validate(lightcode: string, components?: LensComponentDefinition[], styles?: LightStylePackDefinition[], defaultStyle?: string): LensApplyResult {
    try {
      const result = this.renderer.render(lightcode, components ?? this.workspace.components, styles ?? this.workspace.styles, defaultStyle ?? this.workspace.defaultStyle);
      return this.success(false, false, false, result.metadata, result.theme);
    } catch (error) {
      return this.failure(error);
    }
  }

  private commit(mutator: () => void): LensApplyResult {
    const previousLightcode = this.workspace.lightcode;
    const previousComponents = this.workspace.components.slice();
    const previousStyles = this.workspace.styles.slice();
    const previousDefaultStyle = this.workspace.defaultStyle;
    try {
      mutator();
      const result = this.renderer.render(this.workspace.lightcode, this.workspace.components, this.workspace.styles, this.workspace.defaultStyle);
      this.metadata = result.metadata;
      this.theme = result.theme;
      this.root.innerHTML = result.html;
      activeRuntimeRoots.add(this.root);
      applyTheme(result.theme, this.root);
      clearRenderFailure(this.root);
      executeHTMLComponentScripts(this.root);
      mountRuntime(this.root);
      post({ kind: "rendered", metadata: result.metadata, theme: result.theme });
      return this.success(
        previousLightcode !== this.workspace.lightcode,
        JSON.stringify(previousComponents) !== JSON.stringify(this.workspace.components),
        JSON.stringify(previousStyles) !== JSON.stringify(this.workspace.styles) || previousDefaultStyle !== this.workspace.defaultStyle,
        result.metadata,
        result.theme
      );
    } catch (error) {
      this.workspace.lightcode = previousLightcode;
      this.workspace.components = previousComponents;
      this.workspace.styles = previousStyles;
      this.workspace.defaultStyle = previousDefaultStyle;
      const failed = this.failure(error);
      showRenderFailure(this.root, failed.error ?? "Unknown render error", this.theme);
      post({ kind: "error", message: failed.error });
      return failed;
    }
  }

  private success(changedLightcode: boolean, changedComponents: boolean, changedStyles: boolean, metadata: LensRenderMetadata, theme: LensTheme): LensApplyResult {
    return { ok: true, changedLightcode, changedComponents, changedStyles, sourceUpdates: [], pageActions: [], metadata, theme };
  }

  private failure(error: unknown): LensApplyResult {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, changedLightcode: false, changedComponents: false, changedStyles: false, sourceUpdates: [], pageActions: [], metadata: this.metadata, theme: this.theme, error: message };
  }
}

const activeRuntimeRoots = new Set<HTMLElement>();
const resizeObservers = new WeakMap<HTMLElement, ResizeObserver>();
const contentResizeObservers = new WeakMap<HTMLElement, ResizeObserver>();
let lensRuntimeSequence = 0;

export type LensStageSizingMode = "stage" | "auto";

export type LensStageSizeDetail = {
  sizing: LensStageSizingMode;
  flow: "fit" | "scroll" | "auto";
  aspect: "portrait" | "wide" | "balanced";
  size: "narrow" | "compact" | "wide";
  width: number;
  height: number;
  contentWidth: number;
  contentHeight: number;
  scale: number;
  overflowX: boolean;
  overflowY: boolean;
};

export function createStageRuntime(root: HTMLElement): LensStageRuntime {
  const runtime = new BrowserLensStageRuntime(root);
  const id = ensureRuntimeID(root);
  activeRuntimeRoots.add(root);
  const registry = ensureRuntimeRegistry();
  registry.set(id, runtime);
  const globals = window as unknown as { lensStage?: LensStageRuntime };
  if (!globals.lensStage || root.id === "lens-stage-mount") {
    globals.lensStage = runtime;
  }
  observeStageResize(root);
  post({ kind: "ready", lensID: id });
  return runtime;
}

function mountRuntime(root: HTMLElement): void {
  applyNodeStyles(root);
  fitStage(root);
  observeRenderedContentResize(root);
  mountDecks(root);
  mountScenes(root);
  queueMicrotask(() => post({ kind: "webviews" }));
}

function applyNodeStyles(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("[data-lens-style-css]").forEach((element) => {
    const css = element.dataset.lensStyleCss;
    if (!css) return;
    element.style.cssText = `${element.style.cssText};${css}`;
  });
}

function fitStage(mount: HTMLElement): void {
  const stageRoot = mount.querySelector<HTMLElement>("#lens-stage-root");
  const frame = mount.querySelector<HTMLElement>("#lens-stage-frame");
  if (!stageRoot || !frame) return;
  const sizing = lensSizingMode(mount);
  stageRoot.style.width = "100%";
  stageRoot.style.height = sizing === "auto" ? "auto" : "100%";
  stageRoot.style.minHeight = sizing === "auto" ? "0" : "100%";
  stageRoot.style.maxWidth = "100%";
  stageRoot.style.maxHeight = sizing === "auto" ? "none" : "100%";
  frame.style.minHeight = sizing === "auto" ? "0" : "100%";
  frame.style.transform = "scale(1)";
  frame.style.width = "100%";
  const mountRect = mount.getBoundingClientRect();
  const width = Math.max(1, stageRoot.clientWidth || mount.clientWidth || Math.round(mountRect.width));
  const measuredHeight = Math.max(1, stageRoot.clientHeight || mount.clientHeight || Math.round(mountRect.height));
  const height = sizing === "auto"
    ? Math.max(320, Math.min(900, measuredHeight || Math.round(width * 0.62)))
    : measuredHeight;
  const portrait = height > width * 1.12;
  const narrow = width < 560;
  const compact = width < 760;
  const aspect = portrait ? "portrait" : width > height * 1.45 ? "wide" : "balanced";
  const size = narrow ? "narrow" : compact ? "compact" : "wide";
  stageRoot.style.setProperty("--lens-container-width", `${width}px`);
  stageRoot.style.setProperty("--lens-container-height", `${height}px`);
  stageRoot.dataset.lensContainerWidth = String(width);
  stageRoot.dataset.lensContainerHeight = String(height);
  stageRoot.dataset.lensSizing = sizing;
  stageRoot.dataset.lensSize = size;
  stageRoot.dataset.lensAspect = aspect;
  stageRoot.dataset.lensFlow = sizing === "auto" ? "auto" : narrow || portrait ? "scroll" : "fit";
  stageRoot.style.overflowX = "hidden";
  stageRoot.style.overflowY = sizing === "auto" ? "hidden" : narrow || portrait ? "auto" : "hidden";
  mount.querySelectorAll<HTMLElement>("[data-lens-adaptive-grid]").forEach((grid) => layoutAdaptiveGrid(grid, stageRoot));
  const horizontalScale = width / Math.max(1, frame.scrollWidth);
  const verticalScale = sizing === "auto" || narrow || portrait ? 1 : height / Math.max(1, frame.scrollHeight);
  const scale = Math.min(1, Math.max(0.2, Math.min(horizontalScale, verticalScale)));
  frame.dataset.lensScale = scale.toFixed(3);
  frame.style.transform = `scale(${scale})`;
  const rootStyle = window.getComputedStyle(stageRoot);
  const paddingX = px(rootStyle.paddingLeft) + px(rootStyle.paddingRight);
  const paddingY = px(rootStyle.paddingTop) + px(rootStyle.paddingBottom);
  const contentWidth = Math.ceil(frame.scrollWidth * scale + paddingX);
  const contentHeight = Math.ceil(frame.scrollHeight * scale + paddingY);
  const overflowX = contentWidth > width + 1;
  const overflowY = contentHeight > height + 1;
  const flow = sizing === "auto" ? "auto" : overflowY || narrow || portrait ? "scroll" : "fit";
  stageRoot.dataset.lensFlow = flow;
  stageRoot.dataset.lensContentWidth = String(contentWidth);
  stageRoot.dataset.lensContentHeight = String(contentHeight);
  if (sizing === "stage") stageRoot.style.overflowY = flow === "scroll" ? "auto" : "hidden";
  emitStageSize(mount, { sizing, flow, aspect, size, width, height, contentWidth, contentHeight, scale, overflowX, overflowY });
}

function lensSizingMode(mount: HTMLElement): LensStageSizingMode {
  const raw = (mount.dataset.lensSizing ?? mount.dataset.lensEmbed ?? "").toLowerCase();
  return raw === "auto" || raw === "content" ? "auto" : "stage";
}

function emitStageSize(mount: HTMLElement, detail: LensStageSizeDetail): void {
  mount.dispatchEvent(new CustomEvent<LensStageSizeDetail>("lensui:size", { bubbles: true, detail }));
}

function px(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function layoutAdaptiveGrid(element: HTMLElement, stageRoot: HTMLElement): void {
  const min = clampNumber(Number(element.dataset.minCellWidth ?? 220), 96, 520);
  const max = Math.max(1, Math.min(8, Number(element.dataset.maxCols ?? 4) || 4));
  const stageWidth = Math.max(1, stageRoot.clientWidth);
  const stageHeight = Math.max(1, stageRoot.clientHeight);
  const portrait = stageHeight > stageWidth * 1.12;
  const style = window.getComputedStyle(element);
  const gap = Number.parseFloat(style.columnGap || style.gap || "16") || 16;
  const width = Math.max(1, element.clientWidth || element.getBoundingClientRect().width || stageWidth);
  const narrowCap = stageWidth < 520 ? 1 : portrait && stageWidth < 720 ? 2 : max;
  const colsByWidth = Math.floor((width + gap) / (min + gap)) || 1;
  const cols = Math.max(1, Math.min(max, narrowCap, colsByWidth));
  element.dataset.lensCols = String(cols);
  element.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
}

function observeStageResize(root: HTMLElement): void {
  if (typeof ResizeObserver === "undefined") return;
  resizeObservers.get(root)?.disconnect();
  const observer = new ResizeObserver(() => {
    if (activeRuntimeRoots.has(root)) fitStage(root);
  });
  observer.observe(root);
  resizeObservers.set(root, observer);
}

function observeRenderedContentResize(root: HTMLElement): void {
  if (typeof ResizeObserver === "undefined") return;
  contentResizeObservers.get(root)?.disconnect();
  const stageRoot = root.querySelector<HTMLElement>("#lens-stage-root");
  const frame = root.querySelector<HTMLElement>("#lens-stage-frame");
  if (!stageRoot || !frame) return;
  let pending = false;
  const observer = new ResizeObserver(() => {
    if (pending || !activeRuntimeRoots.has(root)) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (activeRuntimeRoots.has(root)) fitStage(root);
    });
  });
  observer.observe(stageRoot);
  observer.observe(frame);
  contentResizeObservers.set(root, observer);
}

function showRenderFailure(root: HTMLElement, message: string, theme: LensTheme): void {
  let stageRoot = root.querySelector<HTMLElement>("#lens-stage-root");
  if (!stageRoot) {
    root.innerHTML = renderFailureState(message);
    activeRuntimeRoots.add(root);
    applyTheme(theme, root);
    mountRuntime(root);
    return;
  }
  stageRoot.style.position = "relative";
  let failure = stageRoot.querySelector<HTMLElement>("[data-lens-render-failure]");
  if (!failure) {
    failure = document.createElement("aside");
    failure.setAttribute("data-lens-render-failure", "");
    failure.setAttribute("role", "alert");
    failure.style.cssText = [
      "position:absolute",
      "left:var(--lens-stage-padding)",
      "right:var(--lens-stage-padding)",
      "bottom:var(--lens-stage-padding)",
      "z-index:40",
      "display:grid",
      "gap:0.35rem",
      "border:1px solid hsl(var(--destructive) / 0.78)",
      "border-radius:var(--radius)",
      "background:hsl(var(--background) / 0.94)",
      "box-shadow:var(--lens-shadow)",
      "padding:0.75rem 0.9rem",
      "color:hsl(var(--foreground))",
      "font-family:var(--lens-font-mono)",
      "font-size:0.75rem",
      "line-height:1.45",
      "backdrop-filter:blur(8px)"
    ].join(";");
    stageRoot.appendChild(failure);
  }
  failure.innerHTML = failureBody(message, true);
}

function clearRenderFailure(root: HTMLElement): void {
  root.querySelector("[data-lens-render-failure]")?.remove();
}

function renderFailureState(message: string): string {
  return `<main id="lens-stage-root" class="lens-stage-root bg-background text-foreground">
    <div id="lens-stage-frame" class="lens-stage-frame mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-5">
      <section data-lens-render-failure role="alert" class="lens-panel rounded-lg border p-5" style="border-color:hsl(var(--destructive) / 0.78)">
        ${failureBody(message, false)}
      </section>
    </div>
  </main>`;
}

function failureBody(message: string, preserved: boolean): string {
  return `<strong class="lens-display text-lg font-semibold" style="color:hsl(var(--destructive))">Render failed</strong>
    <span style="color:hsl(var(--muted-foreground))">${preserved ? "Previous UI preserved. Fix the lightcode and render again." : "LensUI rejected the lightcode before committing a UI."}</span>
    <code style="white-space:pre-wrap;overflow-wrap:anywhere;color:hsl(var(--foreground))">${esc(message)}</code>`;
}

function mountDecks(mount: HTMLElement): void {
  mount.querySelectorAll<HTMLElement>("[data-lens-deck]").forEach((deck) => {
    const pages = Array.from(deck.querySelectorAll<HTMLElement>("[data-lens-deck-page]"));
    const show = (index: number) => {
      const next = Math.max(0, Math.min(pages.length - 1, index));
      deck.dataset.lensPage = String(next);
      pages.forEach((page, pageIndex) => page.classList.toggle("hidden", pageIndex !== next));
      fitStage(mount);
    };
    deck.querySelector("[data-lens-prev]")?.addEventListener("click", () => show(Number(deck.dataset.lensPage ?? 0) - 1));
    deck.querySelector("[data-lens-next]")?.addEventListener("click", () => show(Number(deck.dataset.lensPage ?? 0) + 1));
  });
}

function mountScenes(mount: HTMLElement): void {
  mount.querySelectorAll<HTMLCanvasElement>("[data-lens-scene]").forEach((canvas) => {
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.scale(ratio, ratio);
    const width = rect.width;
    const height = rect.height;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.08)");
    context.fillStyle = "rgba(10, 10, 10, 0.72)";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = gradient;
    context.lineWidth = 2;
    for (let i = 0; i < 24; i += 1) {
      context.beginPath();
      const y = (height / 24) * i;
      context.moveTo(0, y);
      context.bezierCurveTo(width * 0.25, y + Math.sin(i) * 30, width * 0.75, y - Math.cos(i) * 30, width, y + Math.sin(i * 0.4) * 20);
      context.stroke();
    }
  });
}

function applyTheme(theme: LensTheme, root: HTMLElement): void {
  const mode = resolveColorMode(theme);
  const colors = mode === "light" ? theme.light : theme.dark;
  const set = (name: string, hsl: { h: number; s: number; l: number }) => root.style.setProperty(name, `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  set("--background", colors.background);
  set("--foreground", colors.foreground);
  set("--card", colors.card);
  set("--card-foreground", colors.cardForeground);
  set("--primary", colors.primary);
  set("--primary-foreground", colors.primaryForeground);
  set("--secondary", colors.secondary);
  set("--secondary-foreground", colors.secondaryForeground);
  set("--muted", colors.muted);
  set("--muted-foreground", colors.mutedForeground);
  set("--accent", colors.accent);
  set("--accent-foreground", colors.accentForeground);
  set("--destructive", colors.destructive);
  set("--destructive-foreground", colors.destructiveForeground);
  set("--border", colors.border);
  set("--input", colors.input);
  set("--ring", colors.ring);
  set("--success", colors.success);
  set("--warning", colors.warning);
  set("--surface-raised", colors.surfaceRaised);
  root.style.setProperty("--radius", theme.radius);
  root.style.setProperty("--lens-stage-padding", theme.stagePadding);
  root.style.setProperty("--lens-shadow", theme.shadow);
  root.style.setProperty("--lens-grid-line", mode === "light" ? "0 0 0 / 0.055" : "255 255 255 / 0.035");
  root.style.setProperty("--lens-grid-line-soft", mode === "light" ? "0 0 0 / 0.045" : "255 255 255 / 0.032");
  root.style.setProperty("--lens-panel-sheen", mode === "light" ? "0 0 0 / 0.025" : "255 255 255 / 0.035");
  root.style.setProperty("--lens-stage-background", "hsl(var(--background))");
  root.style.setProperty("--lens-panel-background", `linear-gradient(180deg, rgb(var(--lens-panel-sheen)), transparent 42%), hsl(var(--card) / ${mode === "light" ? "0.96" : "0.92"})`);
  root.style.setProperty("--lens-panel-border", `hsl(var(--border) / ${mode === "light" ? "0.78" : "0.82"})`);
  root.style.colorScheme = mode;
  root.dataset.lensColorMode = mode;
  root.dataset.lensRequestedColorMode = theme.mode;
  const mono = `"JetBrains Mono", "SF Mono", ui-monospace, monospace`;
  root.style.setProperty("--lens-font-body", theme.fontPreset === "system" ? `"SF Pro Text", -apple-system, sans-serif` : theme.fontPreset === "mono" ? mono : `"Manrope", "Avenir Next", -apple-system, sans-serif`);
  root.style.setProperty("--lens-font-display", theme.fontPreset === "system" ? `"SF Pro Display", -apple-system, sans-serif` : theme.fontPreset === "mono" ? mono : `"Space Grotesk", "Manrope", -apple-system, sans-serif`);
  root.style.setProperty("--lens-font-mono", theme.fontPreset === "system" ? `"SF Mono", ui-monospace, monospace` : mono);
  root.dataset.lensDensity = theme.density;
}

function resolveColorMode(theme: LensTheme): "light" | "dark" {
  if (theme.mode === "light" || theme.mode === "dark") return theme.mode;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function runtimeAttrs(node: LensNode, component: string): string {
  return `data-lens-key="${esc(node.key)}" data-lens-component="${esc(component)}"`;
}

function styleAttrs(node: LensNode, sheet: LightStyleSheet): string {
  const name = node.props.s ?? node.props.style;
  const recipe = name ? sheet.recipes[name] : undefined;
  const props = { ...(recipe?.props ?? {}) };
  for (const key of ["bg", "fg", "bd", "p", "m", "g", "r", "sh", "caps", "mono", "w", "h", "op"]) {
    if (node.props[key] != null) props[key] = node.props[key];
  }
  const declarations = styleDeclarations(props);
  const data = name ? ` data-lens-style="${esc(name)}"` : "";
  return `${data}${declarations ? ` data-lens-style-css="${esc(declarations)}"` : ""}`;
}

function styleDeclarations(props: Record<string, string>): string {
  const out: string[] = [];
  if (props.bg) out.push(`background:${colorToken(props.bg)}`);
  if (props.fg) out.push(`color:${colorToken(props.fg)}`);
  if (props.bd) out.push(`border-color:${colorToken(props.bd)}`);
  if (props.p) out.push(`padding:${spaceToken(props.p)}`);
  if (props.m) out.push(`margin:${spaceToken(props.m)}`);
  if (props.g) out.push(`gap:${spaceToken(props.g)}`);
  if (props.r) out.push(`border-radius:${radiusToken(props.r)}`);
  if (props.sh) out.push(`box-shadow:${shadowToken(props.sh)}`);
  if (props.w) out.push(`width:${sizeToken(props.w)}`);
  if (props.h) out.push(`height:${sizeToken(props.h)}`);
  if (props.op) out.push(`opacity:${numberToken(props.op, 0, 1)}`);
  if (truthy(props.caps)) {
    out.push("text-transform:uppercase");
    out.push("letter-spacing:0");
  }
  if (truthy(props.mono)) out.push("font-family:var(--lens-font-mono)");
  return out.join(";");
}

function colorToken(value: string): string {
  const [raw, alpha] = value.split("/");
  const opacity = alpha == null ? "" : ` / ${alphaValue(alpha)}`;
  const aliases: Record<string, string> = {
    b: "background", bg: "background", back: "background",
    fg: "foreground", text: "foreground",
    c: "card", card: "card", surface: "card",
    p: "primary", pri: "primary", primary: "primary",
    s: "secondary", sec: "secondary",
    m: "muted", mut: "muted",
    a: "accent", accent: "accent",
    ok: "success", success: "success",
    w: "warning", warn: "warning",
    bad: "destructive", danger: "destructive",
    br: "border", border: "border"
  };
  const key = aliases[raw] ?? raw;
  if (/^\d+,\d+,\d+$/.test(raw)) {
    const [h, s, l] = raw.split(",");
    return `hsl(${h} ${s}% ${l}%${opacity})`;
  }
  if (/^#[0-9A-Fa-f]{3,8}$/.test(raw)) return raw;
  if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(key)) return `hsl(var(--${key})${opacity})`;
  return "inherit";
}

function alphaValue(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return String(Math.max(0, Math.min(1, n > 1 ? n / 100 : n)));
}

function spaceToken(value: string): string {
  const scale: Record<string, string> = {
    "0": "0",
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem"
  };
  return scale[value] ?? sizeToken(value);
}

function radiusToken(value: string): string {
  if (["0", "1", "2", "3", "4", "5", "6", "8", "10", "12"].includes(value)) return `${value}px`;
  return sizeToken(value);
}

function shadowToken(value: string): string {
  switch (value) {
    case "0": case "none": return "none";
    case "hard": return "4px 4px 0 hsl(var(--foreground) / 0.18)";
    case "soft": return "var(--lens-shadow)";
    case "glow": return "0 0 44px hsl(var(--primary) / 0.18)";
    default: return /^[A-Za-z0-9_(),.%/# -]+$/.test(value) ? value : "var(--lens-shadow)";
  }
}

function sizeToken(value: string): string {
  if (/^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? `${n}px` : value;
}

function numberToken(value: string, min: number, max: number): string {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.max(min, Math.min(max, n))) : String(max);
}

function bindAttr(value: string | undefined, role: string): string {
  const ref = bindingReference(value);
  return ref ? `data-lens-bind="${esc(ref.sourceID)}.${esc(ref.path)}" data-lens-role="${esc(role)}"` : "";
}

function arg(node: LensNode, index: number): string | undefined {
  return node.args[index];
}

function numberProp(node: LensNode, key: string, fallback: number): number {
  const raw = node.props[key];
  const parsed = raw == null ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function adaptiveHeightStyle(maxHeight: number, containerFraction: number, minHeight: number): string {
  const max = Math.max(minHeight, maxHeight);
  return `height:clamp(${minHeight}px, calc(var(--lens-container-height, ${Math.round(max / containerFraction)}px) * ${containerFraction}), ${max}px)`;
}

function boundText(sources: Record<string, unknown>, value?: string, fallback = ""): string {
  return esc(resolveBinding(value, sources, fallback));
}

function resolvedURL(sources: Record<string, unknown>, value?: string): string | undefined {
  const resolved = resolveBinding(value, sources, value ?? "").trim();
  if (!/^https?:\/\//i.test(resolved) && !/^data:(image|video)\//i.test(resolved)) return undefined;
  return resolved;
}

function normalizePayload(payload: unknown): unknown {
  if (typeof payload === "string") {
    try { return JSON.parse(payload); } catch { return { body: payload }; }
  }
  return payload;
}

function esc(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function widthClass(value?: string): string {
  switch (value) {
    case "sm": return "max-w-xl";
    case "md": return "max-w-2xl";
    case "lg": return "max-w-4xl";
    case "xl": return "max-w-6xl";
    case "full": return "max-w-none";
    default: return "max-w-5xl";
  }
}

function justifyClass(value?: string): string {
  switch (value) {
    case "start": return "justify-start";
    case "end": return "justify-end";
    case "center": return "justify-center";
    default: return "justify-center";
  }
}

function textAlignClass(value?: string): string {
  switch (value) {
    case "center": return "text-center";
    case "right": return "text-right";
    default: return "text-left";
  }
}

function gapClass(value?: string): string {
  switch (value) {
    case "sm": return "gap-2";
    case "lg": return "gap-6";
    default: return "gap-4";
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

function toneClass(value?: string): string {
  switch (value) {
    case "success": return "border-success/50 bg-success/10 text-success";
    case "warning": return "border-warning/50 bg-warning/10 text-warning";
    case "destructive": return "border-destructive/50 bg-destructive/10 text-destructive";
    default: return "border-border bg-secondary text-secondary-foreground";
  }
}

function tonePanelClass(value?: string): string {
  switch ((value ?? "").toLowerCase()) {
    case "success": case "done": case "ok": return "border-success/50 bg-success/10 text-foreground";
    case "warning": case "active": case "wait": return "border-warning/50 bg-warning/10 text-foreground";
    case "destructive": case "blocked": case "bad": return "border-destructive/60 bg-destructive/10 text-foreground";
    default: return "border-border bg-secondary/35 text-foreground";
  }
}

function toneBorderClass(value?: string): string {
  switch ((value ?? "").toLowerCase()) {
    case "success": case "done": case "ok": return "border-success/80";
    case "warning": case "active": case "wait": return "border-warning/80";
    case "destructive": case "blocked": case "bad": return "border-destructive/80";
    default: return "border-border";
  }
}

function toneTextClass(value?: string): string {
  switch (value) {
    case "success": return "text-success";
    case "warning": return "text-warning";
    case "muted": return "text-muted-foreground";
    default: return "text-foreground";
  }
}

function truthy(value?: string): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").toLowerCase());
}

function chartData(raw: string): number[] {
  const values = raw.split(/[,\s]+/).map((value) => Number(value)).filter(Number.isFinite);
  return values.length ? values : [10, 20, 16, 28, 34, 26, 42];
}

function compactRow(row: string | string[] | undefined): string[] {
  if (Array.isArray(row)) return row.map(String);
  if (!row) return [];
  const delimiter = row.includes("^") ? "^" : ",";
  return row.split(delimiter).map((cell) => cell.trim());
}

function compactRows(raw: string): string[][] {
  if (!raw) return [];
  try {
    const json = JSON.parse(raw);
    if (Array.isArray(json)) return json.map((item) => Array.isArray(item) ? item.map(String) : Object.values(item ?? {}).map(String));
  } catch {}
  return raw.split(";").map(compactRow).filter((row) => row.some(Boolean));
}

function stepMark(status: string): string {
  if (["done", "ok", "complete"].includes(status)) return "OK";
  if (["active", "running", "now"].includes(status)) return ">>";
  if (["blocked", "error", "bad"].includes(status)) return "!!";
  if (["wait", "waiting", "pending"].includes(status)) return "..";
  return "--";
}

function renderMarkdown(source: string): string {
  return esc(source).split(/\n{2,}/).map((part) => `<p>${part.replace(/\n/g, "<br>")}</p>`).join("");
}

function renderTemplate(template: string, node: LensNode, sources: Record<string, unknown>, childrenHTML = ""): string {
  let html = template;
  node.args.forEach((value, index) => {
    html = html.replaceAll(`{{${index}}}`, boundText(sources, value));
  });
  Object.entries(node.props).forEach(([key, value]) => {
    html = html.replaceAll(`{{${key}}}`, boundText(sources, value));
  });
  html = html.replaceAll("{{children}}", childrenHTML);
  return html;
}

function executeHTMLComponentScripts(root: HTMLElement): void {
  root.querySelectorAll<HTMLScriptElement>("script").forEach((script) => {
    const activeScript = document.createElement("script");
    for (const attribute of Array.from(script.attributes)) {
      activeScript.setAttribute(attribute.name, attribute.value);
    }
    activeScript.textContent = script.textContent;
    try {
      script.replaceWith(activeScript);
    } catch (error) {
      console.error("LensUI HTML component script failed", error);
    }
  });
}

function webViewURL(raw: string, props: Record<string, string>): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  if ((props.kind ?? raw).toLowerCase() === "yttv") return "https://tv.youtube.com/";
  if ((props.kind ?? raw).toLowerCase() === "yt" || raw) return `https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}`;
  return "about:blank";
}

function post(body: Record<string, unknown>): void {
  try {
    window.webkit?.messageHandlers?.lens?.postMessage(body);
  } catch {}
}

declare global {
  interface Window {
    webkit?: { messageHandlers?: { lens?: { postMessage(body: unknown): void } } };
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    activeRuntimeRoots.forEach((root) => fitStage(root));
  });
}

function ensureRuntimeID(root: HTMLElement): string {
  const existing = root.dataset.lensId || root.id;
  if (existing) {
    root.dataset.lensId = existing;
    return existing;
  }
  const generated = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `lens-${Date.now().toString(36)}-${(++lensRuntimeSequence).toString(36)}`;
  root.dataset.lensId = generated;
  return generated;
}

function ensureRuntimeRegistry(): Map<string, LensStageRuntime> {
  const target = window as unknown as { lensStages?: Map<string, LensStageRuntime> };
  if (!target.lensStages) target.lensStages = new Map();
  return target.lensStages;
}
