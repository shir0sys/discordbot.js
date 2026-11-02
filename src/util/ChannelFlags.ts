import { BitField } from "./BitField";

export const ChannelFlagValues = {
  Pinned: 1n << 1n,
  RequireTag: 1n << 4n,
  HideMediaDownloadOptions: 1n << 15n,
} as const;

export class ChannelFlagsBitField extends BitField<typeof ChannelFlagValues> {
  public static readonly Flags = ChannelFlagValues;

  constructor(bits: bigint | number = 0n) {
    super(ChannelFlagValues, bits);
  }
}
