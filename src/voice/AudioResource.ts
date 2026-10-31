import { OpusEncoder, PCM_FRAME_BYTES } from "./OpusEncoder";

/**
 * Pulls exactly one 20ms Opus frame at a time, either by encoding raw PCM
 * (16-bit signed LE, 48kHz, stereo — e.g. straight off `ffmpeg -f s16le`)
 * read from a Node stream, or by replaying an already-Opus-encoded frame
 * list for callers who did their own encoding/demuxing.
 */
export class AudioResource {
  private readonly encoder: OpusEncoder | null;
  private buffered = Buffer.alloc(0);
  private streamEnded = false;
  private opusIndex = 0;

  private constructor(
    private readonly pcmStream: NodeJS.ReadableStream | null,
    private readonly opusFrames: Buffer[] | null,
  ) {
    this.encoder = pcmStream ? new OpusEncoder() : null;
    if (pcmStream) {
      pcmStream.on("end", () => (this.streamEnded = true));
      pcmStream.on("error", () => (this.streamEnded = true));
    }
  }

  public static fromPCMStream(stream: NodeJS.ReadableStream): AudioResource {
    return new AudioResource(stream, null);
  }

  public static fromOpusFrames(frames: Buffer[]): AudioResource {
    return new AudioResource(null, frames);
  }

  /** Returns the next 20ms Opus frame, or null once the resource is exhausted. */
  public async nextFrame(): Promise<Buffer | null> {
    if (this.opusFrames) {
      return this.opusIndex < this.opusFrames.length ? this.opusFrames[this.opusIndex++] : null;
    }
    return this.nextPCMFrame();
  }

  private async nextPCMFrame(): Promise<Buffer | null> {
    while (this.buffered.length < PCM_FRAME_BYTES) {
      if (this.streamEnded) {
        if (this.buffered.length === 0) return null;
        // Pad the final partial frame with silence rather than drop it.
        this.buffered = Buffer.concat([this.buffered, Buffer.alloc(PCM_FRAME_BYTES - this.buffered.length)]);
        break;
      }
      const chunk = await readChunk(this.pcmStream!);
      if (chunk === null) {
        this.streamEnded = true;
        continue;
      }
      this.buffered = Buffer.concat([this.buffered, chunk]);
    }

    const frame = this.buffered.subarray(0, PCM_FRAME_BYTES);
    this.buffered = this.buffered.subarray(PCM_FRAME_BYTES);
    return this.encoder!.encode(frame);
  }

  public destroy(): void {
    this.encoder?.destroy();
  }
}

function readChunk(stream: NodeJS.ReadableStream): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const cleanup = () => {
      stream.off("readable", onReadable);
      stream.off("end", onEnd);
    };
    const onReadable = () => {
      const chunk = (stream as { read(size?: number): unknown }).read();
      cleanup();
      resolve((chunk as Buffer | null) ?? null);
    };
    const onEnd = () => {
      cleanup();
      resolve(null);
    };
    stream.once("readable", onReadable);
    stream.once("end", onEnd);
  });
}
