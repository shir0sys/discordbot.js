import { Interaction, type APIInteraction } from "./Interaction";
import { ApplicationCommandType } from "../util/Constants";
import type { Client } from "../client/Client";

export class ContextMenuCommandInteraction extends Interaction {
  public commandId: string;
  public commandName: string;
  public commandType: ApplicationCommandType.User | ApplicationCommandType.Message;
  public targetId: string;

  constructor(client: Client, data: APIInteraction) {
    super(client, data);
    this.commandId = data.data!.id;
    this.commandName = data.data!.name;
    this.commandType = data.data!.type as ApplicationCommandType.User | ApplicationCommandType.Message;
    this.targetId = data.data!.target_id!;
  }

  public isUserContextMenu(): boolean {
    return this.commandType === ApplicationCommandType.User;
  }

  public isMessageContextMenu(): boolean {
    return this.commandType === ApplicationCommandType.Message;
  }
}
