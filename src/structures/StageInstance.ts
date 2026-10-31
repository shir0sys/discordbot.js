import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APIStageInstance {
  id: string;
  guild_id: string;
  channel_id: string;
  topic: string;
  privacy_level: number;
}

export class StageInstance extends Base {
  public id: string;
  public guildId: string;
  public channelId: string;
  public topic: string;
  public privacyLevel: number;

  constructor(client: Client, data: APIStageInstance) {
    super(client);
    this.id = data.id;
    this.guildId = data.guild_id;
    this.channelId = data.channel_id;
    this.topic = data.topic;
    this.privacyLevel = data.privacy_level;
  }

  public async edit(data: Partial<{ topic: string; privacy_level: number }>, reason?: string): Promise<void> {
    await this.client.rest.patch(`/stage-instances/${this.channelId}`, data, reason);
  }

  public async delete(reason?: string): Promise<void> {
    await this.client.rest.delete(`/stage-instances/${this.channelId}`, reason);
  }
}
