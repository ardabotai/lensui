export type LensModelProvider = "openai-compatible" | "anthropic-compatible";

export interface LensInferenceConfig {
  provider: LensModelProvider;
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface LensAgentRuntime {
  send(input: string): Promise<void>;
  apply(commandStream: string): Promise<void>;
}

export class LensBYOKRuntime implements LensAgentRuntime {
  constructor(
    private readonly config: LensInferenceConfig,
    private readonly applyHandler: (commandStream: string) => Promise<void> | void,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async send(input: string): Promise<void> {
    const commandStream = await this.callModel(input);
    await this.apply(commandStream);
  }

  async apply(commandStream: string): Promise<void> {
    if (!startsWithCommandHeader(commandStream)) throw new Error("model did not return a LensUI command stream");
    await this.applyHandler(commandStream);
  }

  private async callModel(input: string): Promise<string> {
    const response = this.config.provider === "openai-compatible"
      ? await this.callOpenAI(input)
      : await this.callAnthropic(input);
    return extractCommandStream(response);
  }

  private async callOpenAI(input: string): Promise<string> {
    const res = await this.fetcher(endpoint(this.config.baseURL, "/v1/chat/completions", "chat/completions"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input }
        ]
      })
    });
    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content ?? "";
  }

  private async callAnthropic(input: string): Promise<string> {
    const res = await this.fetcher(endpoint(this.config.baseURL, "/v1/messages", "messages"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.config.apiKey}`,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: input }]
      })
    });
    const json = await res.json() as { content?: Array<{ type?: string; text?: string }> };
    return json.content?.filter((block) => block.type === "text").map((block) => block.text ?? "").join("\n") ?? "";
  }
}

function endpoint(baseURL: string, defaultPath: string, terminal: string): string {
  const url = new URL(baseURL);
  const path = url.pathname.replace(/^\/+|\/+$/g, "");
  if (!path) url.pathname = defaultPath;
  else if (path === "v1") url.pathname = defaultPath;
  else if (!path.endsWith(terminal)) url.pathname = `/${path}/${terminal}`;
  return url.toString();
}

const systemPrompt = "Return only LensUI compact command streams starting with a standalone ! line. Render lightcode lines must use base36 depth prefixes like 0F|0, 0V|Title, 1M|Label|Value. Never include provider tokens or secrets in lightcode or components.";

function startsWithCommandHeader(source: string): boolean {
  const first = source.split(/\r?\n/).find((line) => line.trim().length > 0);
  return first?.trim() === "!";
}

function extractCommandStream(source: string): string {
  const lines = source.trim().split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim() === "!");
  if (index < 0) throw new Error("model response did not include LensUI command stream");
  return lines.slice(index).join("\n");
}
