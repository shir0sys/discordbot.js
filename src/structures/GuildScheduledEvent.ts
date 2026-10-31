import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APIGuildScheduledEvent {
  id: string;
  guild_id: string;
  name: string;
  description: string | null;
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  status: number;
  entity_type: number;
}

export class GuildScheduledEvent extends Base {
  public id: string;
  public guildId: string;
  public name: string;
  public description: string | null;
  public scheduledStartTimestamp: number;
  public scheduledEndTimestamp: number | null;
  public status: number;
  public entityType: number;

  constructor(client: Client, data: APIGuildScheduledEvent) {
    super(client);
    this.id = data.id;
    this.guildId = data.guild_id;
    this.name = data.name;
    this.description = data.description;
    this.scheduledStartTimestamp = Date.parse(data.scheduled_start_time);
    this.scheduledEndTimestamp = data.scheduled_end_time ? Date.parse(data.scheduled_end_time) : null;
    this.status = data.status;
    this.entityType = data.entity_type;
  }

  public async edit(
    data: Partial<{ name: string; description: string; status: number }>,
    reason?: string,
  ): Promise<void> {
    await this.client.rest.patch(`/guilds/${this.guildId}/scheduled-events/${this.id}`, data, reason);
  }

  public async delete(): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/scheduled-events/${this.id}`);
  }
}
