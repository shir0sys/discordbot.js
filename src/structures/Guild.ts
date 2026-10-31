import { Base } from "./Base";
import { Collection } from "../managers/Collection";
import { RoleManager } from "../managers/RoleManager";
import { GuildMemberManager } from "../managers/GuildMemberManager";
import { GuildChannelManager } from "../managers/GuildChannelManager";
import { GuildBanManager } from "../managers/GuildBanManager";
import { GuildEmojiManager } from "../managers/GuildEmojiManager";
import { GuildStickerManager } from "../managers/GuildStickerManager";
import { GuildSoundboardManager } from "../managers/SoundboardManager";
import { Role, type APIRole } from "./Role";
import { Member, type APIMember } from "./Member";
import { type APIChannel } from "./Channel";
import { ThreadChannel, type APIThreadChannel } from "./ThreadChannel";
import { createChannel } from "./ChannelFactory";
import { GuildEmoji, type APIEmoji } from "./Emoji";
import { Sticker, type APISticker } from "./Sticker";
import { VoiceState, type APIVoiceState } from "./VoiceState";
import { GuildOnboarding, type APIGuildOnboarding, type APIGuildWidgetSettings, type APIGuildPreview } from "./GuildOnboarding";
import { GuildTemplateManager } from "../managers/GuildTemplateManager";
import type { Client } from "../client/Client";

export interface APIGuild {
  id: string;
  name: string;
  owner_id: string;
  icon: string | null;
  roles: APIRole[];
  channels?: APIChannel[];
  threads?: APIThreadChannel[];
  members?: APIMember[];
  emojis?: APIEmoji[];
  stickers?: APISticker[];
  voice_states?: APIVoiceState[];
  unavailable?: boolean;
}

export { createChannel };

export class Guild extends Base {
  public id: string;
  public name: string;
  public ownerId: string;
  public icon: string | null;
  public unavailable: boolean;

  public readonly roles: RoleManager;
  public readonly channels: GuildChannelManager;
  public readonly members: GuildMemberManager;
  public readonly bans: GuildBanManager;
  public readonly emojis: GuildEmojiManager;
  public readonly stickers: GuildStickerManager;
  public readonly soundboardSounds: GuildSoundboardManager;
  public readonly templates: GuildTemplateManager;
  public readonly voiceStates = new Collection<string, VoiceState>();

  constructor(client: Client, data: APIGuild) {
    super(client);
    this.id = data.id;
    this.name = data.name;
    this.ownerId = data.owner_id;
    this.icon = data.icon;
    this.unavailable = data.unavailable ?? false;

    this.roles = new RoleManager(client, this.id);
    this.channels = new GuildChannelManager(client, this.id);
    this.members = new GuildMemberManager(client, this.id);
    this.bans = new GuildBanManager(client, this.id);
    this.emojis = new GuildEmojiManager(client, this.id);
    this.stickers = new GuildStickerManager(client, this.id);
    this.soundboardSounds = new GuildSoundboardManager(client, this.id);
    this.templates = new GuildTemplateManager(client, this.id);

    for (const role of data.roles) this.roles.set(role.id, new Role(client, this.id, role));
    for (const channel of data.channels ?? []) this.channels.set(channel.id, createChannel(client, channel));
    for (const thread of data.threads ?? []) this.channels.set(thread.id, new ThreadChannel(client, thread));
    for (const member of data.members ?? []) {
      if (member.user) this.members._add(member.user.id, member);
    }
    for (const emoji of data.emojis ?? []) {
      if (emoji.id) this.emojis.set(emoji.id, new GuildEmoji(client, this.id, emoji));
    }
    for (const sticker of data.stickers ?? []) this.stickers.set(sticker.id, new Sticker(client, sticker));
    for (const voiceState of data.voice_states ?? []) {
      this.voiceStates.set(voiceState.user_id, new VoiceState(client, { ...voiceState, guild_id: this.id }));
    }
  }

  public _patchMember(userId: string, data: APIMember): Member {
    return this.members._add(userId, data);
  }

  /** Patches scalar fields from a GUILD_UPDATE payload without touching channel/member caches, which that event doesn't carry. */
  public _patch(data: Partial<APIGuild>): this {
    if (data.name !== undefined) this.name = data.name;
    if (data.icon !== undefined) this.icon = data.icon;
    if (data.owner_id !== undefined) this.ownerId = data.owner_id;
    if (data.roles) {
      this.roles.clear();
      for (const role of data.roles) this.roles.set(role.id, new Role(this.client, this.id, role));
    }
    if (data.emojis) {
      this.emojis.clear();
      for (const emoji of data.emojis) {
        if (emoji.id) this.emojis.set(emoji.id, new GuildEmoji(this.client, this.id, emoji));
      }
    }
    if (data.stickers) {
      this.stickers.clear();
      for (const sticker of data.stickers) this.stickers.set(sticker.id, new Sticker(this.client, sticker));
    }
    return this;
  }

  public iconURL(): string | null {
    if (!this.icon) return null;
    return `https://cdn.discordapp.com/icons/${this.id}/${this.icon}.png`;
  }

  public async fetchOnboarding(): Promise<GuildOnboarding> {
    const data = await this.client.rest.get<APIGuildOnboarding>(`/guilds/${this.id}/onboarding`);
    return new GuildOnboarding(data);
  }

  public async editOnboarding(data: Partial<Pick<APIGuildOnboarding, "prompts" | "default_channel_ids" | "enabled" | "mode">>, reason?: string): Promise<GuildOnboarding> {
    const payload = await this.client.rest.put<APIGuildOnboarding>(`/guilds/${this.id}/onboarding`, data, reason);
    return new GuildOnboarding(payload);
  }

  public fetchWidgetSettings(): Promise<APIGuildWidgetSettings> {
    return this.client.rest.get<APIGuildWidgetSettings>(`/guilds/${this.id}/widget`);
  }

  public editWidgetSettings(data: Partial<APIGuildWidgetSettings>, reason?: string): Promise<APIGuildWidgetSettings> {
    return this.client.rest.patch<APIGuildWidgetSettings>(`/guilds/${this.id}/widget`, data, reason);
  }

  public fetchPreview(): Promise<APIGuildPreview> {
    return this.client.rest.get<APIGuildPreview>(`/guilds/${this.id}/preview`);
  }

  public async fetchVanityURL(): Promise<{ code: string | null; uses: number }> {
    return this.client.rest.get(`/guilds/${this.id}/vanity-url`);
  }

  public async fetchAuditLogs(options: { limit?: number; user_id?: string; action_type?: number } = {}): Promise<
    import("./AuditLogEntry").AuditLogEntry[]
  > {
    const { AuditLogEntry } = await import("./AuditLogEntry");
    const data = await this.client.rest.get<{ audit_log_entries: ConstructorParameters<typeof AuditLogEntry>[0][] }>(
      `/guilds/${this.id}/audit-logs`,
      options,
    );
    return data.audit_log_entries.map((entry) => new AuditLogEntry(entry));
  }
}
