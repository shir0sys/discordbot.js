import { CachedManager } from "./CachedManager";
import { Sticker, type APISticker } from "../structures/Sticker";
import type { RESTFile } from "../rest/REST";
import type { Client } from "../client/Client";

export class GuildStickerManager extends CachedManager<string, Sticker> {
  constructor(
    client: Client,
    private readonly guildId: string,
  ) {
    super(client);
  }

  public async create(
    data: { name: string; description: string; tags: string; file: RESTFile },
    reason?: string,
  ): Promise<Sticker> {
    const payload = await this.client.rest.post<APISticker>(
      `/guilds/${this.guildId}/stickers`,
      { name: data.name, description: data.description, tags: data.tags },
      reason,
      [data.file],
    );
    const sticker = new Sticker(this.client, payload);
    this.set(sticker.id, sticker);
    return sticker;
  }

  public async fetchAll(): Promise<Sticker[]> {
    const data = await this.client.rest.get<APISticker[]>(`/guilds/${this.guildId}/stickers`);
    this.clear();
    return data.map((raw) => {
      const sticker = new Sticker(this.client, raw);
      this.set(sticker.id, sticker);
      return sticker;
    });
  }
}
