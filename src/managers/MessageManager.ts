import { CachedManager } from "./CachedManager";
import { Message, type APIMessage } from "../structures/Message";
import type { Client } from "../client/Client";

export class MessageManager extends CachedManager<string, Message> {
  constructor(
    client: Client,
    private readonly channelId: string,
  ) {
    // Cached messages older than an hour are swept even if the 200-entry cap isn't hit —
    // most bots never look back that far, and it keeps long-lived channels from pinning memory.
    super(client, 200, { maxAgeMs: 60 * 60 * 1000 });
  }

  public fetch(id: string): Promise<Message> {
    const cached = this.get(id);
    if (cached) return Promise.resolve(cached);
    return this.fetchAndCache<APIMessage>(
      id,
      `/channels/${this.channelId}/messages/${id}`,
      (data) => new Message(this.client, data),
    );
  }

  public async fetchMany(options: { limit?: number; before?: string; after?: string } = {}): Promise<Message[]> {
    const data = await this.client.rest.get<APIMessage[]>(`/channels/${this.channelId}/messages`, options);
    return data.map((raw) => {
      const message = new Message(this.client, raw);
      this.set(message.id, message);
      return message;
    });
  }

  public async bulkDelete(messageIds: string[], reason?: string): Promise<void> {
    await this.client.rest.post(`/channels/${this.channelId}/messages/bulk-delete`, { messages: messageIds }, reason);
    for (const id of messageIds) this.delete(id);
  }
}
