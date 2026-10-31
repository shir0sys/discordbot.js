import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APIEmoji {
  id: string | null;
  name: string | null;
  roles?: string[];
  animated?: boolean;
  available?: boolean;
  managed?: boolean;
}

export class Emoji extends Base {
  public id: string | null;
  public name: string | null;
  public animated: boolean;
  public available: boolean;

  constructor(client: Client, data: APIEmoji) {
    super(client);
    this.id = data.id;
    this.name = data.name;
    this.animated = data.animated ?? false;
    this.available = data.available ?? true;
  }

  public get identifier(): string {
    return this.id ? `${this.animated ? "a" : ""}:${this.name}:${this.id}` : encodeURIComponent(this.name ?? "");
  }

  public toString(): string {
    return this.id ? `<${this.animated ? "a" : ""}:${this.name}:${this.id}>` : (this.name ?? "");
  }
}

export class GuildEmoji extends Emoji {
  public guildId: string;

  constructor(client: Client, guildId: string, data: APIEmoji) {
    super(client, data);
    this.guildId = guildId;
  }

  public async edit(data: { name?: string; roles?: string[] }, reason?: string): Promise<void> {
    await this.client.rest.patch(`/guilds/${this.guildId}/emojis/${this.id}`, data, reason);
  }

  public async delete(reason?: string): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/emojis/${this.id}`, reason);
  }
}
