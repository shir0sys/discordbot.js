import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APIVoiceState {
  guild_id?: string;
  channel_id: string | null;
  user_id: string;
  session_id: string;
  deaf: boolean;
  mute: boolean;
  self_deaf: boolean;
  self_mute: boolean;
  self_stream?: boolean;
  self_video: boolean;
  suppress: boolean;
}

export class VoiceState extends Base {
  public guildId: string | null;
  public channelId: string | null;
  public userId: string;
  public sessionId: string;
  public deaf: boolean;
  public mute: boolean;
  public selfDeaf: boolean;
  public selfMute: boolean;
  public selfVideo: boolean;
  public streaming: boolean;
  public suppress: boolean;

  constructor(client: Client, data: APIVoiceState) {
    super(client);
    this.guildId = data.guild_id ?? null;
    this.channelId = data.channel_id;
    this.userId = data.user_id;
    this.sessionId = data.session_id;
    this.deaf = data.deaf;
    this.mute = data.mute;
    this.selfDeaf = data.self_deaf;
    this.selfMute = data.self_mute;
    this.selfVideo = data.self_video;
    this.streaming = data.self_stream ?? false;
    this.suppress = data.suppress;
  }
}
