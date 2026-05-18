export type LensComponentKind = "alias" | "html" | "react" | "swiftui";
export type LensComponentTrust = "built-in" | "user-saved" | "agent-generated" | "remote-imported";
export type LensLiveMode = "once" | "poll" | "stream";
export type LensBindingRole = "text" | "attribute" | "chartData" | "repeaterItems" | "mediaSource" | "webViewURL";

export interface LensComponentDefinition {
  name: string;
  aliases?: string[];
  kind: LensComponentKind;
  source: string;
  options?: Record<string, string>;
  trust?: LensComponentTrust;
}

export interface LightStylePackDefinition {
  name: string;
  aliases?: string[];
  source: string;
  options?: Record<string, string>;
  trust?: LensComponentTrust;
}

export interface LensDataSource {
  id: string;
  url: string;
  ttl: number;
  mode: LensLiveMode;
}

export interface LensBinding {
  nodeKey: string;
  sourceID: string;
  path: string;
  role: LensBindingRole;
}

export interface LensRenderMetadata {
  dataSources: LensDataSource[];
  bindings: LensBinding[];
}

export interface LensRenderResult {
  html: string;
  metadata: LensRenderMetadata;
  theme: LensTheme;
}

export type LensColorMode = "system" | "light" | "dark";

export interface LensThemePalette {
  background: HSL;
  foreground: HSL;
  card: HSL;
  cardForeground: HSL;
  primary: HSL;
  primaryForeground: HSL;
  secondary: HSL;
  secondaryForeground: HSL;
  muted: HSL;
  mutedForeground: HSL;
  accent: HSL;
  accentForeground: HSL;
  destructive: HSL;
  destructiveForeground: HSL;
  border: HSL;
  input: HSL;
  ring: HSL;
  success: HSL;
  warning: HSL;
  surfaceRaised: HSL;
}

export interface LensTheme extends LensThemePalette {
  mode: LensColorMode;
  light: LensThemePalette;
  dark: LensThemePalette;
  radius: string;
  stagePadding: string;
  backgroundEffect: string;
  shadow: string;
  fontPreset: string;
  density: string;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export type LensNodeComponent =
  | "root" | "view" | "stack" | "grid" | "card" | "heading" | "text" | "badge" | "alert" | "progress"
  | "table" | "tableHead" | "tableRow" | "empty" | "separator" | "avatar" | "image" | "video" | "mediaStrip"
  | "webview" | "vector" | "button" | "tabs" | "tab" | "deck" | "page" | "metric" | "chart"
  | "scene" | "markdown" | "weather" | "newsList" | "newsDetail" | "sourceStrip" | "sourceRef"
  | "timeline" | "event" | "comparison" | "comparisonItem" | "memoryProfile" | "memoryFact"
  | "steps" | "step" | "mosaic" | "customHTML" | "react" | "swiftui";

export interface LensNode {
  component: LensNodeComponent;
  key: string;
  args: string[];
  props: Record<string, string>;
  children: LensNode[];
  htmlTemplate?: string;
  reactSource?: string;
  reactExport?: string;
}

export interface LightcodeParseResult {
  root: LensNode;
  dataSources: LensDataSource[];
  theme: LensTheme;
  styles: LightStyleSheet;
}

export interface LightStyleSheet {
  theme: LensTheme;
  recipes: Record<string, LightStyleRecipe>;
  activeStyle?: string;
}

export interface LightStyleRecipe {
  name: string;
  props: Record<string, string>;
}

export type LensCommandOperation =
  | { type: "render"; lightcode: string }
  | { type: "patch"; offset: number; delete: number; lightcode: string }
  | { type: "registerComponent"; component: LensComponentDefinition }
  | { type: "patchComponent"; name: string; offset: number; delete: number; source: string }
  | { type: "deleteComponent"; name: string }
  | { type: "registerStyle"; style: LightStylePackDefinition }
  | { type: "patchStyle"; name: string; offset: number; delete: number; source: string }
  | { type: "deleteStyle"; name: string }
  | { type: "setDefaultStyle"; name?: string }
  | { type: "updateSource"; id: string; contentType: string; payload: string }
  | { type: "page"; action: string };

export interface LensCommandStream {
  operations: LensCommandOperation[];
}

export interface LensApplyResult {
  ok: boolean;
  changedLightcode: boolean;
  changedComponents: boolean;
  changedStyles: boolean;
  sourceUpdates: Array<{ id: string; contentType: string; payload: string }>;
  pageActions: string[];
  metadata: LensRenderMetadata;
  theme: LensTheme;
  error?: string;
}

type ComponentDefinition = {
  component: LensNodeComponent;
  args: string[];
  props: Record<string, string>;
  htmlTemplate?: string;
  reactSource?: string;
  reactExport?: string;
};

export class LensUIError extends Error {
  constructor(message: string, public readonly line?: number) {
    super(line ? `lightcode line ${line}: ${message}` : message);
    this.name = "LensUIError";
  }
}

const builtinAliases: Record<string, ComponentDefinition> = {
  V: def("view"), view: def("view"),
  S: def("stack"), stack: def("stack"),
  G: def("grid"), grid: def("grid"),
  C: def("card"), card: def("card"),
  R: def("heading"), h: def("heading"), heading: def("heading"),
  T: def("text"), text: def("text"),
  B: def("badge"), badge: def("badge"),
  A: def("alert"), alert: def("alert"),
  P: def("progress"), progress: def("progress"),
  Q: def("table"), table: def("table"),
  K: def("tableHead"), head: def("tableHead"),
  r: def("tableRow"), row: def("tableRow"),
  E: def("empty"), empty: def("empty"),
  Z: def("separator"), sep: def("separator"), separator: def("separator"),
  L: def("avatar"), AV: def("avatar"), avatar: def("avatar"),
  J: def("image"), img: def("image"), image: def("image"),
  W: def("video"), video: def("video"),
  U: def("mediaStrip"), media: def("mediaStrip"),
  WV: def("webview"), webview: def("webview"),
  VV: def("vector"), vector: def("vector"),
  N: def("button"), BT: def("button"), button: def("button"),
  Y: def("tabs"), TAB: def("tabs"), tabs: def("tabs"),
  TB: def("tab"), tab: def("tab"),
  D: def("deck"), deck: def("deck"),
  O: def("page"), page: def("page"),
  M: def("metric"), metric: def("metric"),
  H: def("chart"), chart: def("chart"),
  X: def("scene"), scene: def("scene"),
  MD: def("markdown"), markdown: def("markdown"),
  WX: def("weather"), weather: def("weather"),
  NL: def("newsList"), news: def("newsList"),
  ND: def("newsDetail"),
  SC: def("sourceStrip"),
  SR: def("sourceRef"),
  TL: def("timeline"), timeline: def("timeline"),
  EV: def("event"),
  CP: def("comparison"),
  CI: def("comparisonItem"),
  MM: def("memoryProfile"),
  MF: def("memoryFact"),
  ST: def("steps"),
  SI: def("step"),
  MO: def("mosaic")
};

function def(component: LensNodeComponent): ComponentDefinition {
  return { component, args: [], props: {} };
}

export function parseCommandStream(source: string): LensCommandStream {
  const lines = normalizeLines(source);
  const first = lines.findIndex((line) => line.trim().length > 0);
  if (first < 0) throw new LensUIError("command stream is empty");
  const headerFields = splitFields(lines[first]);
  if (headerFields.length !== 1 || headerFields[0] !== "!") {
    throw new LensUIError("command stream must start with !", first + 1);
  }

  const operations: LensCommandOperation[] = [];
  for (let i = first + 1; i < lines.length;) {
    const raw = lines[i];
    if (!raw.trim()) {
      i += 1;
      continue;
    }
    const line = i + 1;
    const fields = splitFields(raw);
    const command = fields[0];
    switch (command) {
      case "R": {
        const block = readBlock(lines, i, command);
        if (!block.body.trim()) throw new LensUIError("empty render block", line);
        operations.push({ type: "render", lightcode: block.body });
        i = block.next;
        break;
      }
      case "^": {
        requireFields(fields, 3, line, raw);
        const block = readBlock(lines, i, command);
        operations.push({ type: "patch", offset: parseIntField(fields[1], line), delete: parseIntField(fields[2], line), lightcode: block.body });
        i = block.next;
        break;
      }
      case "@!": {
        requireFields(fields, 4, line, raw);
        const options = fields[4] ? parseOptions(fields[4]) : {};
        const aliases = options.aliases?.split(",").map((v) => v.trim()).filter(Boolean) ?? [];
        delete options.aliases;
        const block = readBlock(lines, i, command);
        if (!block.body.trim()) throw new LensUIError("empty component block", line);
        operations.push({
          type: "registerComponent",
          component: {
            name: fields[1],
            kind: componentKind(fields[2], line),
            trust: componentTrust(fields[3], line),
            aliases,
            options,
            source: block.body
          }
        });
        i = block.next;
        break;
      }
      case "@^": {
        requireFields(fields, 4, line, raw);
        const block = readBlock(lines, i, command);
        operations.push({ type: "patchComponent", name: fields[1], offset: parseIntField(fields[2], line), delete: parseIntField(fields[3], line), source: block.body });
        i = block.next;
        break;
      }
      case "@-":
        requireFields(fields, 2, line, raw);
        operations.push({ type: "deleteComponent", name: fields[1] });
        i += 1;
        break;
      case "Y!": {
        requireFields(fields, 2, line, raw);
        const options = fields[3] ? parseOptions(fields[3]) : {};
        const aliases = options.aliases?.split(",").map((v) => v.trim()).filter(Boolean) ?? [];
        delete options.aliases;
        const block = readBlock(lines, i, command);
        if (!block.body.trim()) throw new LensUIError("empty style block", line);
        operations.push({
          type: "registerStyle",
          style: {
            name: fields[1],
            trust: fields[2] ? componentTrust(fields[2], line) : "agent-generated",
            aliases,
            options,
            source: block.body
          }
        });
        i = block.next;
        break;
      }
      case "Y^": {
        requireFields(fields, 4, line, raw);
        const block = readBlock(lines, i, command);
        operations.push({ type: "patchStyle", name: fields[1], offset: parseIntField(fields[2], line), delete: parseIntField(fields[3], line), source: block.body });
        i = block.next;
        break;
      }
      case "Y-":
        requireFields(fields, 2, line, raw);
        operations.push({ type: "deleteStyle", name: fields[1] });
        i += 1;
        break;
      case "Y*":
        operations.push({ type: "setDefaultStyle", name: fields[1]?.trim() || undefined });
        i += 1;
        break;
      case "S": {
        requireFields(fields, 2, line, raw);
        const block = readBlock(lines, i, command);
        operations.push({ type: "updateSource", id: fields[1], contentType: fields[2] || "application/json", payload: block.body });
        i = block.next;
        break;
      }
      case "P":
        requireFields(fields, 2, line, raw);
        operations.push({ type: "page", action: fields[1] });
        i += 1;
        break;
      default:
        throw new LensUIError(`unknown command '${command}'`, line);
    }
  }
  return { operations };
}

export class LensUIWorkspace {
  lightcode: string;
  components: LensComponentDefinition[];
  styles: LightStylePackDefinition[];
  defaultStyle?: string;

