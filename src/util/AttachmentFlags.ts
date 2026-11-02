import { BitField } from "./BitField";

export const AttachmentFlagValues = {
  IsRemix: 1n << 2n,
} as const;

export class AttachmentFlagsBitField extends BitField<typeof AttachmentFlagValues> {
  public static readonly Flags = AttachmentFlagValues;

  constructor(bits: bigint | number = 0n) {
    super(AttachmentFlagValues, bits);
  }
}
