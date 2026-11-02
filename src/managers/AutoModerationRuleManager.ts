import { CachedManager } from "./CachedManager";
import { AutoModerationRule, type APIAutoModerationRule } from "../structures/AutoModerationRule";
import type { Client } from "../client/Client";

export interface AutoModerationRuleCreateData {
  name: string;
  event_type: number;
  trigger_type: number;
  trigger_metadata?: Record<string, unknown>;
  actions: Record<string, unknown>[];
  enabled?: boolean;
  exempt_roles?: string[];
  exempt_channels?: string[];
}

export class AutoModerationRuleManager extends CachedManager<string, AutoModerationRule> {
  constructor(
    client: Client,
    private readonly guildId: string,
  ) {
    super(client);
  }

  public async fetchAll(): Promise<AutoModerationRule[]> {
    const data = await this.client.rest.get<APIAutoModerationRule[]>(`/guilds/${this.guildId}/auto-moderation/rules`);
    this.clear();
    return data.map((raw) => {
      const rule = new AutoModerationRule(this.client, raw);
      this.set(rule.id, rule);
      return rule;
    });
  }

  public async fetch(ruleId: string): Promise<AutoModerationRule> {
    const data = await this.client.rest.get<APIAutoModerationRule>(
      `/guilds/${this.guildId}/auto-moderation/rules/${ruleId}`,
    );
    const rule = new AutoModerationRule(this.client, data);
    this.set(rule.id, rule);
    return rule;
  }

  public async create(data: AutoModerationRuleCreateData, reason?: string): Promise<AutoModerationRule> {
    const payload = await this.client.rest.post<APIAutoModerationRule>(
      `/guilds/${this.guildId}/auto-moderation/rules`,
      data,
      reason,
    );
    const rule = new AutoModerationRule(this.client, payload);
    this.set(rule.id, rule);
    return rule;
  }

  public async remove(ruleId: string, reason?: string): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/auto-moderation/rules/${ruleId}`, reason);
    this.delete(ruleId);
  }
}