  constructor(lightcode = defaultLightcode(), components: LensComponentDefinition[] = [], styles: LightStylePackDefinition[] = [], defaultStyle?: string) {
    this.lightcode = lightcode;
    this.components = components.slice();
    this.styles = styles.slice();
    this.defaultStyle = defaultStyle;
  }

  replaceLightcode(lightcode: string): void {
    this.lightcode = lightcode;
  }

  readLightcode(offset = 1, limit?: number): string {
    const lines = this.lightcode.split("\n");
    if (offset > lines.length) return "";
    const end = Math.min(lines.length, offset + (limit ?? lines.length) - 1);
    const out: string[] = [];
    for (let line = Math.max(1, offset); line <= end; line += 1) {
      out.push(`${String(line).padStart(5, " ")}\t${lines[line - 1]}`);
    }
    return out.join("\n") + (out.length ? "\n" : "");
  }

  patchLightcode(offset: number, deleteCount: number, insert = ""): string {
    this.lightcode = patchSource(this.lightcode, offset, deleteCount, insert);
    return this.lightcode;
  }

  makeComponentDefinition(definition: LensComponentDefinition): LensComponentDefinition {
    const name = normalizeComponentName(definition.name);
    const aliases = (definition.aliases ?? []).map(normalizeComponentName);
    const source = definition.source.trim();
    if (!source) throw new LensUIError("component source is required");
    const kind = definition.kind || "alias";
    const normalizedSource = kind === "alias" && !isComponentDefinitionSource(source)
      ? `0@|${[name, ...aliases].join(",")}|${aliasDefinitionBody(source)}`
      : definition.source;
    return {
      name,
      aliases,
      kind,
      source: normalizedSource,
      options: { ...(definition.options ?? {}) },
      trust: definition.trust ?? "agent-generated"
    };
  }

  saveComponent(definition: LensComponentDefinition): void {
    const normalized = this.makeComponentDefinition(definition);
    const key = normalized.name.toLowerCase();
    const index = this.components.findIndex((component) => component.name.toLowerCase() === key);
    if (index >= 0) this.components[index] = normalized;
    else this.components.push(normalized);
  }

