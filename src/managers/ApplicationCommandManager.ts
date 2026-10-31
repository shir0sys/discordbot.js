import type { Client } from "../client/Client";

export interface ApplicationCommandOption {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  choices?: { name: string; value: string | number }[];
}

export interface ApplicationCommandData {
  name: string;
  description: string;
  options?: ApplicationCommandOption[];
}

/** Registers slash commands against /applications/{id}/commands (global) or a guild-scoped variant. */
export class ApplicationCommandManager {
  constructor(private readonly client: Client) {}

  public async set(commands: ApplicationCommandData[], guildId?: string): Promise<void> {
    const appId = this.client.user?.id ?? this.client.applicationId;
    if (!appId) throw new Error("Cannot register commands before the client is ready");
    const path = guildId ? `/applications/${appId}/guilds/${guildId}/commands` : `/applications/${appId}/commands`;
    await this.client.rest.put(path, commands);
  }

  public async create(command: ApplicationCommandData, guildId?: string): Promise<void> {
    const appId = this.client.user?.id ?? this.client.applicationId;
    if (!appId) throw new Error("Cannot register commands before the client is ready");
    const path = guildId ? `/applications/${appId}/guilds/${guildId}/commands` : `/applications/${appId}/commands`;
    await this.client.rest.post(path, command);
  }
}
