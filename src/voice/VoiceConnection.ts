import { EventEmitter } from "node:events";
import { VoiceGateway } from "./VoiceGateway";
import { VoiceUDP } from "./VoiceUDP";
import type { AudioPlayer } from "./AudioPlayer";
import { AudioPlayerStatus } from "./AudioPlayer";

export interface VoiceConnectionOptions {
  guildId: string;
  channelId: string;
  userId: string;
  sessionId: string;
  token: string;
  endpoint: string;
}

export enum VoiceConnectionStatus {
  Connecting = "connecting",
  Ready = "ready",
  Destroyed = "destroyed",
}

type VoiceConnectionEvents = {
  stateChange: [VoiceConnectionStatus];
  error: [Error];
  debug: [string];
};

/** One voice channel connection: owns the voice gateway handshake, the UDP transport, and whatever AudioPlayer is subscribed to it. */
export class VoiceConnection extends EventEmitter {
  public readonly guildId: string;
  public readonly channelId: string;

  private readonly userId: string;
  private sessionId: string;
  private token: string;
  private endpoint: string;

  private gateway: VoiceGateway;
  private udp: VoiceUDP | null = null;
  private player: AudioPlayer | null = null;
  private ssrc: number | null = null;
  private status: VoiceConnectionStatus = VoiceConnectionStatus.Connecting;
  private silenceFramesRemaining = 0;

  constructor(options: VoiceConnectionOptions) {
    super();
    this.guildId = options.guildId;
    this.channelId = options.channelId;
    this.userId = options.userId;
    this.sessionId = options.sessionId;
    this.token = options.token;
    this.endpoint = options.endpoint;

    this.gateway = this.createGateway();
    this.gateway.connect();
  }

  private createGateway(): VoiceGateway {
    const gateway = new VoiceGateway({
      endpoint: this.endpoint,
      guildId: this.guildId,
      userId: this.userId,
      sessionId: this.sessionId,
      token: this.token,
    });

    gateway.on("debug", (message) => this.emit("debug", message));
    gateway.on("ready", (data) => this.onVoiceReady(data));
    gateway.on("sessionDescription", (data) => this.onSessionDescription(data));
    gateway.on("close", (code) => this.emit("debug", `voice gateway closed: ${code}`));
    return gateway;
  }

  /**
   * Discord can (and routinely does) send a corrected VOICE_STATE_UPDATE/
   * VOICE_SERVER_UPDATE pair after the first one, including while the voice
   * websocket from the first pair is still connecting — by the time IDENTIFY
   * goes out, the session it names has already been superseded server-side,
   * which Discord reports as a 4006 right after IDENTIFY. Rather than trying
   * to guess a safe debounce window before connecting at all, keep reacting
   * to new credentials for the life of the connection and re-identify with
   * whatever is actually current.
   */
  public updateVoiceData(data: { sessionId?: string; token?: string; endpoint?: string }): void {
    const sessionId = data.sessionId ?? this.sessionId;
    const token = data.token ?? this.token;
    const endpoint = data.endpoint ?? this.endpoint;
    if (sessionId === this.sessionId && token === this.token && endpoint === this.endpoint) return;
    if (this.status === VoiceConnectionStatus.Destroyed) return;

    this.sessionId = sessionId;
    this.token = token;
    this.endpoint = endpoint;

    this.emit("debug", "voice credentials superseded, re-identifying with the latest session");
    this.gateway.destroy();
    this.udp?.close();
    this.udp = null;
    this.ssrc = null;
    this.status = VoiceConnectionStatus.Connecting;
    this.gateway = this.createGateway();
    this.gateway.connect();
  }

