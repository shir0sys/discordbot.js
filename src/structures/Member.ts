import { Base } from "./Base";
import { User, type APIUser } from "./User";
import { PermissionsBitField } from "../util/Permissions";
import type { Channel } from "./Channel";
import type { Role } from "./Role";
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

  /** The highest-position role this member holds, or null if they have none beyond @everyone (which isn't in roleIds). */
  public get highestRole(): Role | null {
    const guild = this.client.guilds.cache.get(this.guildId);
    if (!guild) return null;

    let highest: Role | null = null;
    for (const roleId of this.roleIds) {
      const role = guild.roles.get(roleId);
      if (role && (!highest || role.position > highest.position)) highest = role;
    }
    return highest;
  }

  /**
   * Whether the bot's own role hierarchy outranks this member, which Discord
   * requires for kick/ban/timeout/role-edit regardless of raw permission
   * bits. The guild owner can never be outranked this way and is only
   * moderatable by itself. Requires the guild and the bot's own member to be
   * cached.
   */
  public get moderatable(): boolean {
    const guild = this.client.guilds.cache.get(this.guildId);
    const selfId = this.client.user?.id;
    if (!guild || !this.user || !selfId) return false;
    if (this.user.id === selfId) return false;
    if (guild.ownerId === this.user.id) return false;
    if (guild.ownerId === selfId) return true;

    const me = guild.members.get(selfId);
    if (!me) return false;

    return (me.highestRole?.position ?? 0) > (this.highestRole?.position ?? 0);
  }

  /** Whether the bot can kick this member: outranks them AND holds KickMembers. */
  public get kickable(): boolean {
    const guild = this.client.guilds.cache.get(this.guildId);
    const selfId = this.client.user?.id;
    const me = selfId ? guild?.members.get(selfId) : undefined;
    return this.moderatable && (me?.permissions.has(["KickMembers"]) ?? false);
  }

  /** Whether the bot can ban this member: outranks them AND holds BanMembers. */
  public get bannable(): boolean {
    const guild = this.client.guilds.cache.get(this.guildId);
    const selfId = this.client.user?.id;
    const me = selfId ? guild?.members.get(selfId) : undefined;
    return this.moderatable && (me?.permissions.has(["BanMembers"]) ?? false);
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

  public send(payload: import("./Message").MessagePayload): Promise<import("./Message").Message> {
    if (!this.user) throw new Error("Cannot DM a member with no cached user data");
    return this.user.send(payload);
  }
}
