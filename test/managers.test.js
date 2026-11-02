const { test } = require("node:test");
const assert = require("node:assert/strict");
const { GuildManager } = require("../dist/managers/GuildManager");
const { UserManager } = require("../dist/managers/UserManager");
const { GuildMemberManager } = require("../dist/managers/GuildMemberManager");
const { RoleManager } = require("../dist/managers/RoleManager");
const { PresenceManager } = require("../dist/managers/PresenceManager");
const { VoiceStateManager } = require("../dist/managers/VoiceStateManager");
const { ReactionManager, reactionKey } = require("../dist/managers/ReactionManager");

function countingClient(response) {
  let calls = 0;
  return {
    calls: () => calls,
    rest: {
      get: async () => {
        calls++;
        return response;
      },
    },
  };
}

test("GuildManager.fetch only hits REST once per id unless force is passed", async () => {
  const client = countingClient({ id: "g1", name: "Test", owner_id: "o1", icon: null, roles: [] });
  const manager = new GuildManager(client);

  const a = await manager.fetch("g1");
  const b = await manager.fetch("g1");
  assert.equal(client.calls(), 1);
  assert.equal(a, b);

  await manager.fetch("g1", { force: true });
  assert.equal(client.calls(), 2);
});

test("UserManager.fetch is cache-first", async () => {
  const client = countingClient({ id: "u1", username: "x", discriminator: "0", global_name: null, avatar: null });
  const manager = new UserManager(client);

  await manager.fetch("u1");
  await manager.fetch("u1");
  assert.equal(client.calls(), 1);
});

test("GuildMemberManager.fetch is cache-first", async () => {
  const client = countingClient({
    user: { id: "u1", username: "x", discriminator: "0", global_name: null, avatar: null },
    nick: null,
    roles: [],
    joined_at: new Date().toISOString(),
  });
  const manager = new GuildMemberManager(client, "g1");

  await manager.fetch("u1");
  await manager.fetch("u1");
  assert.equal(client.calls(), 1);
});

test("RoleManager (now CachedManager-based) still exposes .cache and plain Map behavior", async () => {
  const client = countingClient({});
  const manager = new RoleManager(client, "g1");
  manager.set("r1", { id: "r1", name: "Admin" });

  assert.equal(manager.cache, manager);
  assert.equal(manager.cache.get("r1").name, "Admin");
});

test("VoiceStateManager.inChannel filters by channelId", () => {
  const manager = new VoiceStateManager(countingClient({}));
  manager.set("u1", { userId: "u1", channelId: "c1" });
  manager.set("u2", { userId: "u2", channelId: "c2" });
  manager.set("u3", { userId: "u3", channelId: "c1" });

  const inC1 = manager.inChannel("c1").map((s) => s.userId);
  assert.deepEqual(inC1.sort(), ["u1", "u3"]);
});

test("PresenceManager is a plain cache keyed by userId", () => {
  const manager = new PresenceManager(countingClient({}));
  manager.set("u1", { userId: "u1", status: "online" });
  assert.equal(manager.get("u1").status, "online");
});

test("ReactionManager._add keys by emoji id when present, name otherwise", () => {
  const manager = new ReactionManager(countingClient({}), "c1", "m1");
  manager._add({ count: 1, me: false, emoji: { id: "123", name: "pepe" } });
  manager._add({ count: 3, me: true, emoji: { id: null, name: "👍" } });

  assert.equal(manager.get(reactionKey({ id: "123", name: "pepe" })).count, 1);
  assert.equal(manager.get("👍").me, true);
});
