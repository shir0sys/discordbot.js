import { EventEmitter } from "node:events";
import { Collection } from "../managers/Collection";

export interface CollectorOptions<V> {
  filter?: (item: V) => boolean;
  time?: number;
  max?: number;
  idle?: number;
}

export type CollectorEndReason = "time" | "idle" | "limit" | "stopped";

/**
 * Generic event-driven collector: listens for items pushed in via `handleCollect`,
 * applies a filter, and ends on a time limit, idle timeout, max count, or explicit stop().
 */
export abstract class Collector<K, V> extends EventEmitter {
  public readonly collected = new Collection<K, V>();
  private ended = false;
  private timeoutHandle: NodeJS.Timeout | null = null;
  private idleHandle: NodeJS.Timeout | null = null;

  constructor(protected readonly options: CollectorOptions<V> = {}) {
    super();
    if (options.time) this.timeoutHandle = setTimeout(() => this.stop("time"), options.time).unref();
    if (options.idle) this.idleHandle = setTimeout(() => this.stop("idle"), options.idle).unref();
  }

  protected abstract key(item: V): K;

  public handleCollect(item: V): void {
    if (this.ended) return;
    if (this.options.filter && !this.options.filter(item)) return;

    this.collected.set(this.key(item), item);
    this.emit("collect", item);

    if (this.options.idle) {
      if (this.idleHandle) clearTimeout(this.idleHandle);
      this.idleHandle = setTimeout(() => this.stop("idle"), this.options.idle).unref();
    }

    if (this.options.max && this.collected.size >= this.options.max) this.stop("limit");
  }

  public stop(reason: CollectorEndReason = "stopped"): void {
    if (this.ended) return;
    this.ended = true;
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    if (this.idleHandle) clearTimeout(this.idleHandle);
    this.emit("end", this.collected, reason);
  }
}