  patchComponent(name: string, offset: number, deleteCount: number, source = ""): LensComponentDefinition {
    const index = findComponentIndex(this.components, name);
    if (index < 0) throw new LensUIError(`component '${name}' is not saved`);
    const existing = this.components[index];
    const patched = { ...existing, source: patchSource(existing.source, offset, deleteCount, source) };
    this.components[index] = patched;
    return patched;
  }

  deleteComponent(name: string): void {
    const index = findComponentIndex(this.components, name);
    if (index < 0) throw new LensUIError(`component '${name}' is not saved`);
    this.components.splice(index, 1);
  }

  makeStyleDefinition(definition: LightStylePackDefinition): LightStylePackDefinition {
    const name = normalizeComponentName(definition.name);
    const aliases = (definition.aliases ?? []).map(normalizeComponentName);
    const source = definition.source.trim();
    if (!source) throw new LensUIError("style source is required");
    validateStylePackSource(source, this.styles);
    return {
      name,
      aliases,
      source: definition.source,
      options: { ...(definition.options ?? {}) },
      trust: definition.trust ?? "agent-generated"
    };
  }

  saveStyle(definition: LightStylePackDefinition): void {
    const normalized = this.makeStyleDefinition(definition);
    const key = normalized.name.toLowerCase();
    const index = this.styles.findIndex((style) => style.name.toLowerCase() === key);
    if (index >= 0) this.styles[index] = normalized;
    else this.styles.push(normalized);
  }

  patchStyle(name: string, offset: number, deleteCount: number, source = ""): LightStylePackDefinition {
    const index = findStyleIndex(this.styles, name);
    if (index < 0) throw new LensUIError(`style '${name}' is not saved`);
    const existing = this.styles[index];
    const patched = { ...existing, source: patchSource(existing.source, offset, deleteCount, source) };
    validateStylePackSource(patched.source, replaceStyleDefinition(this.styles, patched.name, patched));
    this.styles[index] = patched;
    return patched;
  }

  deleteStyle(name: string): void {
    const index = findStyleIndex(this.styles, name);
    if (index < 0) throw new LensUIError(`style '${name}' is not saved`);
    const deleted = this.styles[index];
    this.styles.splice(index, 1);
    if (this.defaultStyle?.toLowerCase() === deleted.name.toLowerCase()) this.defaultStyle = undefined;
  }

  setDefaultStyle(name?: string): void {
    const cleanName = name?.trim();
    if (!cleanName) {
      this.defaultStyle = undefined;
      return;
    }
    if (findStyleIndex(this.styles, cleanName) < 0 && !builtinStylePacks[cleanName]) {
      throw new LensUIError(`style '${cleanName}' is not saved`);
    }
    this.defaultStyle = cleanName;
  }

  apply(stream: string | LensCommandStream): LensApplyResult {
    const commandStream = typeof stream === "string" ? parseCommandStream(stream) : stream;
    const next = new LensUIWorkspace(this.lightcode, this.components, this.styles, this.defaultStyle);
    const result: LensApplyResult = {
      ok: true,
      changedLightcode: false,
      changedComponents: false,
      changedStyles: false,
      sourceUpdates: [],
      pageActions: [],
      metadata: emptyMetadata(),
      theme: defaultTheme()
    };
    for (const operation of commandStream.operations) {
      switch (operation.type) {
        case "render":
          next.replaceLightcode(operation.lightcode);
          result.changedLightcode = true;
          break;
        case "patch":
          next.patchLightcode(operation.offset, operation.delete, operation.lightcode);
          result.changedLightcode = true;
          break;
        case "registerComponent":
          next.saveComponent(operation.component);
          result.changedComponents = true;
          break;
        case "patchComponent":
          next.patchComponent(operation.name, operation.offset, operation.delete, operation.source);
          result.changedComponents = true;
          break;
        case "deleteComponent":
          next.deleteComponent(operation.name);
          result.changedComponents = true;
          break;
        case "registerStyle":
          next.saveStyle(operation.style);
          result.changedStyles = true;
          break;
        case "patchStyle":
          next.patchStyle(operation.name, operation.offset, operation.delete, operation.source);
          result.changedStyles = true;
          break;
        case "deleteStyle":
          next.deleteStyle(operation.name);
          result.changedStyles = true;
          break;
        case "setDefaultStyle":
          next.setDefaultStyle(operation.name);
          result.changedStyles = true;
          break;
        case "updateSource":
          result.sourceUpdates.push({ id: operation.id, contentType: operation.contentType, payload: operation.payload });
          break;
        case "page":
          result.pageActions.push(operation.action);
          break;
      }
    }
    this.lightcode = next.lightcode;
    this.components = next.components;
    this.styles = next.styles;
    this.defaultStyle = next.defaultStyle;
    return result;
  }

  readComponents(name?: string): string {
    const selected = name
      ? this.components.filter((component) => component.name.toLowerCase() === name.toLowerCase() || (component.aliases ?? []).some((alias) => alias.toLowerCase() === name.toLowerCase()))
      : this.components;
    if (!selected.length) return "(no saved components)";
    return selected.map((component) => {
      const aliases = component.aliases?.length ? `|aliases=${component.aliases.join(",")}` : "";
      const options = component.options && Object.keys(component.options).length
        ? `|options=${Object.entries(component.options).sort().map(([key, value]) => `${key}=${value}`).join(",")}`
        : "";
      return `component|${component.name}|kind=${component.kind}|trust=${component.trust ?? "agent-generated"}${aliases}${options}\n${numberedLines(component.source)}`;
    }).join("\n");
  }

