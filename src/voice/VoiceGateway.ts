import { EventEmitter } from "node:events";
import { VoiceOpcodes, VOICE_GATEWAY_VERSION, ENCRYPTION_MODE } from "./VoiceConstants";

export const VOICE_CLOSE_CODE_REASONS: Record<number, string> = {
  4001: "unknown opcode",
  4002: "failed to decode payload",
  4003: "not identified",
  4004: "authentication failed — bad token/session",
  4005: "already identified",
  4006: "session no longer valid",
  4009: "session timed out",
  4011: "server not found",
  4012: "unknown protocol",
  4014: "disconnected (kicked/moved from the channel)",
  4015: "voice server crashed",
  4016: "unknown encryption mode",
  4017: "E2EE/DAVE protocol required — not implemented by this client",
  4020: "malformed request",
  4021: "rate limited",
  4022: "call terminated",
};

// Reconnecting after these reproduces the identical rejection every time;
// only unlisted codes (session timeouts, the server crashing, etc.) are
// worth a blind retry.
export const UNRECOVERABLE_VOICE_CLOSE_CODES = new Set([
  4001, 4002, 4003, 4004, 4005, 4006, 4011, 4012, 4014, 4016, 4017, 4020, 4021, 4022,
]);

export interface VoiceGatewayOptions {
  endpoint: string;
  guildId: string;
  userId: string;
  sessionId: string;
  token: string;
}

export interface VoiceReadyData {
  ssrc: number;
  ip: string;
  port: number;
  modes: string[];
}

export interface VoiceSessionDescription {
  mode: string;
  secretKey: Uint8Array;
}

type VoiceGatewayEvents = {
  ready: [VoiceReadyData];
  sessionDescription: [VoiceSessionDescription];
  hello: [];
  resumed: [];
  close: [number];
  debug: [string];
};

/**
 * One voice gateway session: handshake (IDENTIFY -> READY -> SELECT_PROTOCOL
 * -> SESSION_DESCRIPTION), heartbeating, and RESUME on recoverable drops.
 * Mirrors the main Gateway's structure but speaks the separate voice
 * protocol (different opcodes, a different handshake shape, no dispatch
 * events — everything here is already domain-specific).
 */
export class VoiceGateway extends EventEmitter {
  private socket: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatAcked = true;
  private sessionId: string | null = null;
  private serverSessionId: string | null = null;
  private destroyed = false;
  private readonly createdAt = Date.now();

  constructor(private readonly options: VoiceGatewayOptions) {
    super();
  }

  // Temporary diagnostic: every debug line carries ms elapsed since this
  // VoiceGateway was constructed, to rule out an unexpected delay anywhere
  // in the handshake (e.g. DNS, TLS, or an internal queue) as the reason a
  // session_id/token pair that looks valid still gets rejected with 4006.
  private debug(message: string): void {
    this.emit("debug", `+${Date.now() - this.createdAt}ms ${message}`);
  }

  public connect(): void {
    this.destroyed = false;
    // The endpoint from VOICE_SERVER_UPDATE can carry a port that's specific
    // to the voice server instance this session was actually assigned to
    // (e.g. ":2053") — stripping it and connecting on the wss default (443)
    // instead routes to a different instance that doesn't recognize the
    // session, which Discord reports as 4006 right after IDENTIFY.
    const url = `wss://${this.options.endpoint}/?v=${VOICE_GATEWAY_VERSION}`;
    this.debug(`connecting to ${url}`);
    this.socket = new WebSocket(url);
    this.socket.addEventListener("open", () => this.debug("voice socket open"));
    this.socket.addEventListener("message", (event) => this.onMessage(event.data as string));
    this.socket.addEventListener("close", (event) => this.onClose(event.code, (event as CloseEvent).reason));
    this.socket.addEventListener("error", (event) => this.debug(`voice socket error: ${String(event)}`));
  }

  public destroy(): void {
    this.destroyed = true;
    this.clearHeartbeat();
    this.socket?.close(1000);
    this.socket = null;
  }

