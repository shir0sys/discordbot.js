import type { AuditLogEvent } from "../util/Constants";

export interface APIAuditLogChange {
  key: string;
  old_value?: unknown;
  new_value?: unknown;
}

/** Extra action-specific context Discord attaches to certain audit log entries (e.g. delete_member_days for a prune, count for a bulk delete). */
export interface APIAuditLogOptions {
  delete_member_days?: string;
  members_removed?: string;
  channel_id?: string;
  message_id?: string;
  count?: string;
  id?: string;
  type?: string;
  role_name?: string;
  application_id?: string;
  auto_moderation_rule_name?: string;
  auto_moderation_rule_trigger_type?: string;
  integration_type?: string;
}

export interface APIAuditLogEntry {
  id: string;
  user_id: string | null;
  target_id: string | null;
  action_type: AuditLogEvent;
  reason?: string;
  changes?: APIAuditLogChange[];
  options?: APIAuditLogOptions;
}

export class AuditLogEntry {
  public id: string;
  public userId: string | null;
  public targetId: string | null;
  public actionType: AuditLogEvent;
  public reason: string | null;
  public changes: Map<string, { old?: unknown; new?: unknown }>;
  public options: APIAuditLogOptions | null;

  constructor(data: APIAuditLogEntry) {
    this.id = data.id;
    this.userId = data.user_id;
    this.targetId = data.target_id;
    this.actionType = data.action_type;
    this.reason = data.reason ?? null;
    this.changes = new Map(
      (data.changes ?? []).map((change) => [change.key, { old: change.old_value, new: change.new_value }]),
    );
    this.options = data.options ?? null;
  }

  public getChange<Old = unknown, New = unknown>(key: string): { old?: Old; new?: New } | undefined {
    return this.changes.get(key) as { old?: Old; new?: New } | undefined;
  }
}
