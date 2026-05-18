import { describe, expect, it } from "vitest";
import { LensHTMLRenderer } from "./index";

describe("@lensui/html", () => {
  it("renders the default ready surface with adaptive primitives", () => {
    const result = new LensHTMLRenderer().render("");

    expect(result.html).toContain("Ready");
    expect(result.html).toContain("Semantic lightcode");
    expect(result.html).toContain(`data-lens-adaptive-grid`);
    expect(result.html).toContain(`data-min-cell-width="150"`);
    expect(result.html).toContain(`data-max-cols="3"`);
  });

  it("renders core built-ins and metadata", () => {
    const result = new LensHTMLRenderer().render(`0DS|news|https://example.com/feed.json|ttl=60
0F|0|ok=120,50,50
0V|Pulse|Now
1G|cols=2
2M|Cost|128|usd|tone=success
2H|line|1,2,3
1C|Sources
2Q
3K|Name|Status
3r|Runtime|ok
1WV|yt|story so far covers|play=1
1X|shader|ready
1VV|network|Relations
1NL|Latest||$news.items`);

    expect(result.html).toContain("lens-stage-root");
    expect(result.html).toContain("Pulse");
    expect(result.html).toContain("data-lens-webview-url");
    expect(result.html).toContain("data-lens-scene");
    expect(result.html).toContain("data-vector-kind");
    expect(result.metadata.dataSources[0]?.id).toBe("news");
    expect(result.metadata.bindings.some((binding) => binding.sourceID === "news")).toBe(true);
    expect(result.theme.success).toEqual({ h: 120, s: 50, l: 50 });
  });

  it("renders custom html components as raw HTML templates", () => {
    const result = new LensHTMLRenderer().render("0V|Custom\n1Tile|Hello", [
      {
        name: "Tile",
        kind: "html",
        trust: "agent-generated",
        source: "<section onclick=\"bad()\">{{0}}<script>bad()</script></section>"
      }
    ]);

    expect(result.html).toContain("<section");
    expect(result.html).toContain("Hello");
    expect(result.html).toContain("<script>");
    expect(result.html).toContain("onclick");
  });

  it("honors documented adaptive grids and unresolved live repeaters", () => {
    const result = new LensHTMLRenderer().render(`0DS|news|https://example.com/feed.json
0V|Contracts
1G|auto|min=180|max=3
2M|A|1
1NL|Latest||$news.items`);

    expect(result.html).toContain("data-lens-adaptive-grid");
    expect(result.html).toContain(`data-min-cell-width="180"`);
    expect(result.html).toContain("No stories yet");
    expect(result.html).not.toContain("$news.items");
  });

  it("emits container-adaptive markup for fixed grids and semantic internals", () => {
    const result = new LensHTMLRenderer().render(`0V|Adaptive Surface|Unknown viewport
1G|cols=3|min=150
2M|Latency|96ms|p95
2M|Tokens|-64%|vs React
2M|Sources|live|bound
1WX|Local|68F|Clear|hi=72|lo=61|wind=8mph|hum=42%
1CP|Options|Container aware|items=Built-ins^default^Metrics, charts, media^success;Saved^when needed^Custom JS^warning
1MO|Media||items=https://example.com/a.jpg^A^Frame;https://example.com/b.jpg^B^Frame
1U|Strip||items=https://example.com/c.jpg^C^Clip
1Y|0
2TB|A
3T|Alpha
2TB|B
3T|Beta`);

    expect(result.html).toContain(`data-grid-mode="fixed"`);
    expect(result.html).toContain(`data-min-cell-width="150"`);
    expect(result.html).toContain(`data-max-cols="3"`);
    expect(result.html).toContain(`data-lens-repeat="comparison"`);
    expect(result.html).toContain(`data-lens-repeat="mosaic"`);
    expect(result.html).toContain(`data-lens-media-strip`);
    expect(result.html).toContain(`min-width:min(220px, 100%)`);
    expect(result.html).not.toContain("grid-cols-3");
    expect(result.html).not.toContain("min-w-[220px]");
  });

  it("renders token-efficient compact rows for semantic built-ins", () => {
    const result = new LensHTMLRenderer().render(`0F|0
0V|Specimens|Compact rows
1SC|Sources|Live refs|items=Docs^https://example.com^now^ok^Protocol
1TL|Flow|Today|items=09:00^Capture^Voice accepted^done;09:05^Build^Stage updated^active
1CP|Options|Tradeoffs|items=Lightcode^46 tokens^Semantic surface^success;HTML^520 tokens^DOM noise^warning
1ST|Readiness|Ship path|items=Source^done^Snapshot saved;Transform^active^Checking rows
1MM|Memory|Profile|items=Pref^monochrome^Use restrained styling^user^high
1MO|Media|Storyboard|items=https://example.com/a.png^A^Frame one;https://example.com/b.png^B^Frame two
1U|Rail|Compact media|items=https://example.com/c.png^C^Clip
1Q|Usage|cols=Tool^State|items=render^ready;patch^ready
1Z
1N|Continue`);

    expect(result.html).toContain("Protocol");
    expect(result.html).toContain("Capture");
    expect(result.html).toContain("46 tokens");
    expect(result.html).toContain("Snapshot saved");
    expect(result.html).toContain("monochrome");
    expect(result.html).toContain("Frame one");
    expect(result.html).toContain("Clip");
    expect(result.html).toContain("render");
    expect(result.html).toContain("data-lens-component=\"separator\"");
    expect(result.html).toContain("Continue");
  });

  it("preserves original media colors regardless of frame theme", () => {
    const result = new LensHTMLRenderer().render(`0F|0|p=0,0,100|fg=0,0,95|card=0,0,4
0V|Media|Original colors
1J|https://example.com/a.jpg|Photo|caption
1W|https://example.com/b.mp4||clip
1NL|Latest||items=Story^Source^now^Summary^https://example.com/story.jpg
1MO|Mosaic||items=https://example.com/c.jpg^C^cap;https://example.com/d.mp4^D^clip^video`);

    expect(result.html).toContain("https://example.com/a.jpg");
    expect(result.html).toContain("https://example.com/b.mp4");
    expect(result.html).not.toContain("grayscale");
    expect(result.html).not.toContain("filter:");
  });

  it("renders secondary primitives for editable demo coverage", () => {
    const result = new LensHTMLRenderer().render(`0F|st=terminal
0V|Primitive Lab|Editable examples
1S|gap=3
2R|Operational Notes|level=2
2MD|**Bold** runtime note with [docs](https://example.com)
2A|Invalid patch rejected|Previous UI remains visible|tone=warning
2P|64|token budget
2L|Lens User
2WX|Local|68F|Clear|hi=72|lo=61|wind=8mph|hum=42%
2ND|Runtime ships|LensUI|Detailed story body|now|https://example.com/news.png
2D
3O|First
4T|Page one
3O|Second
4T|Page two
2E|No more rows`);

    expect(result.html).toContain("Operational Notes");
    expect(result.html).toContain("runtime note");
    expect(result.html).toContain("Invalid patch rejected");
    expect(result.html).toContain("64%");
    expect(result.html).toContain("LE");
    expect(result.html).toContain("68F");
    expect(result.html).toContain("Runtime ships");
    expect(result.html).toContain("data-lens-deck");
    expect(result.html).toContain("No more rows");
  });

  it("covers alternate branches for semantic renderers", () => {
    const result = new LensHTMLRenderer().render(`0F|st=paper
0V|Branch Lab|Renderer variants|align=right|justify=start|width=sm
1R|Top Heading|level=1
1T|Muted right copy|muted=true|align=right
1B|Badge|tone=warning
1A|Heads up
1C|||Body only card
1Q|Generated|cols=A^B|items=One^Two;Three^Four
1Q
2K|Name|State
2r|Render|ok
1J|notaurl|Alt
1W|notaurl
1WV|yttv|YouTube TV|full=1
1H|bar|4,8,2|bars|h=180
1NL|Child News|Nested
2ND|Story|Desk|Summary|now|https://example.com/story.png
1SC
2SR|Docs|https://example.com|now|Read
1TL|Child Timeline|Today
2EV|09:00|Start|Accepted|success|https://example.com/event.png
1CP|Child Compare|Nested
2CI|Option|Fast|Summary|warning|https://example.com/choice.png
1MM|Child Memory|Nested
2MF|Preference|Compact|Use fewer rows
1ST|Child Steps|Nested
2SI|Listen|active|Voice accepted
1U|Child Strip|Nested
2J|https://example.com/a.jpg|A|Photo
2W|https://example.com/b.mp4||Video
1MO|Child Mosaic|Nested
2J|https://example.com/c.jpg|C|Photo
2W|https://example.com/d.mp4||Video`);

    expect(result.html).toContain("text-right");
    expect(result.html).toContain("Body only card");
    expect(result.html).toContain("Generated");
    expect(result.html).toContain("image unavailable");
    expect(result.html).toContain("video unavailable");
    expect(result.html).toContain("https://tv.youtube.com/");
    expect(result.html).toContain("<rect");
    expect(result.html).toContain("Child News");
    expect(result.html).toContain("Read");
    expect(result.html).toContain("Accepted");
    expect(result.html).toContain("Option");
    expect(result.html).toContain("Preference");
    expect(result.html).toContain("Voice accepted");
    expect(result.html).toContain("https://example.com/d.mp4");
  });

  it("applies compact style packs and recipes without raw CSS", () => {
    const result = new LensHTMLRenderer().render(`0F|st=mono|p=190,80,62
0Y|panel|bg=card|bd=fg/28|p=4|r=2
0Y|cta|bg=fg|fg=bg|p=3|caps=1|mono=1
0V|Styled
1C|Panel|Recipe|s=panel
1N|Continue|s=cta`);

    expect(result.theme.fontPreset).toBe("mono");
    expect(result.theme.primary).toEqual({ h: 190, s: 80, l: 62 });
    expect(result.html).toContain(`data-lens-style="panel"`);
    expect(result.html).toContain(`background:hsl(var(--card))`);
    expect(result.html).toContain(`border-color:hsl(var(--foreground) / 0.28)`);
    expect(result.html).toContain(`text-transform:uppercase`);

    const studio = new LensHTMLRenderer().render("0F|st=studio\n0N|Continue|s=cta");
    expect(studio.theme.fontPreset).toBe("modern");
    expect(studio.theme.background).toEqual({ h: 222, s: 22, l: 6 });
    expect(studio.theme.primary).toEqual({ h: 190, s: 82, l: 56 });
    expect(studio.html).toContain(`background:hsl(var(--primary))`);
  });
});
