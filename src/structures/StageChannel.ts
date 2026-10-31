import { VoiceChannel } from "./VoiceChannel";
import { StageInstance, type APIStageInstance } from "./StageInstance";
import type { APIChannel } from "./Channel";
import type { Client } from "../client/Client";

export class StageChannel extends VoiceChannel {
  public topic: string | null;

  constructor(client: Client, data: APIChannel & { topic?: string | null }) {
    super(client, data);
    this.topic = data.topic ?? null;
  }

  public async createStageInstance(data: { topic: string; privacy_level?: number }, reason?: string): Promise<StageInstance> {
    const payload = await this.client.rest.post<APIStageInstance>(
      "/stage-instances",
      { channel_id: this.id, ...data },
      reason,
    );
    return new StageInstance(this.client, payload);
  }

  public async fetchStageInstance(): Promise<StageInstance> {
    const payload = await this.client.rest.get<APIStageInstance>(`/stage-instances/${this.id}`);
    return new StageInstance(this.client, payload);
  }
}
