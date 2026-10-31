/**
 * Map subclass with bounded-size eviction (FIFO) to prevent unbounded cache
 * growth on long-lived gateway sessions (e.g. message/member caches).
 */
export class Collection<K, V> extends Map<K, V> {
  public maxSize: number;

  constructor(entries?: readonly (readonly [K, V])[] | null, maxSize = Infinity) {
    super(entries);
    this.maxSize = maxSize;
  }

  public set(key: K, value: V): this {
    if (this.maxSize !== Infinity && this.size >= this.maxSize && !this.has(key)) {
      const oldestKey = this.keys().next().value;
      if (oldestKey !== undefined) this.delete(oldestKey);
    }
    return super.set(key, value);
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
