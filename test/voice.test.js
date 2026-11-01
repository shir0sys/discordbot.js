const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDecipheriv, randomBytes } = require("node:crypto");
const { buildRtpPacket } = require("../dist/voice/VoiceUDP");
const { OpusEncoder, PCM_FRAME_BYTES } = require("../dist/voice/OpusEncoder");
const { DaveSession } = require("../dist/voice/DaveSession");
const { DAVE_PROTOCOL_VERSION } = require("@snazzah/davey");

test("buildRtpPacket produces a header Discord can parse and a payload Node's own AES-256-GCM can decrypt", () => {
  const secretKey = randomBytes(32);
  const opusFrame = Buffer.from([0xf8, 0xff, 0xfe]); // a real Opus "silence" frame

  const packet = buildRtpPacket({
    sequence: 5,
    timestamp: 4800,
    ssrc: 12345,
    nonceCounter: 7,
    secretKey,
    opusFrame,
  });

  // --- header ---
  assert.equal(packet[0], 0x80, "RTP version/flags byte");
  assert.equal(packet[1], 0x78, "payload type byte (Opus)");
  assert.equal(packet.readUInt16BE(2), 5, "sequence number");
  assert.equal(packet.readUInt32BE(4), 4800, "timestamp");
  assert.equal(packet.readUInt32BE(8), 12345, "ssrc");

  const header = packet.subarray(0, 12);
  const nonceSuffix = packet.subarray(packet.length - 4);
  assert.equal(nonceSuffix.readUInt32BE(0), 7, "the 4-byte nonce counter trails the packet");

  const ciphertextAndTag = packet.subarray(12, packet.length - 4);
  const authTag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16);
  const ciphertext = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16);

  const iv = Buffer.alloc(12);
  iv.writeUInt32BE(7, 0);

  const decipher = createDecipheriv("aes-256-gcm", secretKey, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(header);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  assert.deepEqual(decrypted, opusFrame, "decrypting with the same key/nonce/AAD recovers the original Opus frame");
});

test("buildRtpPacket rejects tampered ciphertext (GCM auth tag actually protects the payload)", () => {
  const secretKey = randomBytes(32);
  const packet = buildRtpPacket({
    sequence: 0,
    timestamp: 0,
    ssrc: 1,
    nonceCounter: 0,
    secretKey,
    opusFrame: Buffer.from([1, 2, 3]),
  });

  packet[12] ^= 0xff; // flip a bit in the ciphertext

  const header = packet.subarray(0, 12);
  const nonceSuffix = packet.subarray(packet.length - 4);
  const ciphertextAndTag = packet.subarray(12, packet.length - 4);
  const authTag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16);
  const ciphertext = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16);

  const iv = Buffer.alloc(12);
  iv.writeUInt32BE(nonceSuffix.readUInt32BE(0), 0);

  const decipher = createDecipheriv("aes-256-gcm", secretKey, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(header);

  assert.throws(() => {
    decipher.update(ciphertext);
    decipher.final();
  });
});

test("OpusEncoder round-trips silence through real libopus (via opusscript)", () => {
  const encoder = new OpusEncoder();
  const silence = Buffer.alloc(PCM_FRAME_BYTES);

  const opus = encoder.encode(silence);
  assert.ok(opus.length > 0 && opus.length < PCM_FRAME_BYTES, "Opus output should be much smaller than raw PCM");

  const decoded = encoder.decode(opus);
  assert.equal(decoded.length, PCM_FRAME_BYTES);

  encoder.destroy();
});

test("DaveSession submits a key package on start() and stays not-ready until a group is established", () => {
  const session = new DaveSession(DAVE_PROTOCOL_VERSION, "1234567890123456789", "9876543210987654321");
  assert.equal(session.ready, false);

  let keyPackage = null;
  session.on("sendKeyPackage", (buf) => (keyPackage = buf));
  session.start();

  assert.ok(Buffer.isBuffer(keyPackage), "start() should emit a serialized MLS key package");
  assert.ok(keyPackage.length > 0);
  assert.equal(session.ready, false, "a lone key package doesn't establish a group by itself");
});

test("DaveSession reports processProposals/processCommit/processWelcome failures via 'debug' instead of throwing", () => {
  const session = new DaveSession(DAVE_PROTOCOL_VERSION, "1234567890123456789", "9876543210987654321");
  session.start();

  const debugMessages = [];
  session.on("debug", (message) => debugMessages.push(message));
  session.on("sendInvalidCommitWelcome", () => {});

  assert.doesNotThrow(() => session.handleProposals(0, Buffer.from([1, 2, 3])));
  assert.doesNotThrow(() => session.handleAnnounceCommitTransition(1, Buffer.from([1, 2, 3])));
  assert.doesNotThrow(() => session.handleWelcome(1, Buffer.from([1, 2, 3])));
  assert.ok(debugMessages.some((message) => message.includes("processProposals failed")));
  assert.ok(debugMessages.some((message) => message.includes("processCommit failed")));
  assert.ok(debugMessages.some((message) => message.includes("processWelcome failed")));
});
