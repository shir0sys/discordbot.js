import { BitField } from "./BitField";

export const RoleFlagValues = {
  InPrompt: 1n << 0n,
} as const;

export class RoleFlagsBitField extends BitField<typeof RoleFlagValues> {
  public static readonly Flags = RoleFlagValues;

  constructor(bits: bigint | number = 0n) {
    super(RoleFlagValues, bits);
  }
}
