import { SKU, type APISKU } from "../structures/SKU";
import { Entitlement, type APIEntitlement } from "../structures/Entitlement";
import type { Client } from "../client/Client";

export class MonetizationManager {
  constructor(private readonly client: Client) {}

  private appId(): string {
    const id = this.client.user?.id ?? this.client.applicationId;
    if (!id) throw new Error("Cannot use monetization endpoints before the client is ready");
    return id;
  }

  public async fetchSKUs(): Promise<SKU[]> {
    const data = await this.client.rest.get<APISKU[]>(`/applications/${this.appId()}/skus`);
    return data.map((sku) => new SKU(sku));
  }

  public async fetchEntitlements(options: { userId?: string; guildId?: string; skuIds?: string[] } = {}): Promise<Entitlement[]> {
    const data = await this.client.rest.get<APIEntitlement[]>(`/applications/${this.appId()}/entitlements`, {
      user_id: options.userId,
      guild_id: options.guildId,
      sku_ids: options.skuIds?.join(","),
    });
    return data.map((entitlement) => new Entitlement(this.client, entitlement));
  }

  public async createTestEntitlement(data: { skuId: string; ownerId: string; ownerType: 1 | 2 }): Promise<Entitlement> {
    const payload = await this.client.rest.post<APIEntitlement>(`/applications/${this.appId()}/entitlements`, {
      sku_id: data.skuId,
      owner_id: data.ownerId,
      owner_type: data.ownerType,
    });
    return new Entitlement(this.client, payload);
  }

  public async deleteTestEntitlement(entitlementId: string): Promise<void> {
    await this.client.rest.delete(`/applications/${this.appId()}/entitlements/${entitlementId}`);
  }
}
