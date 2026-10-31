import { Channel, type APIChannel } from "./Channel";
import { Message, type APIMessage, type MessagePayload, normalizeMessagePayload } from "./Message";
import type { Client } from "../client/Client";

export interface APIThreadMetadata {
  archived: boolean;
  auto_archive_duration: number;
  archive_timestamp: string;
  locked: boolean;
  invitable?: boolean;
}

export interface APIThreadChannel extends APIChannel {
  thread_metadata?: APIThreadMetadata;
  member_count?: number;
  message_count?: number;
  owner_id?: string;
}

export class ThreadChannel extends Channel {
  public guildId: string;
  public name: string | null;
  public ownerId: string | null;
  public archived: boolean;
  public locked: boolean;
  public autoArchiveDuration: number;
  public memberCount: number;
  public messageCount: number;

  constructor(client: Client, data: APIThreadChannel) {
    super(client, data);
    this.guildId = data.guild_id!;
    this.name = data.name ?? null;
    this.ownerId = data.owner_id ?? null;
    this.archived = data.thread_metadata?.archived ?? false;
    this.locked = data.thread_metadata?.locked ?? false;
    this.autoArchiveDuration = data.thread_metadata?.auto_archive_duration ?? 1440;
    this.memberCount = data.member_count ?? 0;
    this.messageCount = data.message_count ?? 0;
  }

  public async send(payload: MessagePayload): Promise<Message> {
    const { body, files } = normalizeMessagePayload(payload);
    const data = await this.client.rest.post<APIMessage>(`/channels/${this.id}/messages`, body, undefined, files);
    return new Message(this.client, data);
  }

  public async join(): Promise<void> {
    await this.client.rest.put(`/channels/${this.id}/thread-members/@me`);
  }

  public async leave(): Promise<void> {
    await this.client.rest.delete(`/channels/${this.id}/thread-members/@me`);
  }

  public async addMember(userId: string): Promise<void> {
    await this.client.rest.put(`/channels/${this.id}/thread-members/${userId}`);
  }

  public async removeMember(userId: string): Promise<void> {
    await this.client.rest.delete(`/channels/${this.id}/thread-members/${userId}`);
  }

  public async setArchived(archived = true, reason?: string): Promise<void> {
    await this.client.rest.patch(`/channels/${this.id}`, { archived }, reason);
    this.archived = archived;
  }

  public async setLocked(locked = true, reason?: string): Promise<void> {
    await this.client.rest.patch(`/channels/${this.id}`, { locked }, reason);
    this.locked = locked;
  }
}
