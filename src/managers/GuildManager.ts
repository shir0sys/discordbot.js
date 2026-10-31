import { Collection } from "./Collection";
import { Guild, type APIGuild } from "../structures/Guild";
import type { Client } from "../client/Client";

export class GuildManager {
  public readonly cache = new Collection<string, Guild>();

  constructor(private readonly client: Client) {}

  public async fetch(id: string): Promise<Guild> {
    const data = await this.client.rest.get<APIGuild>(`/guilds/${id}`);
    const guild = new Guild(this.client, data);
    this.cache.set(guild.id, guild);
    return guild;
  }
}
