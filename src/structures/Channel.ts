import { Base } from "./Base";
import { Invite, type APIInvite } from "./Invite";
import { ChannelType } from "../util/Constants";
import { PermissionsBitField, computeChannelPermissions, type APIPermissionOverwrite } from "../util/Permissions";
import type { Client } from "../client/Client";

export interface APIChannel {
  id: string;
  type: ChannelType;
  guild_id?: string;
  name?: string | null;
  topic?: string | null;
  nsfw?: boolean;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  position?: number;
  parent_id?: string | null;
  last_message_id?: string | null;
  permission_overwrites?: APIPermissionOverwrite[];
  recipients?: unknown[];
}

export class Channel extends Base {
  public id: string;
  public type: ChannelType;
  public guildId: string | null;
  public parentId: string | null;
  public position: number;
  public permissionOverwrites: APIPermissionOverwrite[];

  constructor(client: Client, data: APIChannel) {
    super(client);
    this.id = data.id;
    this.type = data.type;
    this.guildId = data.guild_id ?? null;
    this.parentId = data.parent_id ?? null;
    this.position = data.position ?? 0;
    this.permissionOverwrites = data.permission_overwrites ?? [];
  }

  public isText(): this is import("./TextChannel").TextChannel {
    return this.type === ChannelType.GuildText || this.type === ChannelType.GuildAnnouncement;
  }

  public isVoice(): this is import("./VoiceChannel").VoiceChannel {
    return this.type === ChannelType.GuildVoice || this.type === ChannelType.GuildStageVoice;
  }

  public isStage(): this is import("./StageChannel").StageChannel {
    return this.type === ChannelType.GuildStageVoice;
  }

  public isCategory(): this is import("./CategoryChannel").CategoryChannel {
    return this.type === ChannelType.GuildCategory;
  }

  public isForum(): this is import("./ForumChannel").ForumChannel {
    return this.type === ChannelType.GuildForum || this.type === ChannelType.GuildMedia;
  }

  public isDM(): this is import("./DMChannel").DMChannel {
    return this.type === ChannelType.DM;
  }

  public isThread(): this is import("./ThreadChannel").ThreadChannel {
    return (
      this.type === ChannelType.PublicThread ||
      this.type === ChannelType.PrivateThread ||
      this.type === ChannelType.AnnouncementThread
    );
  }

  /** Effective permissions for a member in this channel, given their role permission bitfield and role ids. */
  public permissionsFor(basePermissions: PermissionsBitField, memberId: string, memberRoleIds: string[]): PermissionsBitField {
    if (!this.guildId) return basePermissions;
    return computeChannelPermissions(basePermissions, this.permissionOverwrites, this.guildId, memberId, memberRoleIds);
  }

  public async setName(name: string, reason?: string): Promise<void> {
    await this.client.rest.patch(`/channels/${this.id}`, { name }, reason);
  }

  public async setPosition(position: number, reason?: string): Promise<void> {
    await this.client.rest.patch(`/channels/${this.id}`, { position }, reason);
  }

  public async editPermissionOverwrite(overwrite: APIPermissionOverwrite, reason?: string): Promise<void> {
    await this.client.rest.put(
      `/channels/${this.id}/permissions/${overwrite.id}`,
      { type: overwrite.type, allow: overwrite.allow, deny: overwrite.deny },
      reason,
    );
  }

  public async deletePermissionOverwrite(targetId: string, reason?: string): Promise<void> {
    await this.client.rest.delete(`/channels/${this.id}/permissions/${targetId}`, reason);
  }

  public async delete(reason?: string): Promise<void> {
    await this.client.rest.delete(`/channels/${this.id}`, reason);
  }

  public async createInvite(
    data: { max_age?: number; max_uses?: number; temporary?: boolean; unique?: boolean } = {},
    reason?: string,
  ): Promise<Invite> {
    const payload = await this.client.rest.post<APIInvite>(`/channels/${this.id}/invites`, data, reason);
    return new Invite(this.client, payload);
  }

  public async fetchInvites(): Promise<Invite[]> {
    const data = await this.client.rest.get<APIInvite[]>(`/channels/${this.id}/invites`);
    return data.map((invite) => new Invite(this.client, invite));
  }

  public toString(): string {
    return `<#${this.id}>`;
  }
}
