export class HTTPError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HTTPError";
  }
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfterMs: number, public readonly route: string) {
    super(`Rate limited on ${route}, retry after ${retryAfterMs}ms`);
    this.name = "RateLimitError";
  }
}

export class GatewayError extends Error {
  constructor(public readonly closeCode: number, message: string) {
    super(message);
    this.name = "GatewayError";
  }
}
