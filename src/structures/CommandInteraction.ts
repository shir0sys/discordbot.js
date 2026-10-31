import { Interaction, type APIInteraction } from "./Interaction";
import type { Client } from "../client/Client";

export class CommandInteraction extends Interaction {
  public commandId: string;
  public commandName: string;
  private readonly options: Map<string, string | number | boolean>;

  constructor(client: Client, data: APIInteraction) {
    super(client, data);
    this.commandId = data.data!.id;
    this.commandName = data.data!.name;
    this.options = new Map((data.data!.options ?? []).map((opt) => [opt.name, opt.value!]));
  }

  public getOption<T = string | number | boolean>(name: string): T | undefined {
    return this.options.get(name) as T | undefined;
  }
}
