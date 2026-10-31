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

  private readonly gateway: VoiceGateway;
  private udp: VoiceUDP | null = null;
  private player: AudioPlayer | null = null;
  private ssrc: number | null = null;
  private status: VoiceConnectionStatus = VoiceConnectionStatus.Connecting;
  private silenceFramesRemaining = 0;

  constructor(options: VoiceConnectionOptions) {
    super();
    this.guildId = options.guildId;
    this.channelId = options.channelId;

    this.gateway = new VoiceGateway({
      endpoint: options.endpoint,
      guildId: options.guildId,
      userId: options.userId,
      sessionId: options.sessionId,
      token: options.token,
    });

    this.gateway.on("debug", (message) => this.emit("debug", message));
    this.gateway.on("ready", (data) => this.onVoiceReady(data));
    this.gateway.on("sessionDescription", (data) => this.onSessionDescription(data));
    this.gateway.on("close", (code) => this.emit("debug", `voice gateway closed: ${code}`));
    this.gateway.connect();
  }

  private async onVoiceReady(data: { ssrc: number; ip: string; port: number }): Promise<void> {
    this.ssrc = data.ssrc;
    this.udp = new VoiceUDP(data.ssrc, data.ip, data.port);
    try {
      const discovered = await this.udp.discoverIP();
      this.gateway.sendSelectProtocol(discovered.address, discovered.port);
    } catch (error) {
      this.emit("error", error as Error);
    }
  }

  private onSessionDescription(data: { secretKey: Uint8Array }): void {
    this.udp?.setSecretKey(data.secretKey);
    if (this.player) this.player.attach(this.udp!);
    this.status = VoiceConnectionStatus.Ready;
    this.emit("stateChange", this.status);
  }

  public get state(): VoiceConnectionStatus {
    return this.status;
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
