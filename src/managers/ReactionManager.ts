import { CachedManager } from "./CachedManager";
import { MessageReaction, type APIMessageReaction } from "../structures/MessageReaction";
import type { Client } from "../client/Client";

/** Keys by emoji id (custom emoji) or name (default emoji) — Discord has no other stable per-reaction identifier. */
export function reactionKey(emoji: { id: string | null; name: string | null }): string {
  return emoji.id ?? emoji.name ?? "unknown";
}

/** `message.reactions` — seeded from the message's own `reactions` summary, kept current by MESSAGE_REACTION_* dispatch in Client.ts. */
export class ReactionManager extends CachedManager<string, MessageReaction> {
  constructor(
    client: Client,
    private readonly channelId: string,
    private readonly messageId: string,
  ) {
    super(client);
  }

  public _add(data: APIMessageReaction): MessageReaction {
    const reaction = new MessageReaction(this.client, this.channelId, this.messageId, data);
    this.set(reactionKey(data.emoji), reaction);
    return reaction;
  }
}
