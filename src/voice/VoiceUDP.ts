import { EventEmitter } from "node:events";
import * as dgram from "node:dgram";
import { createCipheriv, createDecipheriv } from "node:crypto";

export interface IPDiscoveryResult {
  address: string;
  port: number;
}

export interface DecryptedRtpPacket {
  ssrc: number;
  sequence: number;
  timestamp: number;
  payload: Buffer;
}

/**
 * Builds one encrypted RTP packet, pure and socket-free so it's unit
 * testable: [12-byte header][AES-256-GCM ciphertext][16-byte auth tag][4-byte
 * nonce]. The header itself is the AEAD's additional authenticated data.
 * This is the documented aead_aes256_gcm_rtpsize framing — verified here to
 * round-trip correctly against Node's own AES-GCM implementation, but the
 * exact byte layout has only been checked against Discord's written spec,
 * not a live voice server.
 */
export function buildRtpPacket(params: {
  sequence: number;
  timestamp: number;
  ssrc: number;
  nonceCounter: number;
  secretKey: Uint8Array;
  opusFrame: Buffer;
}): Buffer {
  const header = Buffer.alloc(12);
  header[0] = 0x80;
  header[1] = 0x78;
  header.writeUInt16BE(params.sequence & 0xffff, 2);
  header.writeUInt32BE(params.timestamp >>> 0, 4);
  header.writeUInt32BE(params.ssrc, 8);

  const nonce = Buffer.alloc(12);
  nonce.writeUInt32BE(params.nonceCounter >>> 0, 0);

  const cipher = createCipheriv("aes-256-gcm", params.secretKey as Uint8Array, nonce);
  cipher.setAAD(header);
  const encrypted = Buffer.concat([cipher.update(params.opusFrame), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const nonceSuffix = Buffer.alloc(4);
  nonceSuffix.writeUInt32BE(params.nonceCounter >>> 0, 0);

  return Buffer.concat([header, encrypted, authTag, nonceSuffix]);
}

/**
 * Reverses buildRtpPacket(): same header/ciphertext/auth-tag/nonce-suffix
 * layout, so this only correctly decodes packets using that exact framing.
 * Real Discord clients can prepend a one-byte RTP header extension (profile
 * 0xBEDE) before the Opus payload for things like silence/video signaling —
 * unhandled here, so packets using one fail the auth tag check and come
 * back null rather than being misparsed. Verified only by round-tripping
 * against buildRtpPacket's own output, not against real client traffic.
 */
export function decryptRtpPacket(params: { packet: Buffer; secretKey: Uint8Array }): DecryptedRtpPacket | null {
  const { packet, secretKey } = params;
  if (packet.length < 12 + 16 + 4) return null;

  const header = packet.subarray(0, 12);
  const sequence = header.readUInt16BE(2);
  const timestamp = header.readUInt32BE(4);
  const ssrc = header.readUInt32BE(8);

  const nonceCounter = packet.readUInt32BE(packet.length - 4);
  const authTag = packet.subarray(packet.length - 4 - 16, packet.length - 4);
  const ciphertext = packet.subarray(12, packet.length - 4 - 16);

  const nonce = Buffer.alloc(12);
  nonce.writeUInt32BE(nonceCounter, 0);

  try {
    const decipher = createDecipheriv("aes-256-gcm", secretKey as Uint8Array, nonce);
    decipher.setAAD(header);
    decipher.setAuthTag(authTag);
    const payload = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return { ssrc, sequence, timestamp, payload };
  } catch {
    return null;
  }
}

type VoiceUDPEvents = {
  /** One decrypted Opus frame from another member — still DAVE-encrypted if the call has E2EE active, see VoiceConnection. */
  packet: [DecryptedRtpPacket];
};

/**
 * Raw UDP transport for one voice connection: IP discovery, RTP framing,
 * and aead_aes256_gcm_rtpsize encryption, both directions.
 */
export class VoiceUDP extends EventEmitter {
  private readonly socket = dgram.createSocket("udp4");
  private sequence = 0;
  private timestamp = 0;
  private nonceCounter = 0;
  private secretKey: Uint8Array | null = null;
  private frameEncryptor: ((frame: Buffer) => Buffer) | null = null;

  constructor(
    private readonly ssrc: number,
    private readonly remoteIp: string,
    private readonly remotePort: number,
  ) {
    super();
    this.socket.on("message", (message) => this.onPacket(message));
  }

  public setSecretKey(key: Uint8Array): void {
    this.secretKey = key;
  }

  /** The IP discovery response (type 0x0002) and any pre-encryption garbage both fail these checks harmlessly; only real RTP audio packets reach decryptRtpPacket. */
  private onPacket(message: Buffer): void {
    if (message.length < 12 || message[0] !== 0x80) return;
    if (!this.secretKey) return;

    const decoded = decryptRtpPacket({ packet: message, secretKey: this.secretKey });
    if (decoded) this.emit("packet", decoded);
  }

  /** When set, every Opus frame is run through this (DAVE end-to-end encryption) before the usual transport-level RTP/AES-256-GCM framing — the two are independent layers. */
  public setFrameEncryptor(encryptor: ((frame: Buffer) => Buffer) | null): void {
    this.frameEncryptor = encryptor;
  }

  /** Discord's IP discovery packet: 74 bytes — 2 byte type, 2 byte length, 4 byte SSRC, 64 byte padded address, 2 byte port. */
  public discoverIP(): Promise<IPDiscoveryResult> {
    return new Promise((resolve, reject) => {
      const request = Buffer.alloc(74);
      request.writeUInt16BE(0x1, 0);
      request.writeUInt16BE(70, 2);
      request.writeUInt32BE(this.ssrc, 4);

      const timer = setTimeout(() => {
        this.socket.off("message", onMessage);
        reject(new Error("UDP IP discovery timed out"));
      }, 5000);

      const onMessage = (message: Buffer) => {
        if (message.readUInt16BE(0) !== 0x2) return;
        clearTimeout(timer);
        this.socket.off("message", onMessage);
        const address = message.subarray(8, 72).toString("utf8").replace(/\0.*$/, "");
        const port = message.readUInt16BE(72);
        resolve({ address, port });
      };

      this.socket.on("message", onMessage);
      this.socket.send(request, this.remotePort, this.remoteIp, (error) => {
        if (error) {
          clearTimeout(timer);
          reject(error);
        }
      });
    });
  }

  /** Encrypts and sends one 20ms Opus frame as an RTP packet. */
  public sendOpusPacket(opusFrame: Buffer): void {
    if (!this.secretKey) throw new Error("Cannot send audio before the session description (encryption key) arrives");

    const frame = this.frameEncryptor ? this.frameEncryptor(opusFrame) : opusFrame;
    const packet = buildRtpPacket({
      sequence: this.sequence,
      timestamp: this.timestamp,
      ssrc: this.ssrc,
      nonceCounter: this.nonceCounter,
      secretKey: this.secretKey,
      opusFrame: frame,
    });
    this.socket.send(packet, this.remotePort, this.remoteIp);

    this.sequence = (this.sequence + 1) & 0xffff;
    this.timestamp = (this.timestamp + 960) >>> 0; // 960 samples per 20ms frame at 48kHz
    this.nonceCounter = (this.nonceCounter + 1) >>> 0;
  }

  public close(): void {
    this.socket.close();
  }
}

export interface VoiceUDP {
  on<K extends keyof VoiceUDPEvents>(event: K, listener: (...args: VoiceUDPEvents[K]) => void): this;
  emit<K extends keyof VoiceUDPEvents>(event: K, ...args: VoiceUDPEvents[K]): boolean;
}
