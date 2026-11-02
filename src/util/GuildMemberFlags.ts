import { BitField } from "./BitField";

export const GuildMemberFlagValues = {
  DidRejoin: 1n << 0n,
  CompletedOnboarding: 1n << 1n,
  BypassesVerification: 1n << 2n,
  StartedOnboarding: 1n << 3n,
  IsGuest: 1n << 4n,
  StartedHomeActions: 1n << 5n,
  CompletedHomeActions: 1n << 6n,
  AutomodQuarantinedUsername: 1n << 7n,
  DmSettingsUpsellAcknowledged: 1n << 9n,
} as const;

export class GuildMemberFlagsBitField extends BitField<typeof GuildMemberFlagValues> {
  public static readonly Flags = GuildMemberFlagValues;

  constructor(bits: bigint | number = 0n) {
    super(GuildMemberFlagValues, bits);
  }
}
