import { EventEmitter } from "node:events";
import { fork, type ChildProcess } from "node:child_process";

export interface ShardingManagerOptions {
  totalShards: number | "auto";
  token: string;
  respawn?: boolean;
  execArgv?: string[];
}

interface PendingEval {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

type ManagerEvents = {
  shardCreate: [number];
  shardReady: [number];
  shardExit: [number, number | null];
};

/**
 * Spawns one child process per shard (via node:child_process.fork, native —
 * no process-manager dependency), restarts crashed shards, and offers
 * eval-based cross-shard aggregation the same way discord.js's
 * ShardingManager does.
 */
export class ShardingManager extends EventEmitter {
  private readonly shards = new Map<number, ChildProcess>();
  private readonly pendingEvals = new Map<number, PendingEval>();
  private nextEvalId = 0;
  private totalShards = 0;

  constructor(
    private readonly file: string,
    private readonly options: ShardingManagerOptions,
  ) {
    super();
  }

  public async spawn(): Promise<void> {
    this.totalShards =
      this.options.totalShards === "auto" ? await this.fetchRecommendedShardCount() : this.options.totalShards;

    for (let shardId = 0; shardId < this.totalShards; shardId++) {
      this.spawnShard(shardId);
      if (shardId < this.totalShards - 1) await delay(5500);
    }
  }

  private async fetchRecommendedShardCount(): Promise<number> {
    const response = await fetch("https://discord.com/api/v10/gateway/bot", {
      headers: { Authorization: `Bot ${this.options.token}` },
    });
    const data = (await response.json()) as { shards: number };
    return data.shards;
  }

  private spawnShard(shardId: number): void {
    const child = fork(this.file, [], {
      execArgv: this.options.execArgv,
      env: {
        ...process.env,
        SHARD_ID: String(shardId),
        SHARD_COUNT: String(this.totalShards),
        DISCORD_TOKEN: this.options.token,
      },
    });

    child.on("message", (message: any) => this.handleMessage(shardId, message));
    child.on("exit", (code) => {
      this.emit("shardExit", shardId, code);
      this.shards.delete(shardId);
      if (this.options.respawn ?? true) this.spawnShard(shardId);
    });

    this.shards.set(shardId, child);
    this.emit("shardCreate", shardId);
  }

  private handleMessage(shardId: number, message: any): void {
    if (message?._sReady) this.emit("shardReady", shardId);
    if (message?._sEvalResult) {
      const pending = this.pendingEvals.get(message._id);
      if (!pending) return;
      this.pendingEvals.delete(message._id);
      if (message.error) pending.reject(new Error(message.error));
      else pending.resolve(message.value);
    }
  }

  /** Runs `code` inside every shard's process and returns one result per shard, indexed by shard id. */
  public async broadcastEval<T = unknown>(code: string): Promise<T[]> {
    const results = await Promise.all([...this.shards.keys()].map((shardId) => this.evalOnShard<T>(shardId, code)));
    return results;
  }

  private evalOnShard<T>(shardId: number, code: string): Promise<T> {
    const child = this.shards.get(shardId);
    if (!child) return Promise.reject(new Error(`Shard ${shardId} is not running`));

    const id = this.nextEvalId++;
    return new Promise<T>((resolve, reject) => {
      this.pendingEvals.set(id, { resolve: resolve as (value: unknown) => void, reject });
      child.send({ _sEval: code, _id: id });
    });
  }

  public async fetchClientValues<T = unknown>(prop: string): Promise<T[]> {
    return this.broadcastEval<T>(`this.${prop}`);
  }

  /**
   * Finds which shard a guild's cache lives on — exactly one shard owns any
   * given guild, so the first truthy result wins. Returns the shard id only
   * (not the `Guild` itself: it holds a reference to its `Client`, which
   * isn't serializable across the IPC channel broadcastEval uses) — follow
   * up with your own `broadcastEval` selecting just the fields you need.
   */
  public async findGuild(guildId: string): Promise<number | null> {
    const shardIds = [...this.shards.keys()];
    const results = await Promise.all(
      shardIds.map((shardId) => this.evalOnShard<boolean>(shardId, `this.guilds.cache.has("${guildId}")`)),
    );
    const index = results.findIndex(Boolean);
    return index === -1 ? null : shardIds[index];
  }

  public respawnAll(): void {
    for (const shardId of this.shards.keys()) this.shards.get(shardId)?.kill();
  }
}

export interface ShardingManager {
  on<K extends keyof ManagerEvents>(event: K, listener: (...args: ManagerEvents[K]) => void): this;
  emit<K extends keyof ManagerEvents>(event: K, ...args: ManagerEvents[K]): boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
