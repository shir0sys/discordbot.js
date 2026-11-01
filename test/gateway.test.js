const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Gateway } = require("../dist/gateway/Gateway");

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.listeners = {};
    this.sent = [];
    FakeWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = FakeWebSocket.OPEN;
      this.dispatch("open", {});
    });
  }

  addEventListener(type, callback) {
    (this.listeners[type] ??= []).push(callback);
  }

  send(data) {
    this.sent.push(data);
  }

  close(code = 1000) {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch("close", { code });
  }

  receive(payload) {
    this.dispatch("message", { data: JSON.stringify(payload) });
  }

  dispatch(type, event) {
    for (const callback of this.listeners[type] ?? []) callback(event);
  }

  sentPayloads() {
    return this.sent.map((raw) => JSON.parse(raw));
  }
}
FakeWebSocket.instances = [];

const OriginalWebSocket = global.WebSocket;
function installFakeWebSocket() {
  FakeWebSocket.instances = [];
  global.WebSocket = FakeWebSocket;
}
test.after(() => {
  global.WebSocket = OriginalWebSocket;
});

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test("sends IDENTIFY with the token/intents after receiving HELLO", async () => {
  installFakeWebSocket();
  const gateway = new Gateway({ token: "test-token", intents: 513 });
  gateway.connect();
  await nextTick();

  const ws = FakeWebSocket.instances[0];
  ws.receive({ op: 10, d: { heartbeat_interval: 45000 }, s: null, t: null });

  const identify = ws.sentPayloads().find((p) => p.op === 2);
  assert.ok(identify, "expected an IDENTIFY payload");
  assert.equal(identify.d.token, "test-token");
  assert.equal(identify.d.intents, 513);

  gateway.destroy();
});

test("unrecoverable close codes emit 'error' and do not reconnect", async () => {
  installFakeWebSocket();
  const gateway = new Gateway({ token: "test-token", intents: 0 });

  let emittedError = null;
  gateway.on("error", (error) => (emittedError = error));

  gateway.connect();
  await nextTick();

  const socketCountBefore = FakeWebSocket.instances.length;
  FakeWebSocket.instances[0].close(4004); // AuthenticationFailed

  assert.ok(emittedError, "expected a GatewayError to be emitted");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(FakeWebSocket.instances.length, socketCountBefore, "should not have opened a reconnect socket");

  gateway.destroy();
});

test("reconnects after a recoverable close code", async () => {
  installFakeWebSocket();
  const gateway = new Gateway({ token: "test-token", intents: 0 });
  gateway.connect();
  await nextTick();

  FakeWebSocket.instances[0].close(4000); // UnknownError — recoverable
  await new Promise((resolve) => setTimeout(resolve, 1100));

  assert.ok(FakeWebSocket.instances.length >= 2, "expected a second socket after the backoff delay");

  gateway.destroy();
});

test("resumes with the existing session_id on reconnect instead of re-identifying", async () => {
  installFakeWebSocket();
  const gateway = new Gateway({ token: "test-token", intents: 0 });
  gateway.connect();
  await nextTick();

  let ws = FakeWebSocket.instances[0];
  ws.receive({ op: 10, d: { heartbeat_interval: 45000 }, s: null, t: null });
  ws.receive({
    op: 0,
    t: "READY",
    s: 1,
    d: { session_id: "abc123", resume_gateway_url: "wss://resume.example.test" },
  });

  ws.close(4000);
  await new Promise((resolve) => setTimeout(resolve, 1100));

  ws = FakeWebSocket.instances.at(-1);
  ws.receive({ op: 10, d: { heartbeat_interval: 45000 }, s: null, t: null });
  const resume = ws.sentPayloads().find((p) => p.op === 6);
  assert.ok(resume, "expected a RESUME payload");
  assert.equal(resume.d.session_id, "abc123");

  gateway.destroy();
});
