import { Collection } from "./Collection";
import { Channel, type APIChannel } from "../structures/Channel";
import { createChannel } from "../structures/ChannelFactory";
import type { Client } from "../client/Client";

export class GuildChannelManager extends Collection<string, Channel> {
  constructor(
    private readonly client: Client,
    private readonly guildId: string,
  ) {
    super();
  }

  public async create(data: { name: string; type?: number; parent_id?: string }, reason?: string): Promise<Channel> {
    const payload = await this.client.rest.post<APIChannel>(`/guilds/${this.guildId}/channels`, data, reason);
    const channel = createChannel(this.client, payload);
    this.set(channel.id, channel);
    return channel;
  }

  public async fetchAll(): Promise<Channel[]> {
    const data = await this.client.rest.get<APIChannel[]>(`/guilds/${this.guildId}/channels`);
    this.clear();
    return data.map((raw) => {
      const channel = createChannel(this.client, raw);
      this.set(channel.id, channel);
      return channel;
    });
  }

  public async setPositions(positions: { id: string; position: number }[]): Promise<void> {
    await this.client.rest.patch(`/guilds/${this.guildId}/channels`, positions);
  }
}
