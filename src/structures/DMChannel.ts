import { Channel, type APIChannel } from "./Channel";
import { Message, type APIMessage, type MessagePayload, normalizeMessagePayload } from "./Message";
import type { Client } from "../client/Client";

export class DMChannel extends Channel {
  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }

  public async send(payload: MessagePayload): Promise<Message> {
    const data = await this.client.rest.post<APIMessage>(
      `/channels/${this.id}/messages`,
      normalizeMessagePayload(payload),
    );
    return new Message(this.client, data);
  }
}