  readStyles(name?: string): string {
    const selected = name
      ? this.styles.filter((style) => style.name.toLowerCase() === name.toLowerCase() || (style.aliases ?? []).some((alias) => alias.toLowerCase() === name.toLowerCase()))
      : this.styles;
    if (!selected.length) return "(no saved styles)";
    return selected.map((style) => {
      const aliases = style.aliases?.length ? `|aliases=${style.aliases.join(",")}` : "";
      const options = style.options && Object.keys(style.options).length
        ? `|options=${Object.entries(style.options).sort().map(([key, value]) => `${key}=${value}`).join(",")}`
        : "";
      const active = this.defaultStyle && (style.name.toLowerCase() === this.defaultStyle.toLowerCase() || (style.aliases ?? []).some((alias) => alias.toLowerCase() === this.defaultStyle?.toLowerCase())) ? "|default=1" : "";
      return `style|${style.name}|trust=${style.trust ?? "agent-generated"}${aliases}${options}${active}\n${numberedLines(style.source)}`;
    }).join("\n");
  }
}

export function parseLightcode(source: string, components: LensComponentDefinition[] = [], styles: LightStylePackDefinition[] = [], defaultStyle?: string): LightcodeParseResult {
  const root: LensNode = { component: "root", key: "root", args: [], props: {}, children: [] };
  const stack: LensNode[] = [root];
  const dataSources: LensDataSource[] = [];
  const registry = new Map<string, ComponentDefinition>(Object.entries(builtinAliases));
  registerSavedComponents(components, registry);
  const styleSheet = parseStyleSheet(source, styles, defaultStyle);
  const theme = styleSheet.theme;
  const lines = normalizeLines(source);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index].replace(/\s+$/g, "");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const { level, body } = parseDepthPrefixedLine(line, lineNumber);
    if (stack.length < level + 1) throw new LensUIError("depth jumps more than one level", lineNumber);
    const fields = splitFields(body);
    const rawName = fields[0];
    if (!rawName) throw new LensUIError("component name is required", lineNumber);
    if (isFrameDirectiveName(rawName)) {
      if (level !== 0) throw new LensUIError("frame directive must be top-level", lineNumber);
      continue;
    }
    if (isStyleDirectiveName(rawName) && level === 0) {
      parseStyleRecipe(fields, lineNumber);
      continue;
    }
    if (isComponentDefinitionName(rawName)) {
      if (level !== 0) throw new LensUIError("component definitions must be top-level", lineNumber);
      registerAliasComponent(fields, lineNumber, registry);
      continue;
    }
    if (rawName.toLowerCase() === "ds") {
      if (level !== 0) throw new LensUIError("data sources must be top-level", lineNumber);
      dataSources.push(parseDataSource(fields, lineNumber));
      continue;
    }
    const definition = registry.get(rawName);
    if (!definition) throw new LensUIError(`unknown component '${rawName}'`, lineNumber);
    const args = definition.args.slice();
    const props = { ...definition.props };
    for (const field of fields.slice(1)) {
      const prop = parseProp(field);
      if (prop) props[prop.key] = prop.value;
      else args.push(field);
    }
    while (stack.length > level + 1) stack.pop();
    const node: LensNode = {
      component: definition.component,
      key: nodeKey(props, lineNumber),
      args,
      props,
      children: [],
      htmlTemplate: definition.htmlTemplate,
      reactSource: definition.reactSource,
      reactExport: definition.reactExport
    };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return { root, dataSources, theme, styles: styleSheet };
}

export function collectBindings(root: LensNode, dataSources: LensDataSource[]): LensBinding[] {
  const sourceIDs = new Set(dataSources.map((source) => source.id));
  const bindings: LensBinding[] = [];
  const visit = (node: LensNode) => {
    node.args.forEach((value, index) => {
      const reference = bindingReference(value);
      if (!reference) return;
      if (!sourceIDs.has(reference.sourceID)) throw new LensUIError(`binding references unknown data source '${reference.sourceID}'`);
      bindings.push({ nodeKey: node.key, sourceID: reference.sourceID, path: reference.path, role: bindingRole(node.component, index) });
    });
    Object.entries(node.props).forEach(([key, value]) => {
      const reference = bindingReference(value);
      if (!reference) return;
      if (!sourceIDs.has(reference.sourceID)) throw new LensUIError(`binding references unknown data source '${reference.sourceID}'`);
      bindings.push({ nodeKey: node.key, sourceID: reference.sourceID, path: reference.path, role: bindingRole(node.component, undefined, key) });
    });
    node.children.forEach(visit);
  };
  visit(root);
  return bindings;
}

export function parseTheme(source: string, styles: LightStylePackDefinition[] = [], defaultStyle?: string): LensTheme {
  return parseStyleSheet(source, styles, defaultStyle).theme;
}

export function parseStyleSheet(source: string, styles: LightStylePackDefinition[] = [], defaultStyle?: string): LightStyleSheet {
  const sheet: LightStyleSheet = { theme: defaultTheme(), recipes: {} };
  const registry = styleRegistry(styles);
  if (defaultStyle) applyStylePack(defaultStyle, sheet, registry, new Set());
  for (const [index, raw] of normalizeLines(source).entries()) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const { level, body } = parseDepthPrefixedLine(raw.replace(/\s+$/g, ""), index + 1);
    if (level !== 0) continue;
    const fields = splitFields(body);
    const name = (fields[0] ?? "").toLowerCase();
    if (isFrameDirectiveName(name)) {
      applyFrameFields(fields, sheet, registry, index + 1);
      continue;
    }
    if (isStyleDirectiveName(name)) {
      const recipe = parseStyleRecipe(fields, index + 1);
      sheet.recipes[recipe.name] = recipe;
    }
  }
  syncThemeColors(sheet.theme);
  return sheet;
}

export function defaultTheme(): LensTheme {
  const light = palette({
    background: hsl(0, 0, 98),
    foreground: hsl(0, 0, 8),
    card: hsl(0, 0, 100),
    cardForeground: hsl(0, 0, 8),
    primary: hsl(0, 0, 10),
    primaryForeground: hsl(0, 0, 98),
    secondary: hsl(0, 0, 92),
    secondaryForeground: hsl(0, 0, 10),
    muted: hsl(0, 0, 90),
    mutedForeground: hsl(0, 0, 38),
    accent: hsl(0, 0, 86),
    accentForeground: hsl(0, 0, 8),
    destructive: hsl(0, 0, 20),
    destructiveForeground: hsl(0, 0, 98),
    border: hsl(0, 0, 72),
    input: hsl(0, 0, 72),
    ring: hsl(0, 0, 12),
    success: hsl(0, 0, 25),
    warning: hsl(0, 0, 34),
    surfaceRaised: hsl(0, 0, 96)
  });
  const dark = palette({
    background: hsl(0, 0, 3),
    foreground: hsl(0, 0, 94),
    card: hsl(0, 0, 7),
    cardForeground: hsl(0, 0, 94),
    primary: hsl(0, 0, 96),
    primaryForeground: hsl(0, 0, 4),
    secondary: hsl(0, 0, 11),
    secondaryForeground: hsl(0, 0, 92),
    muted: hsl(0, 0, 13),
    mutedForeground: hsl(0, 0, 62),
    accent: hsl(0, 0, 18),
    accentForeground: hsl(0, 0, 96),
    destructive: hsl(0, 0, 88),
    destructiveForeground: hsl(0, 0, 4),
    border: hsl(0, 0, 24),
    input: hsl(0, 0, 24),
    ring: hsl(0, 0, 96),
    success: hsl(0, 0, 82),
    warning: hsl(0, 0, 68),
    surfaceRaised: hsl(0, 0, 10)
  });
  return {
    ...dark,
    mode: "system",
    light,
    dark,
    radius: "0.5rem",
    stagePadding: "clamp(16px, 3vw, 32px)",
    backgroundEffect: "calm",
    shadow: "0 18px 60px rgb(0 0 0 / 0.24)",
    fontPreset: "modern",
    density: "compact"
  };
}

