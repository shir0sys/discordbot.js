import { Collection } from "./Collection";
import { ApplicationCommand } from "../structures/ApplicationCommand";
import type { ApplicationCommandData, CommandInput } from "./ApplicationCommandManager";
import type { Client } from "../client/Client";

/** The same command registration calls as the global `ApplicationCommandManager`, pre-scoped to one guild and cached under `guild.commands`. */
export class GuildApplicationCommandManager extends Collection<string, ApplicationCommand> {
  constructor(
    private readonly client: Client,
    private readonly guildId: string,
  ) {
    super();
  }

  /** Bulk-overwrites every command registered in this guild — named setAll rather than set() to avoid colliding with Map.set()'s single-entry signature. */
  public async setAll(commands: CommandInput[]): Promise<ApplicationCommand[]> {
    const result = await this.client.application.set(commands, this.guildId);
    this.clear();
    for (const command of result) super.set(command.id, command);
    return result;
  }

  public async create(command: CommandInput): Promise<ApplicationCommand> {
    const result = await this.client.application.create(command, this.guildId);
    super.set(result.id, result);
    return result;
  }

  public async fetchAll(): Promise<ApplicationCommand[]> {
    const result = await this.client.application.fetchAll(this.guildId);
    this.clear();
    for (const command of result) super.set(command.id, command);
    return result;
  }

  public async fetch(commandId: string): Promise<ApplicationCommand> {
    const result = await this.client.application.fetch(commandId, this.guildId);
    super.set(result.id, result);
    return result;
  }

  public async edit(commandId: string, data: Partial<ApplicationCommandData>): Promise<ApplicationCommand> {
    const result = await this.client.application.edit(commandId, data, this.guildId);
    super.set(result.id, result);
    return result;
  }

  public async remove(commandId: string): Promise<void> {
    await this.client.application.delete(commandId, this.guildId);
    this.delete(commandId);
  }
}
