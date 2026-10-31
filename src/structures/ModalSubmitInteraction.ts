import { Interaction, type APIInteraction } from "./Interaction";
import type { Client } from "../client/Client";

export class ModalSubmitInteraction extends Interaction {
  public customId: string;
  private readonly fields: Map<string, string>;

  constructor(client: Client, data: APIInteraction) {
    super(client, data);
    this.customId = data.data!.custom_id!;
    this.fields = new Map();
    for (const row of data.data!.components ?? []) {
      for (const component of row.components) {
        this.fields.set(component.custom_id, component.value);
      }
    }
  }

  public getTextInputValue(customId: string): string | undefined {
    return this.fields.get(customId);
  }
}
