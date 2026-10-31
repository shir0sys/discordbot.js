import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APIGuildTemplate {
  code: string;
  name: string;
  description: string | null;
  usage_count: number;
  creator_id: string;
  source_guild_id: string;
}

export class GuildTemplate extends Base {
  public code: string;
  public name: string;
  public description: string | null;
  public usageCount: number;
  public creatorId: string;
  public sourceGuildId: string;

  constructor(client: Client, data: APIGuildTemplate) {
    super(client);
    this.code = data.code;
    this.name = data.name;
    this.description = data.description;
    this.usageCount = data.usage_count;
    this.creatorId = data.creator_id;
    this.sourceGuildId = data.source_guild_id;
  }

  public async sync(): Promise<void> {
    await this.client.rest.put(`/guilds/${this.sourceGuildId}/templates/${this.code}`);
  }

  public async edit(data: Partial<{ name: string; description: string }>): Promise<void> {
    await this.client.rest.patch(`/guilds/${this.sourceGuildId}/templates/${this.code}`, data);
  }

  public async delete(): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.sourceGuildId}/templates/${this.code}`);
  }
}
