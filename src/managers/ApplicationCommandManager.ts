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

  public async set(commands: CommandInput[], guildId?: string): Promise<void> {
    const appId = this.appId();
    const path = guildId ? `/applications/${appId}/guilds/${guildId}/commands` : `/applications/${appId}/commands`;
    await this.client.rest.put(path, commands.map(resolve));
  }

  public async create(command: CommandInput, guildId?: string): Promise<void> {
    const appId = this.appId();
    const path = guildId ? `/applications/${appId}/guilds/${guildId}/commands` : `/applications/${appId}/commands`;
    await this.client.rest.post(path, resolve(command));
  }
}
