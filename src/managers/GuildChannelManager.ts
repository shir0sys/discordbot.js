import { CachedManager } from "./CachedManager";
import { Channel, type APIChannel } from "../structures/Channel";
import { createChannel } from "../structures/ChannelFactory";
import type { APIPermissionOverwrite } from "../util/Permissions";
import type { Client } from "../client/Client";

export interface GuildChannelCreateData {
  name: string;
  type?: number;
  topic?: string;
  parent_id?: string;
  nsfw?: boolean;
  rate_limit_per_user?: number;
  bitrate?: number;
  user_limit?: number;
  position?: number;
  permission_overwrites?: APIPermissionOverwrite[];
}

export class GuildChannelManager extends CachedManager<string, Channel> {
  constructor(
    client: Client,
    private readonly guildId: string,
  ) {
    super(client);
  }

  public async create(data: GuildChannelCreateData, reason?: string): Promise<Channel> {
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
