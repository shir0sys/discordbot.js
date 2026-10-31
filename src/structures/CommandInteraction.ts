import { Interaction, type APIInteraction } from "./Interaction";
import { InteractionResponseType } from "../util/Constants";
import { normalizeMessagePayload, type MessagePayload } from "./Message";
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

  public async reply(payload: MessagePayload): Promise<void> {
    await this.callback(InteractionResponseType.ChannelMessageWithSource, normalizeMessagePayload(payload));
  }

  public async editReply(payload: MessagePayload): Promise<void> {
    await this.client.rest.patch(
      `/webhooks/${this.applicationId}/${this.token}/messages/@original`,
      normalizeMessagePayload(payload),
    );
  }
}