  public send(op: VoiceOpcodes, d: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ op, d }));
  }

  public sendSelectProtocol(address: string, port: number): void {
    this.debug(`sending SELECT_PROTOCOL (${address}:${port}, mode=${ENCRYPTION_MODE})`);
    this.send(VoiceOpcodes.SelectProtocol, {
      protocol: "udp",
      data: { address, port, mode: ENCRYPTION_MODE },
    });
  }

  public sendSpeaking(ssrc: number, speaking = true): void {
    this.send(VoiceOpcodes.Speaking, { speaking: speaking ? 1 : 0, delay: 0, ssrc });
  }

  private onMessage(raw: string): void {
    const payload = JSON.parse(raw) as { op: VoiceOpcodes; d: any };

    switch (payload.op) {
      case VoiceOpcodes.Hello:
        this.debug(`voice HELLO received (heartbeat_interval=${payload.d.heartbeat_interval})`);
        this.startHeartbeat(payload.d.heartbeat_interval);
        this.emit("hello");
        this.identify();
        break;
      case VoiceOpcodes.Ready:
        this.debug(`voice READY, supported modes: ${payload.d.modes?.join(", ")}`);
        this.emit("ready", { ssrc: payload.d.ssrc, ip: payload.d.ip, port: payload.d.port, modes: payload.d.modes });
        break;
      case VoiceOpcodes.SessionDescription:
        this.debug(`voice SESSION_DESCRIPTION received (mode=${payload.d.mode})`);
        this.emit("sessionDescription", { mode: payload.d.mode, secretKey: Uint8Array.from(payload.d.secret_key) });
        break;
      case VoiceOpcodes.HeartbeatAck:
        this.heartbeatAcked = true;
        break;
      case VoiceOpcodes.Resumed:
        this.emit("resumed");
        break;
    }
  }

  private identify(): void {
    // Temporary diagnostic: printing the exact fields (not just "sending
    // IDENTIFY") to find out which one Discord is actually rejecting,
    // since 4006 gives no further detail. session_id/server_id/user_id
    // aren't secret; the token is shown truncated.
    this.debug(
      `sending voice IDENTIFY: server_id=${this.options.guildId} user_id=${this.options.userId} ` +
        `session_id=${this.options.sessionId} (len ${this.options.sessionId.length}) ` +
        `token=${this.options.token.slice(0, 8)}... (len ${this.options.token.length})`,
    );
    this.send(VoiceOpcodes.Identify, {
      server_id: this.options.guildId,
      user_id: this.options.userId,
      session_id: this.options.sessionId,
      token: this.options.token,
      // Declares no DAVE (end-to-end encryption) protocol support, opting
      // into the plain legacy handshake this client speaks. Omitting this
      // field entirely on a guild where DAVE is active is a known cause of
      // an immediate 4006 right after IDENTIFY.
      max_dave_protocol_version: 0,
    });
  }

  private startHeartbeat(intervalMs: number): void {
    this.clearHeartbeat();
    this.heartbeatAcked = true;
    this.heartbeatTimer = setInterval(() => {
      if (!this.heartbeatAcked) {
        this.debug("voice heartbeat not acked, reconnecting");
        this.socket?.close();
        return;
      }
      this.heartbeatAcked = false;
      this.send(VoiceOpcodes.Heartbeat, Date.now());
    }, intervalMs);
    this.heartbeatTimer.unref?.();
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private onClose(code: number, reason?: string): void {
    this.clearHeartbeat();
    this.debug(
      `voice socket closed: ${code} (${VOICE_CLOSE_CODE_REASONS[code] ?? "unknown"})${reason ? ` — reason: ${reason}` : ""}`,
    );
    this.emit("close", code);
    if (this.destroyed) return;
    // Retrying any of these just reproduces the exact same rejection forever
    // (wrong/expired credentials, a channel/call that's gone, a mismatched
    // encryption mode, or this client's complete lack of DAVE/E2EE support)
    // — only genuinely transient closes are worth an automatic reconnect.
    if (UNRECOVERABLE_VOICE_CLOSE_CODES.has(code)) return;
    setTimeout(() => this.connect(), 1000);
  }
}

export interface VoiceGateway {
  on<K extends keyof VoiceGatewayEvents>(event: K, listener: (...args: VoiceGatewayEvents[K]) => void): this;
  emit<K extends keyof VoiceGatewayEvents>(event: K, ...args: VoiceGatewayEvents[K]): boolean;
}
