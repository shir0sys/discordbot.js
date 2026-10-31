import { IntentBits } from "./Constants";

export type IntentResolvable = number | IntentBits | (keyof typeof IntentBits)[] | number[];

export class IntentsBitField {
  public bitfield: number;

  constructor(bits: IntentResolvable = 0) {
    this.bitfield = IntentsBitField.resolve(bits);
  }

  public static resolve(bits: IntentResolvable): number {
    if (typeof bits === "number") return bits;
    if (Array.isArray(bits)) {
      return bits.reduce<number>((acc, bit) => {
        if (typeof bit === "number") return acc | bit;
        return acc | IntentBits[bit];
      }, 0);
    }
    return 0;
  }

  public add(...bits: IntentResolvable[]): this {
    for (const bit of bits) this.bitfield |= IntentsBitField.resolve(bit);
    return this;
  }

  public has(bit: IntentResolvable): boolean {
    const resolved = IntentsBitField.resolve(bit);
    return (this.bitfield & resolved) === resolved;
  }

  public toJSON(): number {
    return this.bitfield;
  }
}
