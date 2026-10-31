const { test } = require("node:test");
const assert = require("node:assert/strict");
const { GuildManager } = require("../dist/managers/GuildManager");
const { UserManager } = require("../dist/managers/UserManager");
const { GuildMemberManager } = require("../dist/managers/GuildMemberManager");

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
