import type { Client } from "../client/Client";

interface EvalRequest {
  _sEval: string;
  _id: number;
}

interface EvalResult {
  _sEvalResult: true;
  _id: number;
  value?: unknown;
  error?: string;
}

/**
 * The child-process side of sharding IPC. A no-op when the client isn't
 * running under ShardingManager (process.send only exists in a forked child),
 * so it's safe to always attach this to Client rather than making it opt-in.
 */
export class ShardClientUtil {
  public readonly id: number;
  public readonly count: number;

  constructor(private readonly client: Client) {
    this.id = Number(process.env.SHARD_ID ?? 0);
    this.count = Number(process.env.SHARD_COUNT ?? 1);

    if (typeof process.send === "function") {
      process.on("message", (message: EvalRequest) => this.handleEvalRequest(message));
      client.once("ready", () => this.send({ _sReady: true }));
    }
  }

  public get active(): boolean {
    return typeof process.send === "function";
  }

  public send(message: unknown): void {
    process.send?.(message);
  }

  private async handleEvalRequest(message: EvalRequest): Promise<void> {
    if (!message || typeof message._sEval !== "string") return;
    try {
      // Indirect eval runs in global scope rather than this function's — matches discord.js's broadcastEval semantics.
      const value = await (0, eval)(message._sEval);
      this.send({ _sEvalResult: true, _id: message._id, value } satisfies EvalResult);
    } catch (error) {
      this.send({ _sEvalResult: true, _id: message._id, error: (error as Error).message } satisfies EvalResult);
    }
  }
}
