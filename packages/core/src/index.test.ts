import { describe, expect, it } from "vitest";
import { LensUIWorkspace, collectBindings, normalizeSavedRegistry, parseLightcode, parseCommandStream } from "./index";

describe("@lensui/core", () => {
  it("parses compact command streams", () => {
    const stream = parseCommandStream(`!
@!|KPI|A|g
0M|tone=success
.
Y!|MonoCompact|g|aliases=A8
0F|f=mono|d=compact|r=2|fx=grid
0Y|panel|bg=card|bd=fg/28|p=4|r=2
.
R
0F|st=MonoCompact
0V|Demo
1KPI|Cost|12
.
^|3|1
1KPI|Cost|14
.
S|news|application/json
{"headline":"hi"}
.
P|next`);

    expect(stream.operations.map((op) => op.type)).toEqual([
      "registerComponent",
      "registerStyle",
      "render",
      "patch",
      "updateSource",
      "page"
    ]);
  });

  it("applies command streams to workspace state", () => {
    const workspace = new LensUIWorkspace();
    workspace.apply(`!
@!|KPI|A|g
0M|tone=success
.
Y!|MonoCompact|g
0F|f=mono|d=compact|r=2|fx=grid
0Y|panel|bg=card|bd=fg/28|p=4|r=2
.
Y*|MonoCompact
R
0F|st=MonoCompact
0V|Demo
1KPI|Cost|12
.`);

    expect(workspace.lightcode).toContain("KPI|Cost|12");
    expect(workspace.readComponents("KPI")).toContain("0@|KPI|M|tone=success");
    expect(workspace.readStyles("MonoCompact")).toContain("0Y|panel|bg=card");
    expect(workspace.defaultStyle).toBe("MonoCompact");
  });

  it("normalizes saved registries for persistent adapters", () => {
    const registry = normalizeSavedRegistry({
      components: [
        { name: "KPI", kind: "alias", trust: "agent-generated", source: "0M|tone=success" },
        { name: "Bad Name", kind: "alias", source: "0M" }
      ],
      styles: [
        { name: "MonoCompact", trust: "user-saved", source: "0F|f=mono|d=compact|r=2\n0Y|panel|bg=card|bd=fg/28|p=4|r=2" },
        { name: "Broken", source: "" }
      ],
      defaultStyle: "MonoCompact"
    });

    expect(registry.components).toHaveLength(1);
    expect(registry.components[0]?.source).toContain("0@|KPI|M|tone=success");
    expect(registry.styles).toHaveLength(1);
    expect(registry.defaultStyle).toBe("MonoCompact");

    const workspace = new LensUIWorkspace(`0F|st=MonoCompact
0V|Market
1KPI|BTC|$100`);
    workspace.loadRegistry(registry);
    expect(() => parseLightcode(workspace.lightcode, workspace.components, workspace.styles, workspace.defaultStyle)).not.toThrow();
  });

  it("extracts data sources and bindings", () => {
    const parsed = parseLightcode(`0DS|news|https://example.com/feed.json|ttl=30|mode=poll
0DS|ticks|wss://example.com/market|mode=stream
0V|$news.headline
1M|Trend|$news.trend
1NL|Latest||$news.items
1OB|BTC/USD|$ticks.spread|items=$ticks.book
1J|$news.image|Lead`);

    expect(parsed.dataSources[0]).toMatchObject({ id: "news", ttl: 30, mode: "poll" });
    expect(parsed.dataSources[1]).toMatchObject({ id: "ticks", url: "wss://example.com/market", mode: "stream" });
    expect(collectBindings(parsed.root, parsed.dataSources)).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceID: "ticks", path: "book", role: "repeaterItems" }),
      expect.objectContaining({ sourceID: "ticks", path: "spread", role: "repeaterItems" })
    ]));
  });

  it("parses inline style recipes and saved style packs", () => {
    const parsed = parseLightcode(`0F|st=mono|p=210,50,52
0Y|panel|bg=card|bd=fg/28|p=4|r=2
0V|Styled
1C|Panel|Recipe|s=panel`);

    expect(parsed.theme.mode).toBe("system");
    expect(parsed.theme.fontPreset).toBe("mono");
    expect(parsed.theme.primary).toEqual({ h: 210, s: 50, l: 52 });
    expect(parsed.theme.light.primary).toEqual({ h: 210, s: 50, l: 52 });
    expect(parsed.theme.dark.primary).toEqual({ h: 210, s: 50, l: 52 });
    expect(parsed.styles.recipes.panel?.props.bd).toBe("fg/28");

    const studio = parseLightcode("0F|st=studio");
    expect(studio.theme.fontPreset).toBe("modern");
    expect(studio.theme.mode).toBe("system");
    expect(studio.theme.light.background).toEqual({ h: 204, s: 36, l: 97 });
    expect(studio.theme.background).toEqual({ h: 222, s: 22, l: 6 });
    expect(studio.theme.primary).toEqual({ h: 190, s: 82, l: 56 });
    expect(studio.styles.recipes.cta?.props.bg).toBe("p");

    const lightStudio = parseLightcode("0F|st=studio|mode=light");
    expect(lightStudio.theme.background).toEqual({ h: 204, s: 36, l: 97 });
    expect(lightStudio.theme.primary).toEqual({ h: 188, s: 78, l: 38 });

    const custom = parseLightcode("0F|mode=light|light-bg=10,20,96|dark-bg=220,20,5|fg=0,0,10");
    expect(custom.theme.background).toEqual({ h: 10, s: 20, l: 96 });
    expect(custom.theme.light.foreground).toEqual({ h: 0, s: 0, l: 10 });
    expect(custom.theme.dark.background).toEqual({ h: 220, s: 20, l: 5 });
  });

  it("does not treat literal dollar amounts as bindings", () => {
    expect(() => parseLightcode("0V|Revenue\n1M|MRR|$28.40|ready")).not.toThrow();
  });

  it("rejects invalid lightcode", () => {
    expect(() => parseLightcode("0Nope|x")).toThrow("unknown component");
    expect(() => parseLightcode("0DS|bad|file:///tmp/x")).toThrow("network URL");
    expect(() => parseLightcode("0V|Bad\n2M|Jump|1")).toThrow("depth jumps");
    expect(() => parseLightcode(" V|Bad")).toThrow("depth token");
  });
});
