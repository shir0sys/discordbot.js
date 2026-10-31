import { CachedManager } from "./CachedManager";
import { Channel, type APIChannel } from "../structures/Channel";
import { createChannel } from "../structures/ChannelFactory";
import type { Client } from "../client/Client";

export class ChannelManager extends CachedManager<string, Channel> {
  constructor(client: Client) {
    super(client, 1000);
  }

  public async fetch(id: string, options: { force?: boolean } = {}): Promise<Channel> {
    if (!options.force) {
      const cached = this.get(id);
      if (cached) return cached;
    }
    return this.fetchAndCache<APIChannel>(id, `/channels/${id}`, (data) => createChannel(this.client, data));
  }
}
