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
  // DAVE (end-to-end encryption) protocol opcodes. 21-24 and 31 are plain
  // JSON like every other opcode here; 25-30 are raw binary WebSocket frames
  // (an MLS message, prefixed by a 2-byte big-endian sequence number and a
  // 1-byte opcode for the ones the server sends, see VoiceGateway.onMessage).
  DavePrepareTransition = 21,
  DaveExecuteTransition = 22,
  DaveTransitionReady = 23,
  DavePrepareEpoch = 24,
  DaveMlsExternalSenderPackage = 25,
  DaveMlsKeyPackage = 26,
  DaveMlsProposals = 27,
  DaveMlsCommitWelcome = 28,
  DaveMlsAnnounceCommitTransition = 29,
  DaveMlsWelcome = 30,
  DaveMlsInvalidCommitWelcome = 31,
}

// v8 is required for the DAVE opcodes above (21-31) and the sequence-number
// based resume model they rely on; it also changes the heartbeat payload
// shape to {t, seq_ack} instead of a bare integer nonce.
export const VOICE_GATEWAY_VERSION = 8;

/** The only mode this library speaks: AES-256-GCM is natively available via node:crypto, unlike the XSalsa20-Poly1305 modes. */
export const ENCRYPTION_MODE = "aead_aes256_gcm_rtpsize";

export const SAMPLE_RATE = 48000;
export const CHANNELS = 2;
/** Discord expects one Opus frame per 20ms of audio. At 48kHz that's 960 samples per channel. */
export const FRAME_DURATION_MS = 20;
export const SAMPLES_PER_FRAME = (SAMPLE_RATE / 1000) * FRAME_DURATION_MS;
