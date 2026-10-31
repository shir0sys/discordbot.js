import { Collector, type CollectorOptions } from "../util/Collector";
import type { Interaction } from "./Interaction";
import type { MessageComponentInteraction } from "./MessageComponentInteraction";
import type { Client } from "../client/Client";

export interface InteractionCollectorOptions extends CollectorOptions<MessageComponentInteraction> {
  messageId?: string;
}

export class InteractionCollector extends Collector<string, MessageComponentInteraction> {
  private readonly onInteraction = (interaction: Interaction) => {
    if (!interaction.isMessageComponent()) return;
    if (this.messageId && interaction.messageId !== this.messageId) return;
    this.handleCollect(interaction);
  };

  private readonly messageId?: string;

  constructor(
    private readonly client: Client,
    options: InteractionCollectorOptions = {},
  ) {
    super(options);
    this.messageId = options.messageId;
    this.client.on("interactionCreate", this.onInteraction);
    this.once("end", () => this.client.off("interactionCreate", this.onInteraction));
  }

  protected key(item: MessageComponentInteraction): string {
    return item.id;
  }
}
