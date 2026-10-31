import type { SlashCommandBuilder } from "../builders/SlashCommandBuilder";
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

export interface APIApplicationCommand extends ApplicationCommandData {
  id: string;
  application_id: string;
  guild_id?: string;
  version: string;
}

export interface APICommandPermission {
  id: string;
  type: 1 | 2 | 3; // 1 = role, 2 = user, 3 = channel
  permission: boolean;
}

export interface APIGuildApplicationCommandPermissions {
  id: string;
  application_id: string;
  guild_id: string;
  permissions: APICommandPermission[];
}

export type CommandInput = ApplicationCommandData | SlashCommandBuilder;

function resolve(command: CommandInput): object {
  return typeof (command as SlashCommandBuilder).toJSON === "function"
    ? (command as SlashCommandBuilder).toJSON()
    : command;
}

/** Registers slash commands against /applications/{id}/commands (global) or a guild-scoped variant. */
export class ApplicationCommandManager {
  constructor(private readonly client: Client) {}

  private appId(): string {
    const id = this.client.user?.id ?? this.client.applicationId;
    if (!id) throw new Error("Cannot register commands before the client is ready");
    return id;
  }

  private basePath(guildId?: string): string {
    const appId = this.appId();
    return guildId ? `/applications/${appId}/guilds/${guildId}/commands` : `/applications/${appId}/commands`;
  }

  public async set(commands: CommandInput[], guildId?: string): Promise<APIApplicationCommand[]> {
    return this.client.rest.put<APIApplicationCommand[]>(this.basePath(guildId), commands.map(resolve));
  }

  public async create(command: CommandInput, guildId?: string): Promise<APIApplicationCommand> {
    return this.client.rest.post<APIApplicationCommand>(this.basePath(guildId), resolve(command));
  }

  public async fetchAll(guildId?: string): Promise<APIApplicationCommand[]> {
    return this.client.rest.get<APIApplicationCommand[]>(this.basePath(guildId));
  }

  public async fetch(commandId: string, guildId?: string): Promise<APIApplicationCommand> {
    return this.client.rest.get<APIApplicationCommand>(`${this.basePath(guildId)}/${commandId}`);
  }

  public async edit(
    commandId: string,
    command: Partial<ApplicationCommandData>,
    guildId?: string,
  ): Promise<APIApplicationCommand> {
    return this.client.rest.patch<APIApplicationCommand>(`${this.basePath(guildId)}/${commandId}`, command);
  }

  public async delete(commandId: string, guildId?: string): Promise<void> {
    await this.client.rest.delete(`${this.basePath(guildId)}/${commandId}`);
  }

  public async fetchPermissions(commandId: string, guildId: string): Promise<APIGuildApplicationCommandPermissions> {
    return this.client.rest.get<APIGuildApplicationCommandPermissions>(
      `/applications/${this.appId()}/guilds/${guildId}/commands/${commandId}/permissions`,
    );
  }

  public async fetchAllPermissions(guildId: string): Promise<APIGuildApplicationCommandPermissions[]> {
    return this.client.rest.get<APIGuildApplicationCommandPermissions[]>(
      `/applications/${this.appId()}/guilds/${guildId}/commands/permissions`,
    );
  }

  /**
   * Requires an OAuth2 Bearer token with `applications.commands.permissions.update`
   * from the guild owner (or a user with Manage Guild) — the bot token alone,
   * used for every other call on this class, is not accepted here by Discord.
   */
  public async editPermissions(
    commandId: string,
    guildId: string,
    permissions: APICommandPermission[],
    bearerToken: string,
  ): Promise<APIGuildApplicationCommandPermissions> {
    const { REST } = await import("../rest/REST");
    const bearerRest = new REST({ token: bearerToken, authPrefix: "Bearer" });
    return bearerRest.put<APIGuildApplicationCommandPermissions>(
      `/applications/${this.appId()}/guilds/${guildId}/commands/${commandId}/permissions`,
      { permissions },
    );
  }
}
