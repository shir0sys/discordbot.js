import { EventEmitter } from "node:events";
import { VoiceGateway, UNRECOVERABLE_VOICE_CLOSE_CODES, VOICE_CLOSE_CODE_REASONS } from "./VoiceGateway";
import { VoiceUDP, type DecryptedRtpPacket } from "./VoiceUDP";
import { DaveSession } from "./DaveSession";
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
  /** One decoded-from-transport Opus frame from another member, already past DAVE decryption when the call has E2EE active — still Opus, not PCM; decode with OpusEncoder if you need raw audio. */
  audioPacket: [{ userId: string; opusFrame: Buffer }];
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
  private dave: DaveSession | null = null;
  private readonly ssrcToUserId = new Map<number, string>();
  // Binary DAVE events (external sender, proposals, commit/welcome) can in
  // principle arrive before SESSION_DESCRIPTION tells us the negotiated
  // dave_protocol_version and lets us construct the DaveSession — queue
  // them and replay once it exists rather than assuming a fixed order.
  private pendingDaveEvents: (() => void)[] = [];

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
    gateway.on("close", (code) => {
      this.emit("debug", `voice gateway closed: ${code}`);
      if (UNRECOVERABLE_VOICE_CLOSE_CODES.has(code) && this.status !== VoiceConnectionStatus.Destroyed) {
        this.emit(
          "error",
          new Error(`Voice connection closed (${code}): ${VOICE_CLOSE_CODE_REASONS[code] ?? "unrecoverable"}`),
        );
        this.destroy();
      }
    });

    gateway.on("daveExternalSender", (data) => this.runOrQueueDave(() => this.dave!.handleExternalSender(data)));
    gateway.on("daveProposals", ({ operationType, data }) =>
      this.runOrQueueDave(() => this.dave!.handleProposals(operationType, data)),
    );
    gateway.on("daveAnnounceCommitTransition", ({ transitionId, commit }) =>
      this.runOrQueueDave(() => this.dave!.handleAnnounceCommitTransition(transitionId, commit)),
    );
    gateway.on("daveWelcome", ({ transitionId, welcome }) =>
      this.runOrQueueDave(() => this.dave!.handleWelcome(transitionId, welcome)),
    );
    gateway.on("davePrepareEpoch", ({ transitionId, protocolVersion }) => {
      this.runOrQueueDave(() => this.dave!.handlePrepareEpoch(protocolVersion));
      gateway.sendDaveTransitionReady(transitionId);
    });
    gateway.on("davePrepareTransition", ({ transitionId, protocolVersion }) => {
      // protocol_version 0 means the call is downgrading out of E2EE entirely.
      if (protocolVersion === 0) this.dave?.setPassthroughMode(true);
      gateway.sendDaveTransitionReady(transitionId);
    });
    gateway.on("daveExecuteTransition", () => {
      // Nothing to actively do here: encryptOpus() is only consulted when
      // this.dave is non-null and ready, so a downgrade just means we stop
      // consulting it once the server confirms the transition via a later
      // prepare_epoch, or the connection is torn down.
    });

    gateway.on("speaking", ({ ssrc, userId }) => {
      this.ssrcToUserId.set(ssrc, userId);
      this.emit("debug", `speaking: ssrc=${ssrc} -> userId=${userId}`);
    });
    gateway.on("clientDisconnect", (userId) => {
      for (const [ssrc, id] of this.ssrcToUserId) {
        if (id === userId) this.ssrcToUserId.delete(ssrc);
      }
    });

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
    this.dave = null;
    this.pendingDaveEvents = [];
    this.status = VoiceConnectionStatus.Connecting;
    this.gateway = this.createGateway();
    this.gateway.connect();
  }

  private async onVoiceReady(data: { ssrc: number; ip: string; port: number }): Promise<void> {
    this.ssrc = data.ssrc;
    this.udp = new VoiceUDP(data.ssrc, data.ip, data.port);
    this.udp.on("packet", (packet) => this.handleIncomingPacket(packet));
    this.udp.on("debug", (message) => this.emit("debug", `[udp] ${message}`));
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

  /**
   * SSRCs are only ever introduced via the gateway's Speaking broadcast, so a
   * packet for one we haven't seen yet (e.g. it arrives a moment before that
   * broadcast does) is dropped rather than guessed at. With DAVE active, the
   * transport layer only gets us back to the still-end-to-end-encrypted
   * frame — decryptOpus() is what actually recovers the sender's Opus bytes.
   */
  private handleIncomingPacket(packet: DecryptedRtpPacket): void {
    const userId = this.ssrcToUserId.get(packet.ssrc);
    if (!userId) {
      this.emit("debug", `dropped audio packet for unknown ssrc=${packet.ssrc}`);
      return;
    }

    let opusFrame = packet.payload;
    if (this.dave) {
      try {
        opusFrame = this.dave.decryptOpus(userId, packet.payload);
      } catch (error) {
        this.emit("debug", `DAVE decrypt failed for ${userId}: ${(error as Error).message}`);
        return;
      }
    }

    this.emit("audioPacket", { userId, opusFrame });
  }

  private onSessionDescription(data: { secretKey: Uint8Array; daveProtocolVersion: number }): void {
    this.udp?.setSecretKey(data.secretKey);
    if (this.player) this.player.attach(this.udp!);

    if (data.daveProtocolVersion > 0 && !this.dave) {
      this.dave = this.createDaveSession(data.daveProtocolVersion);
      this.pendingDaveEvents.forEach((run) => run());
      this.pendingDaveEvents = [];
      this.dave.start();
    }

    // Without DAVE, the connection is ready for audio right away. With it,
    // wait for the MLS group handshake (driven by the dave* events above) to
    // actually finish — encryptOpus() would otherwise be called on a session
    // that isn't ready yet, which fails.
    if (!this.dave || this.dave.ready) this.markReady();
  }

  private markReady(): void {
    if (this.status === VoiceConnectionStatus.Ready) return;
    this.status = VoiceConnectionStatus.Ready;
    this.emit("debug", "connection ready");
    this.emit("stateChange", this.status);
  }

  private createDaveSession(protocolVersion: number): DaveSession {
    const dave = new DaveSession(protocolVersion, this.userId, this.channelId);
    dave.on("debug", (message) => this.emit("debug", `[dave] ${message}`));
    dave.on("sendKeyPackage", (keyPackage) => this.gateway.sendDaveKeyPackage(keyPackage));
    dave.on("sendCommitWelcome", (commit, welcome) => this.gateway.sendDaveCommitWelcome(commit, welcome));
    dave.on("sendReady", (transitionId) => this.gateway.sendDaveTransitionReady(transitionId));
    dave.on("sendInvalidCommitWelcome", (transitionId) => this.gateway.sendDaveInvalidCommitWelcome(transitionId));
    dave.on("ready", () => {
      this.udp?.setFrameEncryptor((frame) => dave.encryptOpus(frame));
      this.markReady();
    });
    return dave;
  }

  /** DAVE events can arrive before SESSION_DESCRIPTION constructs the DaveSession — queue them instead of dropping them. */
  private runOrQueueDave(run: () => void): void {
    if (this.dave) run();
    else this.pendingDaveEvents.push(run);
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
      // this.udp can go from a live socket to null between two 20ms-spaced
      // timer ticks (e.g. stop() immediately followed by destroy()) — check
      // status too, since a stale udp reference alone wouldn't catch that.
      if (this.silenceFramesRemaining <= 0 || !this.udp || this.status === VoiceConnectionStatus.Destroyed) {
        if (this.ssrc !== null) this.gateway.sendSpeaking(this.ssrc, false);
        return;
      }
      try {
        this.udp.sendOpusPacket(SILENCE_FRAME);
      } catch {
        return; // socket already closed underneath us — nothing left to flush
      }
      this.silenceFramesRemaining--;
      setTimeout(sendOne, 20).unref?.();
    };
    sendOne();
  }

  public destroy(): void {
    this.gateway.destroy();
    this.udp?.close();
    this.udp = null;
    this.status = VoiceConnectionStatus.Destroyed;
    this.emit("stateChange", this.status);
  }
}

export interface VoiceConnection {
  on<K extends keyof VoiceConnectionEvents>(event: K, listener: (...args: VoiceConnectionEvents[K]) => void): this;
  emit<K extends keyof VoiceConnectionEvents>(event: K, ...args: VoiceConnectionEvents[K]): boolean;
}
