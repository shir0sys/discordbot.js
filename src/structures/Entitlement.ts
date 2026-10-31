import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APIEntitlement {
  id: string;
  sku_id: string;
  application_id: string;
  user_id?: string;
  guild_id?: string;
  deleted: boolean;
  starts_at: string | null;
  ends_at: string | null;
  consumed?: boolean;
}

export class Entitlement extends Base {
  public id: string;
  public skuId: string;
  public applicationId: string;
  public userId: string | null;
  public guildId: string | null;
  public deleted: boolean;
  public startsTimestamp: number | null;
  public endsTimestamp: number | null;
  public consumed: boolean;

  constructor(client: Client, data: APIEntitlement) {
    super(client);
    this.id = data.id;
    this.skuId = data.sku_id;
    this.applicationId = data.application_id;
    this.userId = data.user_id ?? null;
    this.guildId = data.guild_id ?? null;
    this.deleted = data.deleted;
    this.startsTimestamp = data.starts_at ? Date.parse(data.starts_at) : null;
    this.endsTimestamp = data.ends_at ? Date.parse(data.ends_at) : null;
    this.consumed = data.consumed ?? false;
  }

  public async consume(): Promise<void> {
    await this.client.rest.post(`/applications/${this.applicationId}/entitlements/${this.id}/consume`);
    this.consumed = true;
  }

  public async delete(): Promise<void> {
    await this.client.rest.delete(`/applications/${this.applicationId}/entitlements/${this.id}`);
  }
}
