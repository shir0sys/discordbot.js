import OpusScript = require("opusscript");
import { SAMPLE_RATE, CHANNELS, SAMPLES_PER_FRAME } from "./VoiceConstants";

/** Thin wrapper around opusscript — the one real npm dependency in this library, scoped entirely to voice. */
export class OpusEncoder {
  private readonly encoder: OpusScript;

  constructor() {
    this.encoder = new OpusScript(SAMPLE_RATE, CHANNELS, OpusScript.Application.AUDIO);
  }

  /** `pcm` must be 16-bit signed little-endian, 48kHz, stereo, exactly one 20ms frame (SAMPLES_PER_FRAME samples per channel). */
  public encode(pcm: Buffer): Buffer {
    return this.encoder.encode(pcm, SAMPLES_PER_FRAME);
  }

  public decode(opus: Buffer): Buffer {
    return this.encoder.decode(opus);
  }

  public destroy(): void {
    this.encoder.delete();
  }
}

export const PCM_FRAME_BYTES = SAMPLES_PER_FRAME * CHANNELS * 2; // 2 bytes per sample (16-bit)
