import { User, type APIUser } from "../structures/User";
import type { Client } from "../client/Client";

export interface APIBan {
  reason: string | null;
  user: APIUser;
}

export class GuildBanManager {
  constructor(private readonly client: Client, private readonly guildId: string) {}

  public async fetch(userId: string): Promise<{ user: User; reason: string | null }> {
    const data = await this.client.rest.get<APIBan>(`/guilds/${this.guildId}/bans/${userId}`);
    return { user: new User(this.client, data.user), reason: data.reason };
  }

  public async list(): Promise<{ user: User; reason: string | null }[]> {
    const data = await this.client.rest.get<APIBan[]>(`/guilds/${this.guildId}/bans`);
    return data.map((ban) => ({ user: new User(this.client, ban.user), reason: ban.reason }));
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
}
