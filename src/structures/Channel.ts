import { Base } from "./Base";
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

  public toString(): string {
    return `<#${this.id}>`;
  }
}
