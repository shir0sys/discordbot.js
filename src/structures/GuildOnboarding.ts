export interface APIOnboardingPrompt {
  id: string;
  type: number;
  title: string;
  options: unknown[];
  single_select: boolean;
  required: boolean;
  in_onboarding: boolean;
}

export interface APIGuildOnboarding {
  guild_id: string;
  prompts: APIOnboardingPrompt[];
  default_channel_ids: string[];
  enabled: boolean;
  mode: number;
}

export class GuildOnboarding {
  public guildId: string;
  public prompts: APIOnboardingPrompt[];
  public defaultChannelIds: string[];
  public enabled: boolean;
  public mode: number;

  constructor(data: APIGuildOnboarding) {
    this.guildId = data.guild_id;
    this.prompts = data.prompts;
    this.defaultChannelIds = data.default_channel_ids;
    this.enabled = data.enabled;
    this.mode = data.mode;
  }
}

export interface APIGuildWidgetSettings {
  enabled: boolean;
  channel_id: string | null;
}

export interface APIGuildPreview {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  approximate_member_count: number;
  approximate_presence_count: number;
}

export interface APIPublicWidget {
  id: string;
  name: string;
  instant_invite: string | null;
  channels: { id: string; name: string; position: number }[];
  members: unknown[];
  presence_count: number;
}

/** The public widget.json endpoint — no bot token required, only works if the guild has widgets enabled. */
export async function fetchPublicWidget(guildId: string): Promise<APIPublicWidget> {
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/widget.json`);
  if (!response.ok) throw new Error(`Widget fetch failed with status ${response.status}`);
  return response.json() as Promise<APIPublicWidget>;
}