  private async onVoiceReady(data: { ssrc: number; ip: string; port: number }): Promise<void> {
    this.ssrc = data.ssrc;
    this.udp = new VoiceUDP(data.ssrc, data.ip, data.port);
    this.emit("debug", `voice ready (ssrc=${data.ssrc}, ${data.ip}:${data.port}), starting UDP IP discovery`);
    try {
      const discovered = await this.udp.discoverIP();
      this.emit("debug", `UDP IP discovery resolved to ${discovered.address}:${discovered.port}`);
      this.gateway.sendSelectProtocol(discovered.address, discovered.port);
    } catch (error) {
      // Most commonly a firewall/NAT blocking outbound UDP to the voice
      // region server — fail fast with a clear reason instead of leaving
      // waitUntilReady() to time out with no explanation. Reported via
      // 'debug' rather than 'error' so a connection that nobody attached
      // an error listener to doesn't crash the process on top of failing.
      this.emit("debug", `UDP IP discovery failed: ${(error as Error).message}`);
      this.destroy();
    }
  }

  private onSessionDescription(data: { secretKey: Uint8Array }): void {
    this.udp?.setSecretKey(data.secretKey);
    if (this.player) this.player.attach(this.udp!);
    this.status = VoiceConnectionStatus.Ready;
    this.emit("debug", "session description received, connection ready");
    this.emit("stateChange", this.status);
  }

  public get state(): VoiceConnectionStatus {
    return this.status;
  }

  /** Resolves once the voice gateway handshake and UDP session description have both completed — audio sent before that point is silently dropped (no secret key to encrypt it yet). */
  public waitUntilReady(timeoutMs = 10000): Promise<void> {
    if (this.status === VoiceConnectionStatus.Ready) return Promise.resolve();
    if (this.status === VoiceConnectionStatus.Destroyed) {
      return Promise.reject(new Error("Voice connection was destroyed before it became ready"));
    }

    return new Promise((resolve, reject) => {
      const onState = (state: VoiceConnectionStatus) => {
        if (state === VoiceConnectionStatus.Ready) {
          clearTimeout(timer);
          this.off("stateChange", onState);
          resolve();
        } else if (state === VoiceConnectionStatus.Destroyed) {
          clearTimeout(timer);
          this.off("stateChange", onState);
          reject(new Error("Voice connection was destroyed before it became ready"));
        }
      };
      const timer = setTimeout(() => {
        this.off("stateChange", onState);
        reject(new Error("Timed out waiting for the voice connection to become ready"));
      }, timeoutMs);
      timer.unref?.();
      this.on("stateChange", onState);
    });
  }

  /** Attaches a player to this connection's UDP transport and starts toggling the SPEAKING flag with its playback state. */
  public subscribe(player: AudioPlayer): void {
    this.player = player;
    if (this.udp) player.attach(this.udp);

    player.on("stateChange", (state) => {
      if (this.ssrc === null) return;
      if (state === AudioPlayerStatus.Playing) {
        this.gateway.sendSpeaking(this.ssrc, true);
      } else if (state === AudioPlayerStatus.Idle) {
        // Discord recommends sending a handful of silent frames before
        // clearing the speaking flag, so the receiving clients' jitter
        // buffers don't interpolate garbage across the gap.
        this.silenceFramesRemaining = 5;
        this.flushSilence();
      }
    });
  }

  private flushSilence(): void {
    const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);
    const sendOne = () => {
      if (this.silenceFramesRemaining <= 0 || !this.udp) {
        if (this.ssrc !== null) this.gateway.sendSpeaking(this.ssrc, false);
        return;
      }
      this.udp.sendOpusPacket(SILENCE_FRAME);
      this.silenceFramesRemaining--;
      setTimeout(sendOne, 20).unref?.();
    };
    sendOne();
  }

  public destroy(): void {
    this.gateway.destroy();
    this.udp?.close();
    this.status = VoiceConnectionStatus.Destroyed;
    this.emit("stateChange", this.status);
  }
}

export interface VoiceConnection {
  on<K extends keyof VoiceConnectionEvents>(event: K, listener: (...args: VoiceConnectionEvents[K]) => void): this;
  emit<K extends keyof VoiceConnectionEvents>(event: K, ...args: VoiceConnectionEvents[K]): boolean;
}
