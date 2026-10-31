import { Base } from "./Base";
import { User, type APIUser } from "./User";
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
