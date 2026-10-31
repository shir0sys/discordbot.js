import { Base } from "./Base";
import { User, type APIUser } from "./User";
import { PermissionsBitField } from "../util/Permissions";
import type { Channel } from "./Channel";
import type { Client } from "../client/Client";

export interface APIMember {
  user?: APIUser;
  nick: string | null;
  roles: string[];
  joined_at: string;
}

export class Member extends Base {
  public guildId: string;
  public user: User | null;
  public nick: string | null;
  public roleIds: string[];
  public joinedTimestamp: number;

  constructor(client: Client, guildId: string, data: APIMember) {
    super(client);
    this.guildId = guildId;
    this.user = data.user ? new User(client, data.user) : null;
    this.nick = data.nick;
    this.roleIds = data.roles;
    this.joinedTimestamp = Date.parse(data.joined_at);
  }

  public get displayName(): string {
    return this.nick ?? this.user?.globalName ?? this.user?.username ?? "unknown";
  }

  /**
   * Base permissions from `@everyone` plus every role this member has,
   * before any channel-specific overwrite is applied. Requires the guild to
   * be cached (fetch it with `client.guilds.fetch()` first if it isn't).
   */
  public get permissions(): PermissionsBitField {
    const guild = this.client.guilds.cache.get(this.guildId);
    if (!guild) return new PermissionsBitField();

    const everyoneRole = guild.roles.get(this.guildId);
    let bits = everyoneRole?.permissions ?? 0n;
    for (const roleId of this.roleIds) {
      bits |= guild.roles.get(roleId)?.permissions ?? 0n;
    }
    return new PermissionsBitField(bits);
  }

  /** Effective permissions in a given channel, applying that channel's overwrites on top of this member's base permissions. */
  public permissionsIn(channel: Channel): PermissionsBitField {
    if (!this.user) return this.permissions;
    return channel.permissionsFor(this.permissions, this.user.id, this.roleIds);
  }

  public async kick(reason?: string): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/members/${this.user?.id}`, reason);
  }

  public async addRole(roleId: string, reason?: string): Promise<void> {
    await this.client.rest.put(`/guilds/${this.guildId}/members/${this.user?.id}/roles/${roleId}`, undefined, reason);
  }

  public async removeRole(roleId: string, reason?: string): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/members/${this.user?.id}/roles/${roleId}`, reason);
  }
}
