import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APISoundboardSound {
  sound_id: string;
  name: string;
  volume: number;
  emoji_id: string | null;
  emoji_name: string | null;
  guild_id?: string;
  available: boolean;
}

export class SoundboardSound extends Base {
  public id: string;
  public name: string;
  public volume: number;
  public emojiId: string | null;
  public emojiName: string | null;
  public guildId: string | null;
  public available: boolean;

  constructor(client: Client, data: APISoundboardSound) {
    super(client);
    this.id = data.sound_id;
    this.name = data.name;
    this.volume = data.volume;
    this.emojiId = data.emoji_id;
    this.emojiName = data.emoji_name;
    this.guildId = data.guild_id ?? null;
    this.available = data.available;
  }

  public async edit(
    data: Partial<{ name: string; volume: number; emoji_id: string | null; emoji_name: string | null }>,
    reason?: string,
  ): Promise<void> {
    if (!this.guildId) throw new Error("Cannot edit a default soundboard sound");
    await this.client.rest.patch(`/guilds/${this.guildId}/soundboard-sounds/${this.id}`, data, reason);
  }

  public async delete(reason?: string): Promise<void> {
    if (!this.guildId) throw new Error("Cannot delete a default soundboard sound");
    await this.client.rest.delete(`/guilds/${this.guildId}/soundboard-sounds/${this.id}`, reason);
  }
}
