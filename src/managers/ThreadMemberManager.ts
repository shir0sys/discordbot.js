import { Collection } from "./Collection";
import { ThreadMember, type APIThreadMember } from "../structures/ThreadMember";
import type { Client } from "../client/Client";

export class ThreadMemberManager extends Collection<string, ThreadMember> {
  constructor(private readonly client: Client, private readonly threadId: string) {
    super();
  }

  public async fetch(userId: string): Promise<ThreadMember> {
    const data = await this.client.rest.get<APIThreadMember>(`/channels/${this.threadId}/thread-members/${userId}`, {
      with_member: true,
    });
    const member = new ThreadMember(this.client, this.threadId, data);
    this.set(member.userId, member);
    return member;
  }

  public async fetchAll(): Promise<ThreadMember[]> {
    const data = await this.client.rest.get<APIThreadMember[]>(`/channels/${this.threadId}/thread-members`, {
      with_member: true,
    });
    this.clear();
    return data.map((raw) => {
      const member = new ThreadMember(this.client, this.threadId, raw);
      this.set(member.userId, member);
      return member;
    });
  }

  public async add(userId: string): Promise<void> {
    await this.client.rest.put(`/channels/${this.threadId}/thread-members/${userId}`);
  }

  public async remove(userId: string): Promise<void> {
    await this.client.rest.delete(`/channels/${this.threadId}/thread-members/${userId}`);
    this.delete(userId);
  }
}
