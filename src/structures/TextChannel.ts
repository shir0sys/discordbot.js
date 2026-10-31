import { Channel, type APIChannel } from "./Channel";
import { Message, type APIMessage, type MessagePayload, normalizeMessagePayload } from "./Message";
import { MessageManager } from "../managers/MessageManager";
import { ThreadManager } from "../managers/ThreadManager";
import { MessageCollector } from "./MessageCollector";
import type { CollectorOptions } from "../util/Collector";
import type { Collection } from "../managers/Collection";
import type { Client } from "../client/Client";

export class TextChannel extends Channel {
  public guildId: string;
  public name: string | null;
  public topic: string | null;
  public nsfw: boolean;
  public rateLimitPerUser: number;
  public lastMessageId: string | null;
  public readonly messages: MessageManager;
  public readonly threads: ThreadManager;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.guildId = data.guild_id!;
    this.name = data.name ?? null;
    this.topic = data.topic ?? null;
    this.nsfw = data.nsfw ?? false;
    this.rateLimitPerUser = data.rate_limit_per_user ?? 0;
    this.lastMessageId = data.last_message_id ?? null;
    this.messages = new MessageManager(client, this.id);
    this.threads = new ThreadManager(client, this.id);
  }

  public async send(payload: MessagePayload): Promise<Message> {
    const { body, files } = normalizeMessagePayload(payload);
    const data = await this.client.rest.post<APIMessage>(`/channels/${this.id}/messages`, body, undefined, files);
    return new Message(this.client, data);
  }

  public async sendTyping(): Promise<void> {
    await this.client.rest.post(`/channels/${this.id}/typing`);
  }

  public async fetchPins(): Promise<Message[]> {
    const data = await this.client.rest.get<APIMessage[]>(`/channels/${this.id}/pins`);
    return data.map((message) => new Message(this.client, message));
  }

  public createMessageCollector(options?: CollectorOptions<Message>): MessageCollector {
    return new MessageCollector(this.client, this.id, options);
  }

  public awaitMessages(options?: CollectorOptions<Message>): Promise<Collection<string, Message>> {
    return new Promise((resolve) => {
      const collector = this.createMessageCollector(options);
      collector.once("end", (collected) => resolve(collected));
    });
  }
}
