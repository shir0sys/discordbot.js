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
 * Reverses buildRtpPacket() for our own output, and also decodes real
 * Discord client traffic, which routinely sets the RTP header's extension
 * bit and prepends a one-byte-header extension (profile 0xBEDE) right
 * after the fixed 12-byte header. The "rtpsize" encryption modes are named
 * for exactly this: the AEAD's associated data covers the header *plus*
 * that extension (and any CSRC list, always empty in practice for Discord)
 * so the extension can travel unencrypted but still authenticated — only
 * the actual Opus frame after it is ciphertext. Getting this AAD/ciphertext
 * boundary wrong fails the auth tag silently (returns null) rather than
 * producing garbage audio, which is what real client packets did before
 * this accounted for the extension.
 *
 * Confirmed against @discordjs/voice's own receive-side implementation
 * (packages/voice/src/receive/VoiceReceiver.ts): the AAD only covers the
 * fixed header + CSRC list + the 4-byte extension *header* (profile +
 * length) — the extension's actual data words are inside the ciphertext,
 * encrypted together with the Opus frame, and get sliced off the front of
 * the decrypted plaintext afterward rather than excluded from the AAD.
 */
export function decryptRtpPacket(params: { packet: Buffer; secretKey: Uint8Array }): DecryptedRtpPacket | null {
  const { packet, secretKey } = params;
  if (packet.length < 12 + 16 + 4) return null;

  const versionAndFlags = packet[0];
  const hasExtension = (versionAndFlags & 0x10) !== 0;
  const csrcCount = versionAndFlags & 0x0f;

  const sequence = packet.readUInt16BE(2);
  const timestamp = packet.readUInt32BE(4);
  const ssrc = packet.readUInt32BE(8);

  const extensionHeaderOffset = 12 + csrcCount * 4;
  let aadEnd = extensionHeaderOffset;
  if (hasExtension) {
    if (packet.length < aadEnd + 4) return null;
    aadEnd += 4;
  }
  if (aadEnd + 16 + 4 > packet.length) return null;

  const aad = packet.subarray(0, aadEnd);
  const nonceCounter = packet.readUInt32BE(packet.length - 4);
  const authTag = packet.subarray(packet.length - 4 - 16, packet.length - 4);
  const ciphertext = packet.subarray(aadEnd, packet.length - 4 - 16);

  const nonce = Buffer.alloc(12);
  nonce.writeUInt32BE(nonceCounter, 0);

  try {
    const decipher = createDecipheriv("aes-256-gcm", secretKey as Uint8Array, nonce);
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);
    let payload = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    if (hasExtension) {
      const extensionWords = packet.readUInt16BE(extensionHeaderOffset + 2);
      payload = payload.subarray(4 * extensionWords);
    }
    return { ssrc, sequence, timestamp, payload };
  } catch {
    return null;
  }
}

type VoiceUDPEvents = {
  /** One decrypted Opus frame from another member — still DAVE-encrypted if the call has E2EE active, see VoiceConnection. */
  packet: [DecryptedRtpPacket];
  debug: [string];
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
    if (message.length < 12) return;
    // Version bits only (top 2 bits of byte 0) — real clients can legitimately
    // set the padding/extension/CSRC-count bits too, unlike our own buildRtpPacket.
    if ((message[0] & 0xc0) !== 0x80) {
      this.emit("debug", `dropped non-RTPv2 packet (len=${message.length}, byte0=0x${message[0].toString(16)})`);
      return;
    }
    if (!this.secretKey) {
      this.emit("debug", "dropped RTP packet received before secret key was set");
      return;
    }

    const decoded = decryptRtpPacket({ packet: message, secretKey: this.secretKey });
    if (decoded) {
      this.emit("packet", decoded);
    } else {
      this.emit("debug", `RTP packet failed to decrypt (len=${message.length}, byte0=0x${message[0].toString(16)})`);
    }
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
