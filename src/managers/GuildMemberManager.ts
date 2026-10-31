import { Collection } from "./Collection";
import { Member, type APIMember } from "../structures/Member";
import type { Client } from "../client/Client";

export class GuildMemberManager extends Collection<string, Member> {
  constructor(private readonly client: Client, private readonly guildId: string) {
    super(null, 5000);
  }

  public _add(userId: string, data: APIMember): Member {
    const member = new Member(this.client, this.guildId, data);
    this.set(userId, member);
    return member;
  }

  public async fetch(userId: string): Promise<Member> {
    const data = await this.client.rest.get<APIMember & { user: { id: string } }>(
      `/guilds/${this.guildId}/members/${userId}`,
    );
    return this._add(data.user.id, data);
  }

  public async list(options: { limit?: number; after?: string } = {}): Promise<Member[]> {
    const data = await this.client.rest.get<(APIMember & { user: { id: string } })[]>(
      `/guilds/${this.guildId}/members`,
      options,
    );
    return data.map((member) => this._add(member.user.id, member));
  }

  public async kick(userId: string, reason?: string): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/members/${userId}`, reason);
    this.delete(userId);
  }

  public async ban(userId: string, options: { deleteMessageSeconds?: number; reason?: string } = {}): Promise<void> {
    await this.client.rest.put(
      `/guilds/${this.guildId}/bans/${userId}`,
      { delete_message_seconds: options.deleteMessageSeconds },
      options.reason,
    );
  }

  public async edit(
    userId: string,
    data: Partial<{ nick: string; roles: string[]; mute: boolean; deaf: boolean; communication_disabled_until: string | null }>,
    reason?: string,
  ): Promise<Member> {
    const updated = await this.client.rest.patch<APIMember & { user: { id: string } }>(
      `/guilds/${this.guildId}/members/${userId}`,
      data,
      reason,
    );
    return this._add(userId, updated);
  }

  public async timeout(userId: string, durationMs: number | null, reason?: string): Promise<Member> {
    const until = durationMs === null ? null : new Date(Date.now() + durationMs).toISOString();
    return this.edit(userId, { communication_disabled_until: until }, reason);
  }
}
