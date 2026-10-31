import { Collection, type SweepOptions } from "./Collection";
import type { Client } from "../client/Client";

/**
 * Base for managers whose entire job is "fetch one entity by id over REST,
 * cache it, return it" — `GuildManager`/`ChannelManager`/`UserManager` were
 * each hand-rolling the identical shape. The manager *is* the cache (extends
 * `Collection`) rather than holding a separate `.cache` field; `.cache`
 * stays available as a getter returning `this` so existing call sites like
 * `client.guilds.cache.get(id)` keep working unchanged.
 */
export abstract class CachedManager<K, V> extends Collection<K, V> {
  constructor(
    protected readonly client: Client,
    maxSize?: number,
    sweep?: SweepOptions<K, V>,
  ) {
    super(null, maxSize, sweep);
  }

  public get cache(): this {
    return this;
  }

  protected async fetchAndCache<T>(key: K, path: string, construct: (data: T) => V): Promise<V> {
    const data = await this.client.rest.get<T>(path);
    const value = construct(data);
    this.set(key, value);
    return value;
  }
}
