import { Channel, type APIChannel } from "./Channel";
import { Message, type APIMessage, type MessagePayload, normalizeMessagePayload } from "./Message";
import type { Client } from "../client/Client";

export class TextChannel extends Channel {
  public guildId: string;
  public name: string | null;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.guildId = data.guild_id!;
    this.name = data.name ?? null;
  }

  public async send(payload: MessagePayload): Promise<Message> {
    const data = await this.client.rest.post<APIMessage>(
      `/channels/${this.id}/messages`,
      normalizeMessagePayload(payload),
    );
    return new Message(this.client, data);
  }
}
