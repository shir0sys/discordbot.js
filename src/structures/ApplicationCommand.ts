import type { Client } from "../client/Client";
import type {
  APIApplicationCommand,
  APICommandPermission,
  APIGuildApplicationCommandPermissions,
  ApplicationCommandData,
} from "../managers/ApplicationCommandManager";

/** A slash/context-menu command as returned by Discord, wrapping the raw payload with the edit/delete/permissions calls scoped to wherever it's registered (global, or one guild). */
export class ApplicationCommand {
  public id: string;
  public applicationId: string;
  public guildId: string | null;
  public name: string;
  public description: string;
  public version: string;

  constructor(
    private readonly client: Client,
    data: APIApplicationCommand,
  ) {
    this.id = data.id;
    this.applicationId = data.application_id;
    this.guildId = data.guild_id ?? null;
    this.name = data.name;
    this.description = data.description;
    this.version = data.version;
  }

  public edit(data: Partial<ApplicationCommandData>): Promise<ApplicationCommand> {
    return this.client.application.edit(this.id, data, this.guildId ?? undefined);
  }

  public delete(): Promise<void> {
    return this.client.application.delete(this.id, this.guildId ?? undefined);
  }

  public fetchPermissions(): Promise<ApplicationCommandPermissions> {
    if (!this.guildId) throw new Error("Only guild commands have permissions");
    return this.client.application.fetchPermissions(this.id, this.guildId);
  }

  public editPermissions(
    permissions: APICommandPermission[],
    bearerToken: string,
  ): Promise<ApplicationCommandPermissions> {
    if (!this.guildId) throw new Error("Only guild commands have permissions");
    return this.client.application.editPermissions(this.id, this.guildId, permissions, bearerToken);
  }
}

/** The per-guild role/user/channel overrides for one application command. */
export class ApplicationCommandPermissions {
  public commandId: string;
  public applicationId: string;
  public guildId: string;
  public permissions: APICommandPermission[];

  constructor(
    private readonly client: Client,
    data: APIGuildApplicationCommandPermissions,
  ) {
    this.commandId = data.id;
    this.applicationId = data.application_id;
    this.guildId = data.guild_id;
    this.permissions = data.permissions;
  }

  public async edit(permissions: APICommandPermission[], bearerToken: string): Promise<ApplicationCommandPermissions> {
    const updated = await this.client.application.editPermissions(
      this.commandId,
      this.guildId,
      permissions,
      bearerToken,
    );
    this.permissions = updated.permissions;
    return this;
  }
}
