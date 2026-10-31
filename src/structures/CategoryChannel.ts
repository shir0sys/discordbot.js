import { Channel, type APIChannel } from "./Channel";
import type { Client } from "../client/Client";

export class CategoryChannel extends Channel {
  public guildId: string;
  public name: string | null;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.guildId = data.guild_id!;
    this.name = data.name ?? null;
  }

  /** Channels in this guild's cache whose parent is this category. Requires the guild to already be cached. */
  public children(): Channel[] {
    const guild = this.client.guilds.cache.get(this.guildId);
    if (!guild) return [];
    return guild.channels.filter((channel) => channel.parentId === this.id).toArray();
  }
}
