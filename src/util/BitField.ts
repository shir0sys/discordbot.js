export type BitFieldResolvable<Flags extends Record<string, bigint>> =
  bigint | number | (keyof Flags)[] | bigint[] | BitField<Flags>;

/** Generic bigint-backed bitfield. Permission/flag values can exceed 32 bits, so bigint is used throughout rather than number. */
export class BitField<Flags extends Record<string, bigint>> {
  public bitfield: bigint;

  constructor(
    protected readonly flags: Flags,
    bits: BitFieldResolvable<Flags> = 0n,
  ) {
    this.bitfield = this.resolve(bits);
  }

  public resolve(bits: BitFieldResolvable<Flags>): bigint {
    if (bits instanceof BitField) return bits.bitfield;
    if (typeof bits === "bigint") return bits;
    if (typeof bits === "number") return BigInt(bits);
    if (Array.isArray(bits)) {
      return bits.reduce<bigint>((acc, bit) => {
        if (typeof bit === "bigint") return acc | bit;
        return acc | (this.flags[bit as keyof Flags] ?? 0n);
      }, 0n);
    }
    return 0n;
  }

  public has(bit: BitFieldResolvable<Flags>): boolean {
    const resolved = this.resolve(bit);
    return (this.bitfield & resolved) === resolved;
  }

  public any(bit: BitFieldResolvable<Flags>): boolean {
    return (this.bitfield & this.resolve(bit)) !== 0n;
  }

  public add(...bits: BitFieldResolvable<Flags>[]): this {
    for (const bit of bits) this.bitfield |= this.resolve(bit);
    return this;
  }

  public remove(...bits: BitFieldResolvable<Flags>[]): this {
    for (const bit of bits) this.bitfield &= ~this.resolve(bit);
    return this;
  }

  public toArray(): (keyof Flags)[] {
    return (Object.keys(this.flags) as (keyof Flags)[]).filter((flag) => this.has(this.flags[flag]));
  }

  public serialize(): Record<keyof Flags, boolean> {
    const result = {} as Record<keyof Flags, boolean>;
    for (const flag of Object.keys(this.flags) as (keyof Flags)[]) result[flag] = this.has(this.flags[flag]);
    return result;
  }

  public toJSON(): string {
    return this.bitfield.toString();
  }
}
