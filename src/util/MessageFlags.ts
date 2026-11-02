import { BitField } from "./BitField";

export const MessageFlagValues = {
  Crossposted: 1n << 0n,
  IsCrosspost: 1n << 1n,
  SuppressEmbeds: 1n << 2n,
  SourceMessageDeleted: 1n << 3n,
  Urgent: 1n << 4n,
  HasThread: 1n << 5n,
  Ephemeral: 1n << 6n,
  Loading: 1n << 7n,
  FailedToMentionSomeRolesInThread: 1n << 8n,
  SuppressNotifications: 1n << 12n,
  IsVoiceMessage: 1n << 13n,
  HasSnapshot: 1n << 14n,
  IsComponentsV2: 1n << 15n,
} as const;

export class MessageFlagsBitField extends BitField<typeof MessageFlagValues> {
  public static readonly Flags = MessageFlagValues;

  constructor(bits: bigint | number = 0n) {
    super(MessageFlagValues, bits);
  }
}
