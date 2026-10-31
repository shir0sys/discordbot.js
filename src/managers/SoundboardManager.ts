import { SoundboardSound, type APISoundboardSound } from "../structures/SoundboardSound";
import type { Client } from "../client/Client";

export class SoundboardManager {
  constructor(private readonly client: Client) {}

  public async fetchDefaultSounds(): Promise<SoundboardSound[]> {
    const data = await this.client.rest.get<APISoundboardSound[]>("/soundboard-default-sounds");
    return data.map((sound) => new SoundboardSound(this.client, sound));
  }

  public async play(channelId: string, data: { soundId: string; sourceGuildId?: string }): Promise<void> {
    await this.client.rest.post(`/channels/${channelId}/send-soundboard-sound`, {
      sound_id: data.soundId,
      source_guild_id: data.sourceGuildId,
    });
  }
}

export class GuildSoundboardManager {
  constructor(
    private readonly client: Client,
    private readonly guildId: string,
  ) {}

  public async list(): Promise<SoundboardSound[]> {
    const data = await this.client.rest.get<{ items: APISoundboardSound[] }>(
      `/guilds/${this.guildId}/soundboard-sounds`,
    );
    return data.items.map((sound) => new SoundboardSound(this.client, sound));
  }

  /** `sound` is a base64 data URI (e.g. "data:audio/ogg;base64,...") — Discord takes audio uploads inline in JSON here, not as multipart. */
  public async create(
    data: { name: string; sound: string; volume?: number; emoji_id?: string; emoji_name?: string },
    reason?: string,
  ): Promise<SoundboardSound> {
    const payload = await this.client.rest.post<APISoundboardSound>(
      `/guilds/${this.guildId}/soundboard-sounds`,
      { name: data.name, sound: data.sound, volume: data.volume, emoji_id: data.emoji_id, emoji_name: data.emoji_name },
      reason,
    );
    return new SoundboardSound(this.client, payload);
  }
}
