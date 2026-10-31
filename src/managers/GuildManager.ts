import { CachedManager } from "./CachedManager";
import { Guild, type APIGuild } from "../structures/Guild";
import type { Client } from "../client/Client";

export class GuildManager extends CachedManager<string, Guild> {
  constructor(client: Client) {
    super(client);
  }

  public fetch(id: string): Promise<Guild> {
    return this.fetchAndCache<APIGuild>(id, `/guilds/${id}`, (data) => new Guild(this.client, data));
  }

  /** Bots in fewer than 10 guilds can create a new one via the API; above that, Discord rejects this with 403. */
  public async create(data: { name: string; icon?: string }): Promise<Guild> {
    const payload = await this.client.rest.post<APIGuild>("/guilds", data);
    const guild = new Guild(this.client, payload);
    this.set(guild.id, guild);
    return guild;
  }
}