export function emptyMetadata(): LensRenderMetadata {
  return { dataSources: [], bindings: [] };
}

export function splitFields(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let escaping = false;
  for (const char of line) {
    if (escaping) {
      if (char === "n") current += "\n";
      else current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (char === "|") {
      fields.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (escaping) current += "\\";
  fields.push(current);
  return fields;
}

export function parseProp(field: string): { key: string; value: string } | undefined {
  const index = field.indexOf("=");
  if (index <= 0) return undefined;
  const key = field.slice(0, index).trim();
  if (!key) return undefined;
  return { key, value: field.slice(index + 1) };
}

export function bindingReference(value?: string): { sourceID: string; path: string } | undefined {
  if (!value?.startsWith("$")) return undefined;
  const tail = value.slice(1);
  const dot = tail.indexOf(".");
  if (dot <= 0 || dot >= tail.length - 1) return undefined;
  const sourceID = tail.slice(0, dot);
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(sourceID)) return undefined;
  return { sourceID, path: tail.slice(dot + 1) };
}

export function resolveBinding(value: string | undefined, sources: Record<string, unknown>, fallback = ""): string {
  const reference = bindingReference(value);
  if (!reference) return value ?? fallback;
  const source = sources[reference.sourceID];
  const resolved = resolvePath(source, reference.path);
  return resolved == null ? fallback : String(resolved);
}

export function resolvePath(source: unknown, path: string): unknown {
  if (source == null || !path) return source;
  let cursor: unknown = source;
  for (const part of path.split(".")) {
    if (cursor == null) return undefined;
    if (Array.isArray(cursor)) {
      const index = Number.parseInt(part, 10);
      cursor = Number.isFinite(index) ? cursor[index] : undefined;
      continue;
    }
    if (typeof cursor === "object") cursor = (cursor as Record<string, unknown>)[part];
    else return undefined;
  }
  return cursor;
}

function normalizeLines(source: string): string[] {
  return source.replace(/\r\n/g, "\n").split("\n");
}

function parseDepthPrefixedLine(line: string, lineNumber: number): { level: number; body: string } {
  if (/^\s/.test(line)) throw new LensUIError("lightcode lines must start with a depth token", lineNumber);
  const parsed = depthPrefixedBody(line);
  if (!parsed) throw new LensUIError("lightcode lines must start with a base36 depth token", lineNumber);
  if (!parsed.body) throw new LensUIError("component name is required after depth token", lineNumber);
  return parsed;
}

function depthPrefixedBody(line: string): { level: number; body: string } | undefined {
  const marker = line[0];
  if (!marker) return undefined;
  const level = /^[0-9]$/.test(marker)
    ? marker.charCodeAt(0) - 48
    : /^[a-z]$/.test(marker)
      ? marker.charCodeAt(0) - 87
      : Number.NaN;
  if (!Number.isFinite(level)) return undefined;
  return { level, body: line.slice(1) };
}

function requireFields(fields: string[], count: number, line: number, raw: string): void {
  if (fields.length < count) throw new LensUIError(`malformed command '${raw}'`, line);
}

function readBlock(lines: string[], start: number, command: string): { body: string; next: number } {
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i] === ".") return { body: body.join("\n"), next: i + 1 };
    body.push(lines[i] === "\\." ? "." : lines[i]);
  }
  throw new LensUIError(`unterminated block for command '${command}'`, start + 1);
}

function parseIntField(value: string, line: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) throw new LensUIError(`invalid integer '${value}'`, line);
  return parsed;
}

function parseOptions(raw: string): Record<string, string> {
  const options: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    options[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
  }
  return options;
}

function componentKind(value: string, line: number): LensComponentKind {
  switch (value.toLowerCase()) {
    case "a": case "alias": return "alias";
    case "h": case "html": return "html";
    case "r": case "react": return "react";
    case "s": case "swiftui": case "native": return "swiftui";
    default: throw new LensUIError(`invalid component kind '${value}'`, line);
  }
}

function componentTrust(value: string, line: number): LensComponentTrust {
  switch (value.toLowerCase()) {
    case "b": case "built-in": return "built-in";
    case "u": case "user-saved": return "user-saved";
    case "g": case "agent-generated": return "agent-generated";
    case "m": case "remote-imported": return "remote-imported";
    default: throw new LensUIError(`invalid component trust '${value}'`, line);
  }
}

function patchSource(source: string, offset: number, deleteCount: number, insert = ""): string {
  const lines = source.split("\n");
  const maxOffset = lines.length + 1;
  if (offset < 1 || offset > maxOffset) throw new LensUIError(`patch offset ${offset} must be between 1 and ${maxOffset}`);
  if (deleteCount < 0) throw new LensUIError("patch delete count must be 0 or greater");
  if (offset - 1 + deleteCount > lines.length) throw new LensUIError("patch range exceeds document");
  const insertLines = insert.replace(/\r\n/g, "\n").replace(/\n+$/g, "").split("\n").filter((_, index, arr) => !(arr.length === 1 && arr[0] === ""));
  lines.splice(offset - 1, deleteCount, ...insertLines);
  return lines.join("\n");
}

function numberedLines(source: string): string {
  return source.split("\n").map((line, index) => `${String(index + 1).padStart(5, " ")}\t${line}`).join("\n") + "\n";
}

function normalizeComponentName(value: string): string {
  const name = value.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new LensUIError(`invalid component name '${value}'`);
  return name;
}

function isComponentDefinitionSource(source: string): boolean {
  const first = source.split("\n")[0] ?? "";
  const code = depthPrefixedBody(first)?.body.split("|")[0]?.toLowerCase() ?? "";
  return ["@", "def", "alias", "component", "cmp"].includes(code);
}

function aliasDefinitionBody(source: string): string {
  const lines = normalizeLines(source).map((line) => line.replace(/\s+$/g, "")).filter((line) => line.trim());
  if (lines.length !== 1) throw new LensUIError("alias source must be one depth-prefixed node or a 0@ definition");
  return parseDepthPrefixedLine(lines[0], 1).body;
}

function findComponentIndex(components: LensComponentDefinition[], name: string): number {
  const key = name.trim().toLowerCase();
  return components.findIndex((component) => component.name.toLowerCase() === key || (component.aliases ?? []).some((alias) => alias.toLowerCase() === key));
}

function isFrameDirectiveName(name: string): boolean {
  return ["f", "frame", "theme"].includes(name.toLowerCase());
}

function isStyleDirectiveName(name: string): boolean {
  return ["y", "style", "recipe"].includes(name.toLowerCase());
}

