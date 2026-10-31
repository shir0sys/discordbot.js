const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { ShardingManager } = require("../dist/sharding/ShardingManager");

const fixture = path.join(__dirname, "fixtures", "fake-shard.js");

test("ShardingManager spawns shards, reports them ready, and can broadcastEval across them", async (t) => {
  const manager = new ShardingManager(fixture, { totalShards: 2, token: "unused", respawn: false });
  const ready = [];
  manager.on("shardReady", (id) => ready.push(id));

  await manager.spawn();
  await waitFor(() => ready.length === 2);
  assert.deepEqual(ready.sort(), [0, 1]);

  const results = await manager.broadcastEval("globalThis.shardId");
  assert.deepEqual(results.sort(), [0, 1]);

  t.after(() => manager.respawnAll());
});

function waitFor(condition, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error("waitFor timed out"));
      }
    }, 20);
  });
}
