import { Interaction, type APIInteraction } from "./Interaction";
import { ComponentType } from "../util/Constants";
import type { Client } from "../client/Client";

export class MessageComponentInteraction extends Interaction {
  public customId: string;
  public componentType: ComponentType;
  public values: string[];
  public messageId: string | null;

  constructor(client: Client, data: APIInteraction) {
    super(client, data);
    this.customId = data.data!.custom_id!;
    this.componentType = data.data!.component_type as ComponentType;
    this.values = data.data!.values ?? [];
    this.messageId = data.message?.id ?? null;
  }

  public isButton(): boolean {
    return this.componentType === ComponentType.Button;
  }

  public isSelectMenu(): boolean {
    return (
      this.componentType === ComponentType.StringSelect ||
      this.componentType === ComponentType.UserSelect ||
      this.componentType === ComponentType.RoleSelect ||
      this.componentType === ComponentType.MentionableSelect ||
      this.componentType === ComponentType.ChannelSelect
    );
  }
}
