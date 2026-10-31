import { Collection } from "./Collection";
import { Message, type APIMessage } from "../structures/Message";
import type { Client } from "../client/Client";

export class MessageManager extends Collection<string, Message> {
  constructor(private readonly client: Client, private readonly channelId: string) {
    super(null, 200);
  }

  public async fetch(id: string): Promise<Message> {
    const cached = this.get(id);
    if (cached) return cached;
    const data = await this.client.rest.get<APIMessage>(`/channels/${this.channelId}/messages/${id}`);
    const message = new Message(this.client, data);
    this.set(message.id, message);
    return message;
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
