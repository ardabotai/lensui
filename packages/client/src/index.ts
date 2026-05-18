export interface LensClientOptions {
  url: string;
  token?: string;
  apply(commandStream: string): unknown | Promise<unknown>;
}

export class LensClientConnection {
  private socket?: WebSocket;

  constructor(private readonly options: LensClientOptions) {}

  connect(): void {
    const url = new URL(this.options.url);
    if (this.options.token) url.searchParams.set("token", this.options.token);
    this.socket = new WebSocket(url);
    this.socket.addEventListener("message", async (event) => {
      if (typeof event.data !== "string") return;
      try {
        const result = await this.options.apply(event.data);
        this.socket?.send(`ok|${JSON.stringify(result ?? {})}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.socket?.send(`err|${message}`);
      }
    });
  }

  close(): void {
    this.socket?.close();
    this.socket = undefined;
  }
}
