import { EventEmitter } from "node:events";
import { GATEWAY_URL, GatewayCloseCodes, GatewayOpcodes, UNRECOVERABLE_CLOSE_CODES } from "../util/Constants";

export interface GatewayPayload<T = unknown> {
  op: GatewayOpcodes;
  d: T;
  s: number | null;
  t: string | null;
}

export interface GatewayOptions {
  token: string;
  intents: number;
  largeThreshold?: number;
}

const NON_RESUMABLE_CLOSE_CODES = new Set<number>([GatewayCloseCodes.InvalidSeq, GatewayCloseCodes.SessionTimedOut]);

type GatewayEvents = {
  dispatch: [string, unknown];
  ready: [];
  close: [number];
  debug: [string];
};

/**
 * Owns a single gateway session: handshake, heartbeating, identify/resume
 * lifecycle and reconnection. Emits raw dispatch payloads ("dispatch") for
 * the Client to route into domain structures.
 */
export class Gateway extends EventEmitter {
  private socket: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatAcked = true;
  private sequence: number | null = null;
  private sessionId: string | null = null;
  private resumeGatewayUrl: string | null = null;
  private reconnectAttempts = 0;
  private destroyed = false;

  constructor(private readonly options: GatewayOptions) {
    super();
  }

  public connect(): void {
    this.destroyed = false;
    const url = this.resumeGatewayUrl ?? GATEWAY_URL;
    this.socket = new WebSocket(url);
    this.socket.addEventListener("open", () => this.emit("debug", "socket open"));
    this.socket.addEventListener("message", (event) => this.onMessage(event.data as string));
    this.socket.addEventListener("close", (event) => this.onClose(event.code));
    this.socket.addEventListener("error", (event) => this.emit("debug", `socket error: ${String(event)}`));
  }

  public destroy(): void {
    this.destroyed = true;
    this.clearHeartbeat();
    this.socket?.close(1000);
    this.socket = null;
  }

  public send(op: GatewayOpcodes, d: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ op, d }));
  }

  private onMessage(raw: string): void {
    const payload = JSON.parse(raw) as GatewayPayload;
    if (payload.s !== null) this.sequence = payload.s;

    switch (payload.op) {
      case GatewayOpcodes.Hello: {
        const { heartbeat_interval } = payload.d as { heartbeat_interval: number };
        this.startHeartbeat(heartbeat_interval);
        if (this.sessionId) this.resume();
        else this.identify();
        break;
      }
      case GatewayOpcodes.HeartbeatAck:
        this.heartbeatAcked = true;
        break;
      case GatewayOpcodes.Heartbeat:
        this.sendHeartbeat();
        break;
      case GatewayOpcodes.Reconnect:
        this.reconnect(true);
        break;
      case GatewayOpcodes.InvalidSession: {
        const resumable = payload.d as boolean;
        if (!resumable) {
          this.sessionId = null;
          this.sequence = null;
        }
        setTimeout(() => this.reconnect(resumable), 1000 + Math.random() * 4000);
        break;
      }
      case GatewayOpcodes.Dispatch:
        this.handleDispatch(payload);
        break;
    }
  }

  private handleDispatch(payload: GatewayPayload): void {
    if (payload.t === "READY") {
      const data = payload.d as { session_id: string; resume_gateway_url: string };
      this.sessionId = data.session_id;
      this.resumeGatewayUrl = `${data.resume_gateway_url}/?v=10&encoding=json`;
      this.reconnectAttempts = 0;
      this.emit("ready");
    }
    if (payload.t) this.emit("dispatch", payload.t, payload.d);
  }

  private identify(): void {
    this.send(GatewayOpcodes.Identify, {
      token: this.options.token,
      intents: this.options.intents,
      large_threshold: this.options.largeThreshold ?? 50,
      properties: {
        os: process.platform,
        browser: "discordbot.js",
        device: "discordbot.js",
      },
    });
  }

  private resume(): void {
    this.send(GatewayOpcodes.Resume, {
      token: this.options.token,
      session_id: this.sessionId,
      seq: this.sequence,
    });
  }

  private startHeartbeat(intervalMs: number): void {
    this.clearHeartbeat();
    this.heartbeatAcked = true;
    this.heartbeatTimer = setInterval(() => {
      if (!this.heartbeatAcked) {
        // Missed ack: connection is stale, force a reconnect/resume cycle.
        this.reconnect(true);
        return;
      }
      this.sendHeartbeat();
    }, intervalMs);
    this.heartbeatTimer.unref?.();
  }

  private sendHeartbeat(): void {
    this.heartbeatAcked = false;
    this.send(GatewayOpcodes.Heartbeat, this.sequence);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private onClose(code: number): void {
    this.clearHeartbeat();
    this.emit("close", code);
    if (this.destroyed) return;

    if (UNRECOVERABLE_CLOSE_CODES.has(code)) {
      this.emit("debug", `unrecoverable close code ${code}, not reconnecting`);
      return;
    }

    this.reconnect(!NON_RESUMABLE_CLOSE_CODES.has(code));
  }

  private reconnect(resumable: boolean): void {
    this.clearHeartbeat();
    this.socket?.close();
    if (!resumable) {
      this.sessionId = null;
      this.sequence = null;
      this.resumeGatewayUrl = null;
    }
    const delayMs = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delayMs);
  }
}

export interface Gateway {
  on<K extends keyof GatewayEvents>(event: K, listener: (...args: GatewayEvents[K]) => void): this;
  emit<K extends keyof GatewayEvents>(event: K, ...args: GatewayEvents[K]): boolean;
}
