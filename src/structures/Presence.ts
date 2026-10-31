export enum ActivityType {
  Playing = 0,
  Streaming = 1,
  Listening = 2,
  Watching = 3,
  Custom = 4,
  Competing = 5,
}

export enum PresenceStatus {
  Online = "online",
  Idle = "idle",
  DoNotDisturb = "dnd",
  Invisible = "invisible",
  Offline = "offline",
}

export interface APIActivityTimestamps {
  start?: number;
  end?: number;
}

export interface APIActivity {
  name: string;
  type: ActivityType;
  url?: string | null;
  created_at: number;
  timestamps?: APIActivityTimestamps;
  details?: string | null;
  state?: string | null;
  emoji?: { name: string; id?: string; animated?: boolean } | null;
}

export class Activity {
  public name: string;
  public type: ActivityType;
  public url: string | null;
  public createdTimestamp: number;
  public details: string | null;
  public state: string | null;

  constructor(data: APIActivity) {
    this.name = data.name;
    this.type = data.type;
    this.url = data.url ?? null;
    this.createdTimestamp = data.created_at;
    this.details = data.details ?? null;
    this.state = data.state ?? null;
  }
}

export interface APIClientStatus {
  desktop?: PresenceStatus;
  mobile?: PresenceStatus;
  web?: PresenceStatus;
}

export interface APIPresence {
  user: { id: string };
  guild_id?: string;
  status: PresenceStatus;
  activities: APIActivity[];
  client_status: APIClientStatus;
}

export class Presence {
  public userId: string;
  public guildId: string | null;
  public status: PresenceStatus;
  public activities: Activity[];
  public clientStatus: APIClientStatus;

  constructor(data: APIPresence) {
    this.userId = data.user.id;
    this.guildId = data.guild_id ?? null;
    this.status = data.status;
    this.activities = data.activities.map((activity) => new Activity(activity));
    this.clientStatus = data.client_status;
  }
}
