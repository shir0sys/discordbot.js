import { Channel, type APIChannel } from "./Channel";
import type { Client } from "../client/Client";

export class VoiceChannel extends Channel {
  public guildId: string;
  public name: string | null;
  public bitrate: number;
  public userLimit: number;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.guildId = data.guild_id!;
    this.name = data.name ?? null;
    this.bitrate = data.bitrate ?? 64000;
    this.userLimit = data.user_limit ?? 0;
  }
}
