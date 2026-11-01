export enum VoiceOpcodes {
  Identify = 0,
  SelectProtocol = 1,
  Ready = 2,
  Heartbeat = 3,
  SessionDescription = 4,
  Speaking = 5,
  HeartbeatAck = 6,
  Resume = 7,
  Hello = 8,
  Resumed = 9,
  ClientsConnect = 11,
  ClientDisconnect = 13,
}

// Per Discord's own docs, v8 is merely the *recommended* version — v4 is
// still accepted (only below v4 is rejected) and keeps the heartbeat as a
// bare integer nonce instead of v8's {t, seq_ack} object, which this client
// doesn't implement. DAVE negotiation (max_dave_protocol_version in
// IDENTIFY, below) is independent of gateway version either way.
export const VOICE_GATEWAY_VERSION = 4;

/** The only mode this library speaks: AES-256-GCM is natively available via node:crypto, unlike the XSalsa20-Poly1305 modes. */
export const ENCRYPTION_MODE = "aead_aes256_gcm_rtpsize";

export const SAMPLE_RATE = 48000;
export const CHANNELS = 2;
/** Discord expects one Opus frame per 20ms of audio. At 48kHz that's 960 samples per channel. */
export const FRAME_DURATION_MS = 20;
export const SAMPLES_PER_FRAME = (SAMPLE_RATE / 1000) * FRAME_DURATION_MS;
