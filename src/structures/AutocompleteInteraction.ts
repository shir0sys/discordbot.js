import { Interaction, type APIInteraction } from "./Interaction";
import { InteractionResponseType } from "../util/Constants";
import type { Client } from "../client/Client";

export class AutocompleteInteraction extends Interaction {
  public commandName: string;
  private readonly options: Map<string, { value: string | number | boolean; focused: boolean }>;

  constructor(client: Client, data: APIInteraction) {
    super(client, data);
    this.commandName = data.data!.name;
    this.options = new Map(
      (data.data!.options ?? []).map((opt) => [opt.name, { value: opt.value!, focused: opt.focused ?? false }]),
    );
  }

  public getFocused(): { name: string; value: string | number | boolean } | undefined {
    for (const [name, option] of this.options) {
      if (option.focused) return { name, value: option.value };
    }
    return undefined;
  }

  public async respond(choices: { name: string; value: string | number }[]): Promise<void> {
    await this.callback(InteractionResponseType.ApplicationCommandAutocompleteResult, { choices });
  }
}
