import { BitField, type BitFieldResolvable } from "./BitField";

export const PermissionFlags = {
  CreateInstantInvite: 1n << 0n,
  KickMembers: 1n << 1n,
  BanMembers: 1n << 2n,
  Administrator: 1n << 3n,
  ManageChannels: 1n << 4n,
  ManageGuild: 1n << 5n,
  AddReactions: 1n << 6n,
  ViewAuditLog: 1n << 7n,
  PrioritySpeaker: 1n << 8n,
  Stream: 1n << 9n,
  ViewChannel: 1n << 10n,
  SendMessages: 1n << 11n,
  SendTTSMessages: 1n << 12n,
  ManageMessages: 1n << 13n,
  EmbedLinks: 1n << 14n,
  AttachFiles: 1n << 15n,
  ReadMessageHistory: 1n << 16n,
  MentionEveryone: 1n << 17n,
  UseExternalEmojis: 1n << 18n,
  ViewGuildInsights: 1n << 19n,
  Connect: 1n << 20n,
  Speak: 1n << 21n,
  MuteMembers: 1n << 22n,
  DeafenMembers: 1n << 23n,
  MoveMembers: 1n << 24n,
  UseVAD: 1n << 25n,
  ChangeNickname: 1n << 26n,
  ManageNicknames: 1n << 27n,
  ManageRoles: 1n << 28n,
  ManageWebhooks: 1n << 29n,
  ManageGuildExpressions: 1n << 30n,
  UseApplicationCommands: 1n << 31n,
  RequestToSpeak: 1n << 32n,
  ManageEvents: 1n << 33n,
  ManageThreads: 1n << 34n,
  CreatePublicThreads: 1n << 35n,
  CreatePrivateThreads: 1n << 36n,
  UseExternalStickers: 1n << 37n,
  SendMessagesInThreads: 1n << 38n,
  UseEmbeddedActivities: 1n << 39n,
  ModerateMembers: 1n << 40n,
  ViewCreatorMonetizationAnalytics: 1n << 41n,
  UseSoundboard: 1n << 42n,
  CreateGuildExpressions: 1n << 43n,
  CreateEvents: 1n << 44n,
  UseExternalSounds: 1n << 45n,
  SendVoiceMessages: 1n << 46n,
  SendPolls: 1n << 49n,
  UseExternalApps: 1n << 50n,
} as const;

export type PermissionFlagsBits = typeof PermissionFlags;

export class PermissionsBitField extends BitField<PermissionFlagsBits> {
  public static readonly Flags = PermissionFlags;
  public static readonly All = Object.values(PermissionFlags).reduce((acc, bit) => acc | bit, 0n);

  constructor(bits: BitFieldResolvable<PermissionFlagsBits> = 0n) {
    super(PermissionFlags, bits);
  }

  public override has(bit: BitFieldResolvable<PermissionFlagsBits>): boolean {
    if ((this.bitfield & PermissionFlags.Administrator) === PermissionFlags.Administrator) return true;
    return super.has(bit);
  }
}

export interface APIPermissionOverwrite {
  id: string;
  type: 0 | 1; // 0 = role, 1 = member
  allow: string;
  deny: string;
}

/**
 * Computes a member's effective permissions in a channel: base role permissions
 * (including @everyone) are combined, then @everyone/role/member overwrites are
 * applied in that priority order, and Administrator always short-circuits to All.
 */
export function computeChannelPermissions(
  basePermissions: PermissionsBitField,
  overwrites: APIPermissionOverwrite[],
  everyoneRoleId: string,
  memberId: string,
  memberRoleIds: string[],
): PermissionsBitField {
  if (basePermissions.has(PermissionFlags.Administrator)) {
    return new PermissionsBitField(PermissionsBitField.All);
  }

  let permissions = basePermissions.bitfield;

  const everyoneOverwrite = overwrites.find((o) => o.id === everyoneRoleId);
  if (everyoneOverwrite) {
    permissions &= ~BigInt(everyoneOverwrite.deny);
    permissions |= BigInt(everyoneOverwrite.allow);
  }

  let roleAllow = 0n;
  let roleDeny = 0n;
  for (const overwrite of overwrites) {
    if (overwrite.type === 0 && memberRoleIds.includes(overwrite.id)) {
      roleAllow |= BigInt(overwrite.allow);
      roleDeny |= BigInt(overwrite.deny);
    }
  }
  permissions = (permissions & ~roleDeny) | roleAllow;

  const memberOverwrite = overwrites.find((o) => o.type === 1 && o.id === memberId);
  if (memberOverwrite) {
    permissions &= ~BigInt(memberOverwrite.deny);
    permissions |= BigInt(memberOverwrite.allow);
  }

  return new PermissionsBitField(permissions);
}
