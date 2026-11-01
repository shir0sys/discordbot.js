import { Collection } from "./Collection";
import { GuildScheduledEvent, type APIGuildScheduledEvent } from "../structures/GuildScheduledEvent";
import type { User, APIUser } from "../structures/User";
import type { Client } from "../client/Client";

export interface GuildScheduledEventCreateData {
  name: string;
  scheduled_start_time: string;
  scheduled_end_time?: string;
  description?: string;
  entity_type: number;
  privacy_level: number;
  channel_id?: string;
  entity_metadata?: { location?: string };
}

export class GuildScheduledEventManager extends Collection<string, GuildScheduledEvent> {
  constructor(
    private readonly client: Client,
    private readonly guildId: string,
  ) {
    super();
  }

  public async fetchAll(withUserCount = false): Promise<GuildScheduledEvent[]> {
    const data = await this.client.rest.get<APIGuildScheduledEvent[]>(`/guilds/${this.guildId}/scheduled-events`, {
      with_user_count: withUserCount,
    });
    this.clear();
    return data.map((raw) => {
      const event = new GuildScheduledEvent(this.client, raw);
      this.set(event.id, event);
      return event;
    });
  }

  public async fetch(eventId: string, withUserCount = false): Promise<GuildScheduledEvent> {
    const data = await this.client.rest.get<APIGuildScheduledEvent>(
      `/guilds/${this.guildId}/scheduled-events/${eventId}`,
      { with_user_count: withUserCount },
    );
    const event = new GuildScheduledEvent(this.client, data);
    this.set(event.id, event);
    return event;
  }

  public async create(data: GuildScheduledEventCreateData, reason?: string): Promise<GuildScheduledEvent> {
    const payload = await this.client.rest.post<APIGuildScheduledEvent>(
      `/guilds/${this.guildId}/scheduled-events`,
      data,
      reason,
    );
    const event = new GuildScheduledEvent(this.client, payload);
    this.set(event.id, event);
    return event;
  }

  public async remove(eventId: string): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/scheduled-events/${eventId}`);
    this.delete(eventId);
  }

  public async fetchUsers(
    eventId: string,
    options: { limit?: number; before?: string; after?: string } = {},
  ): Promise<User[]> {
    const { User: UserClass } = await import("../structures/User");
    const data = await this.client.rest.get<{ user: APIUser }[]>(
      `/guilds/${this.guildId}/scheduled-events/${eventId}/users`,
      options,
    );
    return data.map((entry) => new UserClass(this.client, entry.user));
  }
}
