export interface SweepOptions<K, V> {
  /** Entries untouched (not re-`set`) for longer than this are swept. */
  maxAgeMs: number;
  /** How often to run the sweep. Defaults to 5 minutes. */
  intervalMs?: number;
  /** Only sweep entries this returns true for — e.g. skip messages authored by the client itself. */
  filter?: (value: V, key: K) => boolean;
}

/**
 * Map subclass with bounded-size eviction (FIFO) and optional TTL-based
 * sweeping, to prevent unbounded cache growth on long-lived gateway
 * sessions (e.g. message/member caches).
 */
export class Collection<K, V> extends Map<K, V> {
  public maxSize: number;
  private readonly timestamps = new Map<K, number>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(entries?: readonly (readonly [K, V])[] | null, maxSize = Infinity, sweep?: SweepOptions<K, V>) {
    // Deliberately not passing `entries` to super(): Map's constructor calls
    // this.set() for each entry, but that's our overridden set() running
    // before `this.timestamps`/`this.maxSize` class fields are initialized
    // (those only run after super() returns), which would crash on
    // `this.timestamps.set(...)`.
    super();
    this.maxSize = maxSize;
    if (entries) for (const [key, value] of entries) this.set(key, value);
    if (sweep) this.startSweeping(sweep);
  }

  public set(key: K, value: V): this {
    if (this.maxSize !== Infinity && this.size >= this.maxSize && !this.has(key)) {
      const oldestKey = this.keys().next().value;
      if (oldestKey !== undefined) this.delete(oldestKey);
    }
    this.timestamps.set(key, Date.now());
    return super.set(key, value);
  }

  public delete(key: K): boolean {
    this.timestamps.delete(key);
    return super.delete(key);
  }

  public clear(): void {
    this.timestamps.clear();
    super.clear();
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = null;
  }

  /** Starts periodic TTL sweeping. Safe to call again to change the options — replaces any running sweep. */
  public startSweeping(options: SweepOptions<K, V>): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = setInterval(() => this.sweep(options), options.intervalMs ?? 300000);
    this.sweepTimer.unref?.();
  }

  public stopSweeping(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = null;
  }

  /** Runs a sweep pass immediately and returns how many entries were removed. */
  public sweep(options: SweepOptions<K, V>): number {
    const now = Date.now();
    let swept = 0;
    for (const [key, timestamp] of this.timestamps) {
      if (now - timestamp < options.maxAgeMs) continue;
      const value = this.get(key);
      if (value === undefined) continue;
      if (options.filter && !options.filter(value, key)) continue;
      this.delete(key);
      swept++;
    }
    return swept;
  }

  public find(predicate: (value: V, key: K, collection: this) => boolean): V | undefined {
    for (const [key, value] of this) {
      if (predicate(value, key, this)) return value;
    }
    return undefined;
  }

  public filter(predicate: (value: V, key: K, collection: this) => boolean): Collection<K, V> {
    const result = new Collection<K, V>(null, this.maxSize);
    for (const [key, value] of this) {
      if (predicate(value, key, this)) result.set(key, value);
    }
    return result;
  }

  public map<T>(fn: (value: V, key: K, collection: this) => T): T[] {
    const result: T[] = [];
    for (const [key, value] of this) result.push(fn(value, key, this));
    return result;
  }

  public some(predicate: (value: V, key: K, collection: this) => boolean): boolean {
    for (const [key, value] of this) {
      if (predicate(value, key, this)) return true;
    }
    return false;
  }

  public first(): V | undefined {
    return this.values().next().value;
  }

  public toArray(): V[] {
    return [...this.values()];
  }
}
