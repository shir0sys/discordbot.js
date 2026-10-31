import { EventEmitter } from "node:events";
import type { AudioResource } from "./AudioResource";
import type { VoiceUDP } from "./VoiceUDP";

export enum AudioPlayerStatus {
  Idle = "idle",
  Playing = "playing",
  Paused = "paused",
}

type AudioPlayerEvents = {
  stateChange: [AudioPlayerStatus];
  idle: [];
  error: [Error];
};

/**
 * Drives playback on a drift-corrected 20ms clock: each tick's deadline is
 * computed from the last one (`+= 20`) rather than `setTimeout(20)` chained
 * naively, which would accumulate timer-scheduling error over a long track.
 */
export class AudioPlayer extends EventEmitter {
  private status: AudioPlayerStatus = AudioPlayerStatus.Idle;
  private resource: AudioResource | null = null;
  private udp: VoiceUDP | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextFrameTime = 0;

  public attach(udp: VoiceUDP): void {
    this.udp = udp;
  }

  public play(resource: AudioResource): void {
    this.resource?.destroy();
    this.resource = resource;
    this.status = AudioPlayerStatus.Playing;
    this.emit("stateChange", this.status);
    this.nextFrameTime = Date.now();
    this.scheduleNextTick();
  }

  public pause(): void {
    if (this.status !== AudioPlayerStatus.Playing) return;
    this.status = AudioPlayerStatus.Paused;
    if (this.timer) clearTimeout(this.timer);
    this.emit("stateChange", this.status);
  }

  public unpause(): void {
    if (this.status !== AudioPlayerStatus.Paused) return;
    this.status = AudioPlayerStatus.Playing;
    this.nextFrameTime = Date.now();
    this.emit("stateChange", this.status);
    this.scheduleNextTick();
  }

  public stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.resource?.destroy();
    this.resource = null;
    if (this.status !== AudioPlayerStatus.Idle) {
      this.status = AudioPlayerStatus.Idle;
      this.emit("stateChange", this.status);
      this.emit("idle");
    }
  }

  public get state(): AudioPlayerStatus {
    return this.status;
  }

  private scheduleNextTick(): void {
    if (this.status !== AudioPlayerStatus.Playing) return;
    const delay = Math.max(0, this.nextFrameTime - Date.now());
    this.timer = setTimeout(() => void this.tick(), delay);
    this.timer.unref?.();
  }

  private async tick(): Promise<void> {
    if (this.status !== AudioPlayerStatus.Playing || !this.resource) return;

    let frame: Buffer | null;
    try {
      frame = await this.resource.nextFrame();
    } catch (error) {
      this.emit("error", error as Error);
      this.stop();
      return;
    }

    if (frame === null) {
      this.stop();
      return;
    }

    this.udp?.sendOpusPacket(frame);
    this.nextFrameTime += 20;
    this.scheduleNextTick();
  }
}

export interface AudioPlayer {
  on<K extends keyof AudioPlayerEvents>(event: K, listener: (...args: AudioPlayerEvents[K]) => void): this;
  emit<K extends keyof AudioPlayerEvents>(event: K, ...args: AudioPlayerEvents[K]): boolean;
}
