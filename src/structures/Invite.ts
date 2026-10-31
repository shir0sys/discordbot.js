import { Base } from "./Base";
import { User, type APIUser } from "./User";
import type { Client } from "../client/Client";

export interface APIInvite {
  code: string;
  guild_id?: string;
  channel_id: string | null;
  inviter?: APIUser;
  uses?: number;
  max_uses?: number;
  max_age?: number;
  temporary?: boolean;
  created_at?: string;
  expires_at?: string | null;
}

export class Invite extends Base {
  public code: string;
  public guildId: string | null;
  public channelId: string | null;
  public inviter: User | null;
  public uses: number | null;
  public maxUses: number | null;
  public maxAge: number | null;
  public temporary: boolean;
  public createdTimestamp: number | null;
  public expiresTimestamp: number | null;

  constructor(client: Client, data: APIInvite) {
    super(client);
    this.code = data.code;
    this.guildId = data.guild_id ?? null;
    this.channelId = data.channel_id;
    this.inviter = data.inviter ? new User(client, data.inviter) : null;
    this.uses = data.uses ?? null;
    this.maxUses = data.max_uses ?? null;
    this.maxAge = data.max_age ?? null;
    this.temporary = data.temporary ?? false;
    this.createdTimestamp = data.created_at ? Date.parse(data.created_at) : null;
    this.expiresTimestamp = data.expires_at ? Date.parse(data.expires_at) : null;
  }

  public get url(): string {
    return `https://discord.gg/${this.code}`;
  }

  public async delete(reason?: string): Promise<void> {
    await this.client.rest.delete(`/invites/${this.code}`, reason);
  }
}

/** Partial invite data carried by INVITE_DELETE — Discord only sends identifiers, not the full invite object. */
export interface PartialInvite {
  code: string;
  channelId: string;
  guildId: string | null;
}
