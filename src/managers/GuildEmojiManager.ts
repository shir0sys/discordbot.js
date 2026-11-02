import { CachedManager } from "./CachedManager";
import { GuildEmoji, type APIEmoji } from "../structures/Emoji";
import type { Client } from "../client/Client";

export class GuildEmojiManager extends CachedManager<string, GuildEmoji> {
  constructor(
    client: Client,
    private readonly guildId: string,
  ) {
    super(client);
  }

  /** `image` is a base64 data URI (e.g. "data:image/png;base64,...") per Discord's image-upload convention. */
  public async create(data: { name: string; image: string; roles?: string[] }, reason?: string): Promise<GuildEmoji> {
    const payload = await this.client.rest.post<APIEmoji>(`/guilds/${this.guildId}/emojis`, data, reason);
    const emoji = new GuildEmoji(this.client, this.guildId, payload);
    this.set(emoji.id!, emoji);
    return emoji;
  }

  public async fetchAll(): Promise<GuildEmoji[]> {
    const data = await this.client.rest.get<APIEmoji[]>(`/guilds/${this.guildId}/emojis`);
    this.clear();
    return data
      .filter((e) => e.id)
      .map((raw) => {
        const emoji = new GuildEmoji(this.client, this.guildId, raw);
        this.set(emoji.id!, emoji);
        return emoji;
      });
  }
}
