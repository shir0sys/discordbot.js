import { BitField } from "./BitField";

export const ApplicationFlagValues = {
  ApplicationAutoModerationRuleCreateBadge: 1n << 6n,
  GatewayPresence: 1n << 12n,
  GatewayPresenceLimited: 1n << 13n,
  GatewayGuildMembers: 1n << 14n,
  GatewayGuildMembersLimited: 1n << 15n,
  VerificationPendingGuildLimit: 1n << 16n,
  Embedded: 1n << 17n,
  GatewayMessageContent: 1n << 18n,
  GatewayMessageContentLimited: 1n << 19n,
  ApplicationCommandBadge: 1n << 23n,
} as const;

export class ApplicationFlagsBitField extends BitField<typeof ApplicationFlagValues> {
  public static readonly Flags = ApplicationFlagValues;

  constructor(bits: bigint | number = 0n) {
    super(ApplicationFlagValues, bits);
  }
}
