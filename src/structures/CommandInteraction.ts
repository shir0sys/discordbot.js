import { Interaction, type APIInteraction, type APIInteractionOption } from "./Interaction";
import { ApplicationCommandOptionType } from "../util/Constants";
import type { Client } from "../client/Client";

/**
 * Flattens the subcommand/subcommand-group wrapper Discord nests chosen
 * options in, so getOption() works the same whether or not the command
 * uses subcommands.
 */
function flattenOptions(options: APIInteractionOption[]): {
  values: Map<string, string | number | boolean>;
  subcommand: string | null;
  subcommandGroup: string | null;
} {
  let subcommandGroup: string | null = null;
  let subcommand: string | null = null;
  let cursor = options;

  if (cursor[0]?.type === ApplicationCommandOptionType.SubCommandGroup) {
    subcommandGroup = cursor[0].name;
    cursor = cursor[0].options ?? [];
  }
  if (cursor[0]?.type === ApplicationCommandOptionType.SubCommand) {
    subcommand = cursor[0].name;
    cursor = cursor[0].options ?? [];
  }

  return { values: new Map(cursor.map((opt) => [opt.name, opt.value!])), subcommand, subcommandGroup };
}

export class CommandInteraction extends Interaction {
  public commandId: string;
  public commandName: string;
  public readonly subcommand: string | null;
  public readonly subcommandGroup: string | null;
  private readonly options: Map<string, string | number | boolean>;

  constructor(client: Client, data: APIInteraction) {
    super(client, data);
    this.commandId = data.data!.id;
    this.commandName = data.data!.name;
    const flattened = flattenOptions(data.data!.options ?? []);
    this.options = flattened.values;
    this.subcommand = flattened.subcommand;
    this.subcommandGroup = flattened.subcommandGroup;
  }

  public getOption<T = string | number | boolean>(name: string): T | undefined {
    return this.options.get(name) as T | undefined;
  }
}