function isComponentDefinitionName(name: string): boolean {
  return ["@", "def", "alias", "component", "cmp"].includes(name.toLowerCase());
}

function registerSavedComponents(components: LensComponentDefinition[], registry: Map<string, ComponentDefinition>): void {
  for (const component of components) {
    if (component.kind === "alias") {
      for (const [index, raw] of normalizeLines(component.source).entries()) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const { body } = parseDepthPrefixedLine(raw.replace(/\s+$/g, ""), index + 1);
        const fields = splitFields(body);
        if (!isComponentDefinitionName(fields[0])) throw new LensUIError("saved alias component must use @|name|base", index + 1);
        registerAliasComponent(fields, index + 1, registry);
      }
      continue;
    }
    for (const name of [component.name, ...(component.aliases ?? [])].filter(Boolean)) {
      if (!isValidComponentName(name)) throw new LensUIError(`invalid component alias '${name}'`);
      if (registry.has(name) || isComponentDefinitionName(name)) throw new LensUIError(`component alias '${name}' is already registered`);
      if (component.kind === "react") registry.set(name, { component: "react", args: [], props: {}, reactSource: component.source, reactExport: component.options?.export ?? "default" });
      else if (component.kind === "swiftui") registry.set(name, { component: "swiftui", args: [], props: {}, htmlTemplate: component.source, reactExport: component.options?.view ?? component.options?.export });
      else registry.set(name, { component: "customHTML", args: [], props: {}, htmlTemplate: component.source });
    }
  }
}

function registerAliasComponent(fields: string[], line: number, registry: Map<string, ComponentDefinition>): void {
  if (fields.length < 3) throw new LensUIError("component definition requires name and base", line);
  const names = fields[1].split(",").map((name) => name.trim()).filter(Boolean);
  if (!names.length) throw new LensUIError("component definition name is required", line);
  const base = registry.get(fields[2]);
  if (!base) throw new LensUIError(`unknown base component '${fields[2]}'`, line);
  const args = base.args.slice();
  const props = { ...base.props };
  for (const field of fields.slice(3)) {
    const prop = parseProp(field);
    if (prop) props[prop.key] = prop.value;
    else args.push(field);
  }
  for (const name of names) {
    if (!isValidComponentName(name)) throw new LensUIError(`invalid component alias '${name}'`, line);
    if (registry.has(name) || isComponentDefinitionName(name)) throw new LensUIError(`component alias '${name}' is already registered`, line);
    registry.set(name, { ...base, args, props });
  }
}

function parseDataSource(fields: string[], line: number): LensDataSource {
  if (fields.length < 3) throw new LensUIError("data source requires id and url", line);
  const id = fields[1].trim();
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(id)) throw new LensUIError(`invalid data source id '${id}'`, line);
  let url: URL;
  try {
    url = new URL(fields[2]);
  } catch {
    throw new LensUIError("data source url must be http(s)", line);
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new LensUIError("data source url must be http(s)", line);
  let ttl = 600;
  let mode: LensLiveMode = "poll";
  for (const field of fields.slice(3)) {
    const prop = parseProp(field);
    if (prop) {
      if (["ttl", "poll", "poll_sec", "poll-sec"].includes(prop.key) && Number(prop.value) > 0) ttl = Number(prop.value);
      if (prop.key === "mode" && ["once", "poll", "stream"].includes(prop.value)) mode = prop.value as LensLiveMode;
      continue;
    }
    if (Number(field) > 0) ttl = Number(field);
    else if (["once", "poll", "stream"].includes(field)) mode = field as LensLiveMode;
  }
  return { id, url: url.toString(), ttl, mode };
}

const builtinStylePacks: Record<string, string> = {
  neutral: "0F|mode=system|f=modern|d=compact|r=8|fx=calm\n0Y|panel|bg=card|bd=br|p=5|r=8\n0Y|cta|bg=fg|fg=bg|bd=fg|p=3|caps=1|mono=1",
  mono: "0F|mode=system|f=mono|d=compact|r=2|fx=grid|sh=none\n0Y|panel|bg=card|bd=fg/32|p=4|r=2\n0Y|cta|bg=fg|fg=bg|bd=fg|p=3|r=2|caps=1|mono=1|sh=hard\n0Y|soft|bg=muted/55|bd=fg/18|p=3|r=2",
  studio: "0F|mode=system|f=modern|d=compact|r=8|fx=calm|light-bg=204,36,97|light-fg=220,22,10|light-card=0,0,100|light-cf=220,22,10|light-s=199,36,92|light-sf=220,22,12|light-m=205,28,90|light-mf=218,12,42|light-raised=0,0,100|light-p=188,78,38|light-a=156,58,36|light-bad=4,72,48|light-br=202,26,76|light-ring=188,78,38|dark-bg=222,22,6|dark-fg=210,22,96|dark-card=222,18,10|dark-cf=210,22,96|dark-s=222,15,14|dark-sf=210,20,94|dark-m=222,14,16|dark-mf=214,12,68|dark-raised=222,16,12|dark-p=190,82,56|dark-a=158,72,50|dark-bad=4,76,58|dark-br=218,20,30|dark-ring=190,82,56|sh=glow\n0Y|panel|bg=card/94|bd=p/28|p=5|r=8|sh=soft\n0Y|cta|bg=p|fg=bg|bd=p|p=3|r=8|caps=1|mono=1|sh=glow\n0Y|soft|bg=p/10|bd=p/26|p=3|r=8\n0Y|badge|bg=p/14|fg=fg|bd=p/34|p=2|r=8|caps=1|mono=1",
  paper: "0F|mode=system|f=system|d=air|r=8|fx=none|light-bg=42,40,96|light-fg=222,18,12|light-card=0,0,100|light-cf=222,18,12|light-s=40,26,90|light-sf=222,18,12|light-m=40,22,88|light-mf=222,10,40|light-raised=0,0,100|light-p=222,68,42|light-a=158,54,36|light-bad=4,72,48|light-br=40,20,78|light-ring=222,68,42|dark-bg=42,18,8|dark-fg=44,35,92|dark-card=42,18,12|dark-cf=44,35,92|dark-s=42,18,18|dark-sf=44,34,90|dark-m=42,15,20|dark-mf=42,12,68|dark-raised=42,18,15|dark-p=214,78,68|dark-a=154,52,58|dark-bad=4,76,62|dark-br=42,18,30|dark-ring=214,78,68|sh=soft\n0Y|panel|bg=card|bd=br|p=5|r=8|sh=soft\n0Y|cta|bg=p|fg=bg|bd=p|p=3|r=8|caps=1|mono=1\n0Y|soft|bg=muted|bd=br|p=3|r=8",
  gallery: "0F|mode=system|f=modern|d=air|r=10|fx=none|light-bg=36,20,97|light-fg=220,18,10|light-card=0,0,100|light-cf=220,18,10|light-s=36,18,91|light-sf=220,18,12|light-m=36,16,89|light-mf=220,10,42|light-raised=0,0,100|light-p=220,72,44|light-a=158,58,38|light-bad=4,72,48|light-br=36,14,76|light-ring=220,72,44|dark-bg=0,0,4|dark-fg=0,0,94|dark-card=0,0,8|dark-cf=0,0,94|dark-s=0,0,12|dark-sf=0,0,92|dark-m=0,0,14|dark-mf=0,0,64|dark-raised=0,0,10|dark-p=0,0,96|dark-a=190,70,58|dark-bad=4,76,58|dark-br=0,0,26|dark-ring=0,0,96|sh=soft\n0Y|panel|bg=card/72|bd=br/55|p=5|r=10\n0Y|caption|fg=muted|p=2|mono=1|caps=1",
  terminal: "0F|mode=system|f=mono|d=tight|r=0|fx=grid|light-bg=0,0,98|light-fg=0,0,5|light-card=0,0,100|light-cf=0,0,5|light-s=0,0,92|light-sf=0,0,6|light-m=0,0,90|light-mf=0,0,36|light-raised=0,0,96|light-p=0,0,5|light-pf=0,0,98|light-a=0,0,18|light-bad=0,0,24|light-br=0,0,28|light-ring=0,0,5|dark-bg=0,0,3|dark-fg=0,0,94|dark-card=0,0,5|dark-cf=0,0,94|dark-s=0,0,10|dark-sf=0,0,92|dark-m=0,0,12|dark-mf=0,0,62|dark-raised=0,0,8|dark-p=0,0,96|dark-pf=0,0,4|dark-a=0,0,18|dark-bad=0,0,88|dark-br=0,0,35|dark-ring=0,0,96|sh=none\n0Y|panel|bg=bg|bd=fg/35|p=3|r=0\n0Y|cta|bg=fg|fg=bg|bd=fg|p=2|r=0|caps=1|mono=1"
};

