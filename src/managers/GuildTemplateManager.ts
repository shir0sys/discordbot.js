import { GuildTemplate, type APIGuildTemplate } from "../structures/GuildTemplate";
import type { APIGuild } from "../structures/Guild";
import type { Client } from "../client/Client";

export class GuildTemplateManager {
  constructor(
    private readonly client: Client,
    private readonly guildId: string,
  ) {}

  public async list(): Promise<GuildTemplate[]> {
    const data = await this.client.rest.get<APIGuildTemplate[]>(`/guilds/${this.guildId}/templates`);
    return data.map((template) => new GuildTemplate(this.client, template));
  }

  public async create(data: { name: string; description?: string }): Promise<GuildTemplate> {
    const payload = await this.client.rest.post<APIGuildTemplate>(`/guilds/${this.guildId}/templates`, data);
    return new GuildTemplate(this.client, payload);
  }
}

export async function fetchGuildTemplate(client: Client, code: string): Promise<GuildTemplate> {
  const payload = await client.rest.get<APIGuildTemplate>(`/guilds/templates/${code}`);
  return new GuildTemplate(client, payload);
}

export async function createGuildFromTemplate(
  client: Client,
  code: string,
  data: { name: string; icon?: string },
): Promise<APIGuild> {
  return client.rest.post<APIGuild>(`/guilds/templates/${code}`, data);
}
