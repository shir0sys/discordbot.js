import { ThreadChannel, type APIThreadChannel } from "../structures/ThreadChannel";
import type { Client } from "../client/Client";

export class ThreadManager {
  constructor(
    private readonly client: Client,
    private readonly channelId: string,
  ) {}

  public async createFromMessage(
    messageId: string,
    data: { name: string; auto_archive_duration?: number },
    reason?: string,
  ): Promise<ThreadChannel> {
    const payload = await this.client.rest.post<APIThreadChannel>(
      `/channels/${this.channelId}/messages/${messageId}/threads`,
      data,
      reason,
    );
    return new ThreadChannel(this.client, payload);
  }

  public async create(
    data: { name: string; auto_archive_duration?: number; type?: number; invitable?: boolean },
    reason?: string,
  ): Promise<ThreadChannel> {
    const payload = await this.client.rest.post<APIThreadChannel>(`/channels/${this.channelId}/threads`, data, reason);
    return new ThreadChannel(this.client, payload);
  }

  public async fetchActive(): Promise<ThreadChannel[]> {
    const data = await this.client.rest.get<{ threads: APIThreadChannel[] }>(
      `/channels/${this.channelId}/threads/active`,
    );
    return data.threads.map((thread) => new ThreadChannel(this.client, thread));
  }

  public async fetchArchivedPublic(): Promise<ThreadChannel[]> {
    const data = await this.client.rest.get<{ threads: APIThreadChannel[] }>(
      `/channels/${this.channelId}/threads/archived/public`,
    );
    return data.threads.map((thread) => new ThreadChannel(this.client, thread));
  }
}
