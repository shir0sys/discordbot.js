const DISCORD_EPOCH = 1420070400000n;

export interface DeconstructedSnowflake {
  timestamp: number;
  workerId: number;
  processId: number;
  increment: number;
}

export function deconstruct(snowflake: string): DeconstructedSnowflake {
  const bits = BigInt(snowflake);
  return {
    timestamp: Number((bits >> 22n) + DISCORD_EPOCH),
    workerId: Number((bits & 0x3e0000n) >> 17n),
    processId: Number((bits & 0x1f000n) >> 12n),
    increment: Number(bits & 0xfffn),
  };
}

export function timestampFrom(snowflake: string): number {
  return deconstruct(snowflake).timestamp;
}

/** Builds a snowflake for a given timestamp — useful as a `before`/`after` pagination cursor, not a real generated ID. */
export function generate(timestamp: Date | number = Date.now()): string {
  const ms = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  return ((BigInt(ms) - DISCORD_EPOCH) << 22n).toString();
}
