import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APISticker {
  id: string;
  name: string;
  description: string | null;
  tags: string;
  format_type: number;
  guild_id?: string;
}

export class Sticker extends Base {
  public id: string;
  public name: string;
  public description: string | null;
  public tags: string;
  public formatType: number;
  public guildId: string | null;

  constructor(client: Client, data: APISticker) {
    super(client);
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.tags = data.tags;
    this.formatType = data.format_type;
    this.guildId = data.guild_id ?? null;
  }

  public async edit(data: { name?: string; description?: string; tags?: string }, reason?: string): Promise<void> {
    if (!this.guildId) throw new Error("Cannot edit a non-guild sticker");
    await this.client.rest.patch(`/guilds/${this.guildId}/stickers/${this.id}`, data, reason);
  }

  public async delete(reason?: string): Promise<void> {
    if (!this.guildId) throw new Error("Cannot delete a non-guild sticker");
    await this.client.rest.delete(`/guilds/${this.guildId}/stickers/${this.id}`, reason);
  }
}
