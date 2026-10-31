import { Bucket } from "./Bucket";
import { REST_BASE_URL } from "../util/Constants";

export interface RESTOptions {
  token: string;
  authPrefix?: "Bot" | "Bearer";
  userAgent?: string;
  maxRetries?: number;
}

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RESTFile {
  name: string;
  data: Blob | Buffer | Uint8Array;
  contentType?: string;
}

export interface RequestOptions {
  method: HTTPMethod;
  path: string;
  body?: unknown;
  files?: RESTFile[];
  reason?: string;
  query?: Record<string, string | number | boolean | undefined>;
}

/**
 * Minimal REST client for Discord API v10. Routes are grouped into buckets
 * using the X-RateLimit-Bucket header (falling back to a per-route key until
 * that header is first observed), and a single global lock gates every
 * bucket when Discord signals X-RateLimit-Global.
 */
export class REST {
  private readonly token: string;
  private readonly authPrefix: "Bot" | "Bearer";
  private readonly userAgent: string;
  private readonly maxRetries: number;

  private readonly buckets = new Map<string, Bucket>();
  private readonly routeToBucket = new Map<string, string>();
  private globalResetAt = 0;

  constructor(options: RESTOptions) {
    this.token = options.token;
    this.authPrefix = options.authPrefix ?? "Bot";
    this.userAgent = options.userAgent ?? "DiscordBot (https://github.com/shir0sys/discordbot.js, 0.1.0)";
    this.maxRetries = options.maxRetries ?? 3;
  }

  public async request<T = unknown>(options: RequestOptions): Promise<T> {
    const routeKey = routeKeyFor(options.method, options.path);
    const bucketId = this.routeToBucket.get(routeKey) ?? routeKey;
    const bucket = this.getBucket(bucketId);

    let result!: T;
    await bucket.enqueue(async () => {
      result = await this.execute<T>(options, routeKey, 0);
    });
    return result;
  }

  private getBucket(id: string): Bucket {
    let bucket = this.buckets.get(id);
    if (!bucket) {
      bucket = new Bucket(id);
      this.buckets.set(id, bucket);
    }
    return bucket;
  }

  private async execute<T>(options: RequestOptions, routeKey: string, attempt: number): Promise<T> {
    if (this.globalResetAt > Date.now()) {
      await delay(this.globalResetAt - Date.now());
    }

    const url = this.buildUrl(options);
    const headers: Record<string, string> = {
      Authorization: `${this.authPrefix} ${this.token}`,
      "User-Agent": this.userAgent,
    };
    if (options.reason) headers["X-Audit-Log-Reason"] = encodeURIComponent(options.reason);

    let body: BodyInit | undefined;
    if (options.files?.length) {
      // Content-Type is left unset: fetch computes the multipart boundary itself from the FormData instance.
      const form = new FormData();
      if (options.body !== undefined) {
        form.append("payload_json", JSON.stringify(options.body));
      }
      options.files.forEach((file, index) => {
        const blob = file.data instanceof Blob ? file.data : new Blob([file.data as BlobPart], { type: file.contentType });
        form.append(`files[${index}]`, blob, file.name);
      });
      body = form;
    } else if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await fetch(url, { method: options.method, headers, body });

    const bucketHash = response.headers.get("x-ratelimit-bucket");
    if (bucketHash) this.routeToBucket.set(routeKey, bucketHash);

    if (response.headers.get("x-ratelimit-global") === "true") {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      this.globalResetAt = Date.now() + retryAfter * 1000;
    }

    const bucket = this.getBucket(bucketHash ?? routeKey);
    bucket.updateFromHeaders(response.headers);

    if (response.status === 429) {
      const payload = await response.json().catch(() => ({}));
      const retryAfterMs = (payload.retry_after ?? 1) * 1000;
      bucket.lockFor(retryAfterMs);
      if (attempt >= this.maxRetries) throw new DiscordAPIError(response.status, payload);
      await delay(retryAfterMs);
      return this.execute<T>(options, routeKey, attempt + 1);
    }

    if (response.status >= 500 && attempt < this.maxRetries) {
      await delay(backoff(attempt));
      return this.execute<T>(options, routeKey, attempt + 1);
    }

    if (response.status === 204) return undefined as T;

    const data = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new DiscordAPIError(response.status, data);
    }

    return data as T;
  }

  private buildUrl(options: RequestOptions): string {
    const url = new URL(`${REST_BASE_URL}${options.path}`);
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  public get<T = unknown>(path: string, query?: RequestOptions["query"]): Promise<T> {
    return this.request<T>({ method: "GET", path, query });
  }

  public post<T = unknown>(path: string, body?: unknown, reason?: string, files?: RESTFile[]): Promise<T> {
    return this.request<T>({ method: "POST", path, body, reason, files });
  }

  public put<T = unknown>(path: string, body?: unknown, reason?: string): Promise<T> {
    return this.request<T>({ method: "PUT", path, body, reason });
  }

  public patch<T = unknown>(path: string, body?: unknown, reason?: string, files?: RESTFile[]): Promise<T> {
    return this.request<T>({ method: "PATCH", path, body, reason, files });
  }

  public delete<T = unknown>(path: string, reason?: string): Promise<T> {
    return this.request<T>({ method: "DELETE", path, reason });
  }
}

export class DiscordAPIError extends Error {
  public readonly status: number;
  public readonly payload: unknown;

  constructor(status: number, payload: unknown) {
    super(`Discord API responded with ${status}: ${JSON.stringify(payload)}`);
    this.name = "DiscordAPIError";
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Builds a fallback route key by keeping major-parameter ids (channel/guild/
 * webhook, which scope their own bucket) and collapsing every other
 * snowflake segment, so unrelated resources don't collide before the real
 * X-RateLimit-Bucket hash is known.
 */
function routeKeyFor(method: HTTPMethod, path: string): string {
  const segments = path.split("/");
  for (let i = 0; i < segments.length; i++) {
    if (!/^\d{15,20}$/.test(segments[i])) continue;
    const parent = segments[i - 1];
    const isMajorParam = parent === "channels" || parent === "guilds" || parent === "webhooks";
    if (!isMajorParam) segments[i] = ":id";
  }
  return `${method}:${segments.join("/")}`;
}

function backoff(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 15000);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}
