export interface APIAuditLogChange {
  key: string;
  old_value?: unknown;
  new_value?: unknown;
}

export interface APIAuditLogEntry {
  id: string;
  user_id: string | null;
  target_id: string | null;
  action_type: number;
  reason?: string;
  changes?: APIAuditLogChange[];
}

export class AuditLogEntry {
  public id: string;
  public userId: string | null;
  public targetId: string | null;
  public actionType: number;
  public reason: string | null;
  public changes: Map<string, { old?: unknown; new?: unknown }>;

  constructor(data: APIAuditLogEntry) {
    this.id = data.id;
    this.userId = data.user_id;
    this.targetId = data.target_id;
    this.actionType = data.action_type;
    this.reason = data.reason ?? null;
    this.changes = new Map((data.changes ?? []).map((change) => [change.key, { old: change.old_value, new: change.new_value }]));
  }
}
