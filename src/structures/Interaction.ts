import { Base } from "./Base";
import { User, type APIUser } from "./User";
import { InteractionResponseType, InteractionType } from "../util/Constants";
import { normalizeMessagePayload, type MessagePayload } from "./Message";
import type { JSONEncodable } from "../builders/Components";
import type { ModalBuilder } from "../builders/Modal";
import type { Client } from "../client/Client";

export interface APIInteractionOption {
  name: string;
  value?: string | number | boolean;
  type: number;
  focused?: boolean;
  options?: APIInteractionOption[];
}

export interface APIInteractionData {
  id: string;
  name: string;
  type: number;
  custom_id?: string;
  component_type?: number;
  values?: string[];
  options?: APIInteractionOption[];
  components?: { components: { custom_id: string; value: string }[] }[];
  target_id?: string;
}

export interface APIInteraction {
  id: string;
  application_id: string;
  type: InteractionType;
  token: string;
  channel_id?: string;
  guild_id?: string;
  member?: { user: APIUser };
  user?: APIUser;
  message?: { id: string; channel_id: string };
  data?: APIInteractionData;
}

/**
 * Base interaction wrapper shared by commands, message components, modal
 * submissions and autocomplete requests. Responses go through the
 * interaction callback endpoint (token-authenticated, separate from the
 * REST client's bot-token requests) and are one-shot: a second callback
 * requires the webhook-style follow-up/edit endpoints instead.
 */
export class Interaction extends Base {
  public id: string;
  public applicationId: string;
  public type: InteractionType;
  public token: string;
  public channelId: string | null;
  public guildId: string | null;
  public user: User;

  private replied = false;
  private deferred = false;

  constructor(client: Client, data: APIInteraction) {
    super(client);
    this.id = data.id;
    this.applicationId = data.application_id;
    this.type = data.type;
    this.token = data.token;
    this.channelId = data.channel_id ?? null;
    this.guildId = data.guild_id ?? null;
    this.user = new User(client, data.member?.user ?? data.user!);
  }

  public isCommand(): this is import("./CommandInteraction").CommandInteraction {
    return this.type === InteractionType.ApplicationCommand;
  }

  public isMessageComponent(): this is import("./MessageComponentInteraction").MessageComponentInteraction {
    return this.type === InteractionType.MessageComponent;
  }

  public isModalSubmit(): this is import("./ModalSubmitInteraction").ModalSubmitInteraction {
    return this.type === InteractionType.ModalSubmit;
  }

  public isAutocomplete(): this is import("./AutocompleteInteraction").AutocompleteInteraction {
    return this.type === InteractionType.ApplicationCommandAutocomplete;
  }

  protected async callback(
    type: InteractionResponseType,
    data?: unknown,
    files?: import("../rest/REST").RESTFile[],
  ): Promise<void> {
    if (this.replied) throw new Error("Interaction has already received a response");
    this.replied = true;
    await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, { type, data }, undefined, files);
  }

  public async reply(payload: MessagePayload): Promise<void> {
    const { body, files } = normalizeMessagePayload(payload);
    await this.callback(InteractionResponseType.ChannelMessageWithSource, body, files);
  }

  public async deferReply(ephemeral = false): Promise<void> {
    this.deferred = true;
    await this.callback(InteractionResponseType.DeferredChannelMessageWithSource, {
      flags: ephemeral ? 1 << 6 : undefined,
    });
  }

  public async editReply(payload: MessagePayload): Promise<void> {
    const { body, files } = normalizeMessagePayload(payload);
    await this.client.rest.patch(
      `/webhooks/${this.applicationId}/${this.token}/messages/@original`,
      body,
      undefined,
      files,
    );
  }

  public async followUp(payload: MessagePayload): Promise<void> {
    const { body, files } = normalizeMessagePayload(payload);
    await this.client.rest.post(`/webhooks/${this.applicationId}/${this.token}`, body, undefined, files);
  }

  /** Updates the message the component is attached to (component interactions only). */
  public async update(payload: MessagePayload): Promise<void> {
    const { body, files } = normalizeMessagePayload(payload);
    await this.callback(InteractionResponseType.UpdateMessage, body, files);
  }

  public async deferUpdate(): Promise<void> {
    this.deferred = true;
    await this.callback(InteractionResponseType.DeferredUpdateMessage);
  }

  public async showModal(modal: ModalBuilder | JSONEncodable): Promise<void> {
    await this.callback(InteractionResponseType.Modal, modal.toJSON());
  }
}