function styleRegistry(styles: LightStylePackDefinition[]): Map<string, LightStylePackDefinition> {
  const registry = new Map<string, LightStylePackDefinition>();
  Object.entries(builtinStylePacks).forEach(([name, source]) => {
    registry.set(name.toLowerCase(), { name, aliases: [], source, trust: "built-in" });
  });
  for (const style of styles) {
    for (const name of [style.name, ...(style.aliases ?? [])].filter(Boolean)) {
      registry.set(name.toLowerCase(), style);
    }
  }
  return registry;
}

function applyFrameFields(fields: string[], sheet: LightStyleSheet, registry: Map<string, LightStylePackDefinition>, line: number): void {
  for (const field of fields.slice(1)) {
    if (field === "0") continue;
    const prop = parseProp(field);
    if (!prop) {
      applyStylePack(field, sheet, registry, new Set(), line);
      continue;
    }
    if (["st", "style", "pack"].includes(prop.key)) {
      applyStylePack(prop.value, sheet, registry, new Set(), line);
    } else {
      applyThemeToken(sheet.theme, prop.key, prop.value);
    }
  }
}

function applyStylePack(name: string, sheet: LightStyleSheet, registry: Map<string, LightStylePackDefinition>, seen: Set<string>, line = 1): void {
  const clean = name.trim();
  if (!clean) return;
  const style = registry.get(clean.toLowerCase());
  if (!style) throw new LensUIError(`unknown style pack '${name}'`, line);
  const key = style.name.toLowerCase();
  if (seen.has(key)) throw new LensUIError(`style pack cycle involving '${style.name}'`, line);
  seen.add(key);
  sheet.activeStyle = style.name;
  for (const [index, raw] of normalizeLines(style.source).entries()) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const { level, body } = parseDepthPrefixedLine(raw.replace(/\s+$/g, ""), index + 1);
    if (level !== 0) throw new LensUIError("style pack lines must be top-level", index + 1);
    const fields = splitFields(body);
    const directive = (fields[0] ?? "").toLowerCase();
    if (isFrameDirectiveName(directive)) {
      for (const field of fields.slice(1)) {
        if (field === "0") continue;
        const prop = parseProp(field);
        if (!prop) applyStylePack(field, sheet, registry, seen, index + 1);
        else if (["st", "style", "pack"].includes(prop.key)) applyStylePack(prop.value, sheet, registry, seen, index + 1);
        else applyThemeToken(sheet.theme, prop.key, prop.value);
      }
      continue;
    }
    if (isStyleDirectiveName(directive)) {
      const recipe = parseStyleRecipe(fields, index + 1);
      sheet.recipes[recipe.name] = recipe;
      continue;
    }
    throw new LensUIError(`unknown style pack directive '${fields[0]}'`, index + 1);
  }
  seen.delete(key);
}

function parseStyleRecipe(fields: string[], line: number): LightStyleRecipe {
  if (fields.length < 2) throw new LensUIError("style recipe requires a name", line);
  const name = normalizeComponentName(fields[1]);
  const props: Record<string, string> = {};
  for (const field of fields.slice(2)) {
    const prop = parseProp(field);
    if (prop) props[prop.key] = prop.value;
  }
  return { name, props };
}

function validateStylePackSource(source: string, styles: LightStylePackDefinition[] = []): void {
  for (const [index, raw] of normalizeLines(source).entries()) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const { level, body } = parseDepthPrefixedLine(raw.replace(/\s+$/g, ""), index + 1);
    if (level !== 0) throw new LensUIError("style pack lines must be top-level", index + 1);
    const fields = splitFields(body);
    if (!isFrameDirectiveName(fields[0]) && !isStyleDirectiveName(fields[0])) {
      throw new LensUIError(`unknown style pack directive '${fields[0]}'`, index + 1);
    }
  }
  parseStyleSheet(`0F|0\n${source}`, styles);
}

function findStyleIndex(styles: LightStylePackDefinition[], name: string): number {
  const key = name.trim().toLowerCase();
  return styles.findIndex((style) => style.name.toLowerCase() === key || (style.aliases ?? []).some((alias) => alias.toLowerCase() === key));
}

function replaceStyleDefinition(styles: LightStylePackDefinition[], name: string, definition: LightStylePackDefinition): LightStylePackDefinition[] {
  const key = name.toLowerCase();
  const next = styles.filter((style) => style.name.toLowerCase() !== key);
  next.push(definition);
  return next;
}

function nodeKey(props: Record<string, string>, line: number): string {
  const raw = props.key ?? props.id ?? `n${line}`;
  const sanitized = raw.replace(/[^A-Za-z0-9_-]/g, "_").replace(/^_+|_+$/g, "");
  return sanitized || `n${line}`;
}

