import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APIThreadMember {
  id?: string;
  user_id?: string;
  join_timestamp: string;
  flags: number;
}

export class ThreadMember extends Base {
  public threadId: string;
  public userId: string;
  public joinedTimestamp: number;
  public flags: number;

  constructor(client: Client, threadId: string, data: APIThreadMember) {
    super(client);
    this.threadId = data.id ?? threadId;
    this.userId = data.user_id!;
    this.joinedTimestamp = Date.parse(data.join_timestamp);
    this.flags = data.flags;
  }

  public async remove(): Promise<void> {
    await this.client.rest.delete(`/channels/${this.threadId}/thread-members/${this.userId}`);
  }
}
