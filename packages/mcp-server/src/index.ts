export interface LensSessionContext {
  sessionID: string;
  userID?: string;
}

export interface LensClientBinding {
  send(commandStream: string): Promise<unknown>;
  read(kind: "lightcode" | "components" | "styles" | "metadata" | "status"): Promise<unknown>;
  screenshot?(): Promise<unknown>;
}

export interface LensSessionResolver {
  resolve(context: LensSessionContext): Promise<LensClientBinding>;
}

export class LensMCPBridge {
  constructor(private readonly resolver: LensSessionResolver) {}

  async lens_apply(context: LensSessionContext, c: string): Promise<unknown> {
    const client = await this.resolver.resolve(context);
    return client.send(c);
  }

  async lens_read(context: LensSessionContext, kind: "lightcode" | "components" | "styles" | "metadata" | "status" = "status"): Promise<unknown> {
    const client = await this.resolver.resolve(context);
    return client.read(kind);
  }

  async lens_shot(context: LensSessionContext): Promise<unknown> {
    const client = await this.resolver.resolve(context);
    if (!client.screenshot) throw new Error("screenshot unavailable for bound LensUI client");
    return client.screenshot();
  }
}