function bindingRole(component: LensNodeComponent, argIndex?: number, propKey?: string): LensBindingRole {
  if (propKey && ["src", "img", "image", "poster", "url", "href"].includes(propKey)) {
    return component === "webview" ? "webViewURL" : "mediaSource";
  }
  if (component === "chart") return "chartData";
  if (["newsList", "sourceStrip", "timeline", "comparison", "memoryProfile", "steps", "mosaic"].includes(component)) return "repeaterItems";
  if (["image", "video", "mediaStrip"].includes(component)) return "mediaSource";
  if (component === "webview") return "webViewURL";
  return argIndex == null ? "attribute" : "text";
}

function hsl(h: number, s: number, l: number): HSL {
  return { h, s, l };
}

function palette(colors: LensThemePalette): LensThemePalette {
  return {
    background: { ...colors.background },
    foreground: { ...colors.foreground },
    card: { ...colors.card },
    cardForeground: { ...colors.cardForeground },
    primary: { ...colors.primary },
    primaryForeground: { ...colors.primaryForeground },
    secondary: { ...colors.secondary },
    secondaryForeground: { ...colors.secondaryForeground },
    muted: { ...colors.muted },
    mutedForeground: { ...colors.mutedForeground },
    accent: { ...colors.accent },
    accentForeground: { ...colors.accentForeground },
    destructive: { ...colors.destructive },
    destructiveForeground: { ...colors.destructiveForeground },
    border: { ...colors.border },
    input: { ...colors.input },
    ring: { ...colors.ring },
    success: { ...colors.success },
    warning: { ...colors.warning },
    surfaceRaised: { ...colors.surfaceRaised }
  };
}

function syncThemeColors(theme: LensTheme): void {
  const colors = theme.mode === "light" ? theme.light : theme.dark;
  Object.assign(theme, palette(colors));
}

type ThemePaletteTarget = "both" | "light" | "dark";
type ThemeColorKey = keyof LensThemePalette;

function setHSL(colors: LensThemePalette, key: ThemeColorKey, value: string): boolean {
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return false;
  colors[key] = hsl(parts[0], parts[1], parts[2]);
  return true;
}

function applyThemeToken(theme: LensTheme, key: string, value: string): void {
  const rawKey = key.toLowerCase();
  if (["mode", "scheme", "color-mode", "color-scheme"].includes(rawKey)) {
    if (["system", "light", "dark"].includes(value)) theme.mode = value as LensColorMode;
    syncThemeColors(theme);
    return;
  }
  const scoped = paletteScopedKey(rawKey);
  const tokenKey = scoped.key;
  const map: Record<string, ThemeColorKey> = {
    b: "background", bg: "background", back: "background",
    fg: "foreground", text: "foreground",
    c: "card", card: "card", surface: "card",
    cf: "cardForeground",
    p: "primary", pri: "primary", primary: "primary",
    pf: "primaryForeground",
    s: "secondary", sec: "secondary",
    sf: "secondaryForeground",
    m: "muted", mut: "muted",
    mf: "mutedForeground",
    a: "accent", accent: "accent", v: "accent",
    af: "accentForeground",
    bad: "destructive", danger: "destructive", destructive: "destructive",
    df: "destructiveForeground",
    br: "border", border: "border",
    i: "input", input: "input",
    ring: "ring", ok: "success", success: "success",
    w: "warning", warn: "warning", warning: "warning",
    raised: "surfaceRaised"
  };
  if (map[tokenKey]) {
    setThemeColor(theme, map[tokenKey], value, scoped.target);
    if (["br", "border"].includes(tokenKey)) setThemeColor(theme, "input", value, scoped.target);
    syncThemeColors(theme);
    return;
  }
  if (["r", "rad", "radius"].includes(rawKey)) theme.radius = cssLength(value, theme.radius);
  if (rawKey === "pad") theme.stagePadding = paddingPreset(value);
  if (["bgfx", "fx"].includes(rawKey)) theme.backgroundEffect = cleanIdentifier(value, theme.backgroundEffect);
  if (["sh", "shadow"].includes(rawKey)) theme.shadow = shadowPreset(value);
  if (["f", "font", "type"].includes(rawKey)) theme.fontPreset = cleanIdentifier(value, theme.fontPreset);
  if (["d", "density"].includes(rawKey)) {
    theme.density = cleanIdentifier(value, theme.density);
    theme.stagePadding = densityPadding(value, theme.stagePadding);
  }
}

function paletteScopedKey(key: string): { target: ThemePaletteTarget; key: string } {
  const scoped = /^(light|dark)[-.:_](.+)$/.exec(key);
  if (scoped) return { target: scoped[1] as "light" | "dark", key: scoped[2] };
  return { target: "both", key };
}

function setThemeColor(theme: LensTheme, key: ThemeColorKey, value: string, target: ThemePaletteTarget): void {
  if (target === "both" || target === "light") setHSL(theme.light, key, value);
  if (target === "both" || target === "dark") setHSL(theme.dark, key, value);
}

function cssLength(value: string, fallback: string): string {
  if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(value)) return value;
  const number = Number(value);
  return Number.isFinite(number) ? `${number}px` : fallback;
}

function paddingPreset(value: string): string {
  switch (value) {
    case "0": case "none": return "0px";
    case "sm": return "clamp(12px, 2vw, 20px)";
    case "lg": return "clamp(24px, 4vw, 48px)";
    default: return cssLength(value, "clamp(16px, 3vw, 32px)");
  }
}

function densityPadding(value: string, fallback: string): string {
  switch (value) {
    case "tight": return "clamp(10px, 1.5vw, 18px)";
    case "compact": return "clamp(16px, 3vw, 32px)";
    case "air": return "clamp(24px, 4vw, 52px)";
    case "hero": return "clamp(32px, 6vw, 72px)";
    default: return fallback;
  }
}

function shadowPreset(value: string): string {
  switch (value) {
    case "0": case "none": return "none";
    case "soft": return "0 18px 60px rgb(0 0 0 / 0.24)";
    case "glow": return "0 0 44px hsl(var(--primary) / 0.18)";
    default: return value;
  }
}

function cleanIdentifier(value: string, fallback: string): string {
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : fallback;
}

function isValidComponentName(name: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(name);
}

function defaultLightcode(): string {
  return `0F|st=mono
0V|Ready|Agent-rendered interface|align=center|justify=center|width=lg
1X|shader|ready|height=260
1G|cols=3|gap=sm
2B|Semantic lightcode
2B|Live sources
2B|Patchable UI
1T|Render compact visual answers through the host application.|muted=true|align=center`;
}
