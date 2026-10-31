import { Collection } from "./Collection";
import { Channel, type APIChannel } from "../structures/Channel";
import { createChannel } from "../structures/Guild";
import type { Client } from "../client/Client";

export class ChannelManager {
  public readonly cache = new Collection<string, Channel>(null, 1000);

  constructor(private readonly client: Client) {}

  public async fetch(id: string): Promise<Channel> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const data = await this.client.rest.get<APIChannel>(`/channels/${id}`);
    const channel = createChannel(this.client, data);
    this.cache.set(channel.id, channel);
    return channel;
  }
}
