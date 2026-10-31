import { Base } from "./Base";
import { User, type APIUser } from "./User";
import type { Client } from "../client/Client";

export interface APIMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  content: string;
  author: APIUser;
  timestamp: string;
  edited_timestamp: string | null;
}

export type MessagePayload = string | { content?: string; embeds?: unknown[]; components?: unknown[] };

export function normalizeMessagePayload(payload: MessagePayload): Record<string, unknown> {
  return typeof payload === "string" ? { content: payload } : payload;
}

export class Message extends Base {
  public id: string;
  public channelId: string;
  public guildId: string | null;
  public content: string;
  public author: User;
  public createdTimestamp: number;
  public editedTimestamp: number | null;

  constructor(client: Client, data: APIMessage) {
    super(client);
    this.id = data.id;
    this.channelId = data.channel_id;
    this.guildId = data.guild_id ?? null;
    this.content = data.content;
    this.author = new User(client, data.author);
    this.createdTimestamp = Date.parse(data.timestamp);
    this.editedTimestamp = data.edited_timestamp ? Date.parse(data.edited_timestamp) : null;
  }

  public async reply(payload: MessagePayload): Promise<Message> {
    const body = { ...normalizeMessagePayload(payload), message_reference: { message_id: this.id } };
    const data = await this.client.rest.post<APIMessage>(`/channels/${this.channelId}/messages`, body);
    return new Message(this.client, data);
  }

  public async edit(payload: MessagePayload): Promise<Message> {
    const data = await this.client.rest.patch<APIMessage>(
      `/channels/${this.channelId}/messages/${this.id}`,
      normalizeMessagePayload(payload),
    );
    return new Message(this.client, data);
  }

  public async delete(): Promise<void> {
    await this.client.rest.delete(`/channels/${this.channelId}/messages/${this.id}`);
  }

  public async react(emoji: string): Promise<void> {
    const encoded = encodeURIComponent(emoji);
    await this.client.rest.put(`/channels/${this.channelId}/messages/${this.id}/reactions/${encoded}/@me`);
  }
}
