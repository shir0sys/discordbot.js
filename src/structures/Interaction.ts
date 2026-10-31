import { Base } from "./Base";
import { User, type APIUser } from "./User";
import { InteractionResponseType, InteractionType } from "../util/Constants";
import type { Client } from "../client/Client";

export interface APIInteraction {
  id: string;
  application_id: string;
  type: InteractionType;
  token: string;
  channel_id?: string;
  guild_id?: string;
  member?: { user: APIUser };
  user?: APIUser;
  data?: {
    id: string;
    name: string;
    type: number;
    options?: { name: string; value?: string | number | boolean; type: number }[];
  };
}

/**
 * Base interaction wrapper. Responses are sent via the interaction callback
 * endpoint (token-authenticated, not bot-token), separate from the REST
 * client's bot-auth requests.
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

  protected async callback(type: InteractionResponseType, data?: unknown): Promise<void> {
    if (this.replied) throw new Error("Interaction has already received a response");
    this.replied = true;
    await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, { type, data });
  }

  public async deferReply(): Promise<void> {
    await this.callback(InteractionResponseType.DeferredChannelMessageWithSource);
  }
}
