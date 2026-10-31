import { REST } from "../rest/REST";
import type { APIUser } from "../structures/User";

export interface APIUserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface APIConnection {
  id: string;
  name: string;
  type: string;
  verified: boolean;
}

/** Thin wrapper around a user access token (Bearer auth) — distinct from the bot-token REST client used everywhere else. */
export class OAuth2User {
  private readonly rest: REST;

  constructor(accessToken: string) {
    this.rest = new REST({ token: accessToken, authPrefix: "Bearer" });
  }

  public fetchProfile(): Promise<APIUser> {
    return this.rest.get<APIUser>("/users/@me");
  }

  public fetchGuilds(): Promise<APIUserGuild[]> {
    return this.rest.get<APIUserGuild[]>("/users/@me/guilds");
  }

  public fetchConnections(): Promise<APIConnection[]> {
    return this.rest.get<APIConnection[]>("/users/@me/connections");
  }

  public leaveGuild(guildId: string): Promise<void> {
    return this.rest.delete(`/users/@me/guilds/${guildId}`);
  }
}
