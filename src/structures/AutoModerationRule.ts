import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APIAutoModerationRule {
  id: string;
  guild_id: string;
  name: string;
  enabled: boolean;
  trigger_type: number;
  event_type: number;
  actions: unknown[];
}

export class AutoModerationRule extends Base {
  public id: string;
  public guildId: string;
  public name: string;
  public enabled: boolean;
  public triggerType: number;
  public eventType: number;

  constructor(client: Client, data: APIAutoModerationRule) {
    super(client);
    this.id = data.id;
    this.guildId = data.guild_id;
    this.name = data.name;
    this.enabled = data.enabled;
    this.triggerType = data.trigger_type;
    this.eventType = data.event_type;
  }

  public async edit(data: Partial<{ name: string; enabled: boolean }>, reason?: string): Promise<void> {
    await this.client.rest.patch(`/guilds/${this.guildId}/auto-moderation/rules/${this.id}`, data, reason);
  }

  public async delete(reason?: string): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/auto-moderation/rules/${this.id}`, reason);
  }
}
