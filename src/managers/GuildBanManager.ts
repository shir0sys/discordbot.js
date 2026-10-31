import { GuildBan, type APIBan } from "../structures/GuildBan";
import type { Client } from "../client/Client";

export class GuildBanManager {
  constructor(
    private readonly client: Client,
    private readonly guildId: string,
  ) {}

  public async fetch(userId: string): Promise<GuildBan> {
    const data = await this.client.rest.get<APIBan>(`/guilds/${this.guildId}/bans/${userId}`);
    return new GuildBan(this.client, this.guildId, data);
  }

  public async list(): Promise<GuildBan[]> {
    const data = await this.client.rest.get<APIBan[]>(`/guilds/${this.guildId}/bans`);
    return data.map((ban) => new GuildBan(this.client, this.guildId, ban));
  }

  public async create(userId: string, options: { deleteMessageSeconds?: number; reason?: string } = {}): Promise<void> {
    await this.client.rest.put(
      `/guilds/${this.guildId}/bans/${userId}`,
      { delete_message_seconds: options.deleteMessageSeconds },
      options.reason,
    );
  }

  public async remove(userId: string, reason?: string): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/bans/${userId}`, reason);
  }

  /** Bans up to 200 users in a single request. Returns which ids were actually banned vs. failed (e.g. already banned, not a member). */
  public async bulkCreate(
    userIds: string[],
    options: { deleteMessageSeconds?: number; reason?: string } = {},
  ): Promise<{ bannedUsers: string[]; failedUsers: string[] }> {
    const data = await this.client.rest.post<{ banned_users: string[]; failed_users: string[] }>(
      `/guilds/${this.guildId}/bulk-ban`,
      { user_ids: userIds, delete_message_seconds: options.deleteMessageSeconds },
      options.reason,
    );
    return { bannedUsers: data.banned_users, failedUsers: data.failed_users };
  }
}
