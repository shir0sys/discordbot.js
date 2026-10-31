import { Base } from "./Base";
import { Emoji, type APIEmoji } from "./Emoji";
import { User, type APIUser } from "./User";
import type { Client } from "../client/Client";

export interface APIMessageReaction {
  count: number;
  me: boolean;
  emoji: APIEmoji;
}

export class MessageReaction extends Base {
  public channelId: string;
  public messageId: string;
  public emoji: Emoji;
  public count: number;
  public me: boolean;

  constructor(client: Client, channelId: string, messageId: string, data: APIMessageReaction) {
    super(client);
    this.channelId = channelId;
    this.messageId = messageId;
    this.emoji = new Emoji(client, data.emoji);
    this.count = data.count;
    this.me = data.me;
  }

  private get encodedEmoji(): string {
    return encodeURIComponent(this.emoji.id ? `${this.emoji.name}:${this.emoji.id}` : (this.emoji.name ?? ""));
  }

  public async fetchUsers(limit = 100): Promise<User[]> {
    const data = await this.client.rest.get<APIUser[]>(
      `/channels/${this.channelId}/messages/${this.messageId}/reactions/${this.encodedEmoji}`,
      { limit },
    );
    return data.map((user) => new User(this.client, user));
  }

  public async removeAll(): Promise<void> {
    await this.client.rest.delete(
      `/channels/${this.channelId}/messages/${this.messageId}/reactions/${this.encodedEmoji}`,
    );
  }

  public async remove(userId = "@me"): Promise<void> {
    await this.client.rest.delete(
      `/channels/${this.channelId}/messages/${this.messageId}/reactions/${this.encodedEmoji}/${userId}`,
    );
  }
}
