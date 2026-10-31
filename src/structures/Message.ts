import { Base } from "./Base";
import { User, type APIUser } from "./User";
import { AttachmentBuilder } from "../builders/AttachmentBuilder";
import { ReactionCollector, type CollectedReaction } from "./ReactionCollector";
import { InteractionCollector, type InteractionCollectorOptions } from "./InteractionCollector";
import type { JSONEncodable } from "../builders/Components";
import type { APIEmbed } from "../builders/EmbedBuilder";
import type { RESTFile } from "../rest/REST";
import type { CollectorOptions } from "../util/Collector";
import type { Collection } from "../managers/Collection";
import type { MessageComponentInteraction } from "./MessageComponentInteraction";
import type { Client } from "../client/Client";

export interface APIAttachment {
  id: string;
  filename: string;
  description?: string;
  content_type?: string;
  size: number;
  url: string;
  proxy_url: string;
  height?: number | null;
  width?: number | null;
  ephemeral?: boolean;
}

export interface APIMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  content: string;
  author: APIUser;
  timestamp: string;
  edited_timestamp: string | null;
  attachments: APIAttachment[];
}

export interface MessageCreateData {
  content?: string;
  embeds?: (APIEmbed | JSONEncodable)[];
  components?: JSONEncodable[];
  files?: AttachmentBuilder[];
  poll?: JSONEncodable;
  stickerIds?: string[];
  flags?: number;
}

export type MessagePayload = string | MessageCreateData;

function resolve(value: APIEmbed | JSONEncodable): unknown {
  return typeof (value as JSONEncodable).toJSON === "function" ? (value as JSONEncodable).toJSON() : value;
}

export interface ResolvedPayload {
  body: Record<string, unknown>;
  files?: RESTFile[];
}

export function normalizeMessagePayload(payload: MessagePayload): ResolvedPayload {
  if (typeof payload === "string") return { body: { content: payload } };

  const { files, stickerIds, ...rest } = payload;
  const body: Record<string, unknown> = {
    ...rest,
    embeds: payload.embeds?.map(resolve),
    components: payload.components?.map(resolve),
    poll: payload.poll?.toJSON(),
    sticker_ids: stickerIds,
  };
  if (files?.length) body.attachments = files.map((file, index) => ({ id: index, ...file.toJSON() }));

  return { body, files: files?.map((file) => file.toFile()) };
}

export class Message extends Base {
  public id: string;
  public channelId: string;
  public guildId: string | null;
  public content: string;
  public author: User;
  public createdTimestamp: number;
  public editedTimestamp: number | null;
  public attachments: APIAttachment[];

  constructor(client: Client, data: APIMessage) {
    super(client);
    this.id = data.id;
    this.channelId = data.channel_id;
    this.guildId = data.guild_id ?? null;
    this.content = data.content;
    this.author = new User(client, data.author);
    this.createdTimestamp = Date.parse(data.timestamp);
    this.editedTimestamp = data.edited_timestamp ? Date.parse(data.edited_timestamp) : null;
    this.attachments = data.attachments ?? [];
  }

  public async reply(payload: MessagePayload): Promise<Message> {
    const { body, files } = normalizeMessagePayload(payload);
    body.message_reference = { message_id: this.id };
    const data = await this.client.rest.post<APIMessage>(
      `/channels/${this.channelId}/messages`,
      body,
      undefined,
      files,
    );
    return new Message(this.client, data);
  }

  public async edit(payload: MessagePayload): Promise<Message> {
    const { body, files } = normalizeMessagePayload(payload);
    const data = await this.client.rest.patch<APIMessage>(
      `/channels/${this.channelId}/messages/${this.id}`,
      body,
      undefined,
      files,
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

  public async removeReaction(emoji: string, userId = "@me"): Promise<void> {
    const encoded = encodeURIComponent(emoji);
    await this.client.rest.delete(`/channels/${this.channelId}/messages/${this.id}/reactions/${encoded}/${userId}`);
  }

  public async pin(reason?: string): Promise<void> {
    await this.client.rest.put(`/channels/${this.channelId}/pins/${this.id}`, undefined, reason);
  }

  public async unpin(reason?: string): Promise<void> {
    await this.client.rest.delete(`/channels/${this.channelId}/pins/${this.id}`, reason);
  }

  public createReactionCollector(options?: CollectorOptions<CollectedReaction>): ReactionCollector {
    return new ReactionCollector(this.client, this.id, options);
  }

  public awaitReactions(options?: CollectorOptions<CollectedReaction>): Promise<Collection<string, CollectedReaction>> {
    return new Promise((resolve) => {
      const collector = this.createReactionCollector(options);
      collector.once("end", (collected) => resolve(collected));
    });
  }

  public awaitMessageComponent(options?: InteractionCollectorOptions): Promise<MessageComponentInteraction> {
    return new Promise((resolve) => {
      const collector = new InteractionCollector(this.client, { ...options, messageId: this.id, max: 1 });
      collector.once("collect", (interaction) => resolve(interaction));
    });
  }
}
