import { CachedManager } from "./CachedManager";
import { Member, type APIMember } from "../structures/Member";
import type { Client } from "../client/Client";

export class GuildMemberManager extends CachedManager<string, Member> {
  constructor(
    client: Client,
    private readonly guildId: string,
  ) {
    super(client, 5000);
  }

  public _add(userId: string, data: APIMember): Member {
    const member = new Member(this.client, this.guildId, data);
    this.set(userId, member);
    return member;
  }

  public async fetch(userId: string, options: { force?: boolean } = {}): Promise<Member> {
    if (!options.force) {
      const cached = this.get(userId);
      if (cached) return cached;
    }
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
    data: Partial<{
      nick: string;
      roles: string[];
      mute: boolean;
      deaf: boolean;
      communication_disabled_until: string | null;
    }>,
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

  /**
   * Fetches members over the gateway (opcode 8) instead of REST — the only
   * way to bulk-fetch members of a large guild without the privileged
   * GUILD_MEMBERS intent granting a full member list on GUILD_CREATE.
   * Routes the request to the shard actually responsible for this guild.
   */
  public fetchViaGateway(
    options: { query?: string; limit?: number; userIds?: string[]; presences?: boolean; timeout?: number } = {},
  ): Promise<Member[]> {
    const nonce = `${this.guildId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const shardCount = this.client.shards.length || 1;
    const shardId = Number((BigInt(this.guildId) >> 22n) % BigInt(shardCount));
    const gateway = this.client.shards[shardId] ?? this.client.gateway;

    return new Promise((resolve, reject) => {
      const collected: Member[] = [];
      const timer = setTimeout(() => {
        this.client.off("guildMembersChunk", onChunk);
        reject(new Error("fetchViaGateway timed out"));
      }, options.timeout ?? 10000);

      const onChunk = (chunk: {
        guildId: string;
        members: Member[];
        chunkIndex: number;
        chunkCount: number;
        nonce: string | null;
      }) => {
        if (chunk.nonce !== nonce) return;
        collected.push(...chunk.members);
        if (chunk.chunkIndex >= chunk.chunkCount - 1) {
          clearTimeout(timer);
          this.client.off("guildMembersChunk", onChunk);
          resolve(collected);
        }
      };

      this.client.on("guildMembersChunk", onChunk);
      gateway.requestGuildMembers({
        guildId: this.guildId,
        query: options.userIds ? undefined : (options.query ?? ""),
        limit: options.userIds ? undefined : (options.limit ?? 0),
        userIds: options.userIds,
        presences: options.presences,
        nonce,
      });
    });
  }
}
