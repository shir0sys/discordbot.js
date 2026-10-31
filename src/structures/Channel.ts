import { Base } from "./Base";
import { ChannelType } from "../util/Constants";
import type { Client } from "../client/Client";

export interface APIChannel {
  id: string;
  type: ChannelType;
  guild_id?: string;
  name?: string | null;
  bitrate?: number;
  user_limit?: number;
  recipients?: unknown[];
}

export class Channel extends Base {
  public id: string;
  public type: ChannelType;

  constructor(client: Client, data: APIChannel) {
    super(client);
    this.id = data.id;
    this.type = data.type;
  }

  public isText(): this is import("./TextChannel").TextChannel {
    return this.type === ChannelType.GuildText || this.type === ChannelType.GuildAnnouncement;
  }

  public isVoice(): this is import("./VoiceChannel").VoiceChannel {
    return this.type === ChannelType.GuildVoice || this.type === ChannelType.GuildStageVoice;
  }

  public isDM(): this is import("./DMChannel").DMChannel {
    return this.type === ChannelType.DM;
  }

  public toString(): string {
    return `<#${this.id}>`;
  }
}
