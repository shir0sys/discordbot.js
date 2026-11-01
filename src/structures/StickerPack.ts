import { Sticker, type APISticker } from "./Sticker";
import type { Client } from "../client/Client";

export interface APIStickerPack {
  id: string;
  stickers: APISticker[];
  name: string;
  sku_id: string;
  cover_sticker_id?: string;
  description: string;
  banner_asset_id?: string;
}

/** One of Discord's built-in (non-guild) sticker packs, from GET /sticker-packs. */
export class StickerPack {
  public id: string;
  public name: string;
  public skuId: string;
  public coverStickerId: string | null;
  public description: string;
  public bannerAssetId: string | null;
  public stickers: Sticker[];

  constructor(client: Client, data: APIStickerPack) {
    this.id = data.id;
    this.name = data.name;
    this.skuId = data.sku_id;
    this.coverStickerId = data.cover_sticker_id ?? null;
    this.description = data.description;
    this.bannerAssetId = data.banner_asset_id ?? null;
    this.stickers = data.stickers.map((sticker) => new Sticker(client, sticker));
  }
}
