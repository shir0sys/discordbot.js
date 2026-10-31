import { Base } from "./Base";
import { User, type APIUser } from "./User";
import type { Client } from "../client/Client";

export interface APIBan {
  reason: string | null;
  user: APIUser;
}

export class GuildBan extends Base {
  public guildId: string;
  public user: User;
  public reason: string | null;

  constructor(client: Client, guildId: string, data: APIBan) {
    super(client);
    this.guildId = guildId;
    this.user = new User(client, data.user);
    this.reason = data.reason;
  }

  public async revoke(reason?: string): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/bans/${this.user.id}`, reason);
  }
}
