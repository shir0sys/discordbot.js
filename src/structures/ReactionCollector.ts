import { Collector, type CollectorOptions } from "../util/Collector";
import type { Client } from "../client/Client";

export interface CollectedReaction {
  messageId: string;
  channelId: string;
  userId: string;
  emoji: { id: string | null; name: string | null };
}

export class ReactionCollector extends Collector<string, CollectedReaction> {
  private readonly onReaction = (raw: Record<string, any>) => {
    if (raw.message_id !== this.messageId) return;
    this.handleCollect({
      messageId: raw.message_id,
      channelId: raw.channel_id,
      userId: raw.user_id,
      emoji: { id: raw.emoji?.id ?? null, name: raw.emoji?.name ?? null },
    });
  };

  constructor(
    private readonly client: Client,
    private readonly messageId: string,
    options: CollectorOptions<CollectedReaction> = {},
  ) {
    super(options);
    this.client.on("messageReactionAdd", this.onReaction);
    this.once("end", () => this.client.off("messageReactionAdd", this.onReaction));
  }

  protected key(item: CollectedReaction): string {
    return `${item.userId}:${item.emoji.id ?? item.emoji.name}`;
  }
}
