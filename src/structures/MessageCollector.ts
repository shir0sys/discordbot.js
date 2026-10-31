import { Collector, type CollectorOptions } from "../util/Collector";
import { Message } from "./Message";
import type { Client } from "../client/Client";

export class MessageCollector extends Collector<string, Message> {
  private readonly onMessage = (message: Message) => {
    if (message.channelId === this.channelId) this.handleCollect(message);
  };

  constructor(private readonly client: Client, private readonly channelId: string, options: CollectorOptions<Message> = {}) {
    super(options);
    this.client.on("messageCreate", this.onMessage);
    this.once("end", () => this.client.off("messageCreate", this.onMessage));
  }

  protected key(item: Message): string {
    return item.id;
  }
}
