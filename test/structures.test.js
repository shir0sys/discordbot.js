const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Presence } = require("../dist/structures/Presence");
const { Invite } = require("../dist/structures/Invite");
const { GuildBan } = require("../dist/structures/GuildBan");
const { AuditLogEntry } = require("../dist/structures/AuditLogEntry");
const { createChannel } = require("../dist/structures/ChannelFactory");
const { ChannelType, AuditLogEvent } = require("../dist/util/Constants");

const fakeClient = { guilds: { cache: new Map() } };

test("Presence parses activities into Activity instances", () => {
  const presence = new Presence({
    user: { id: "1" },
    status: "online",
    activities: [{ name: "Chess", type: 0, created_at: 123 }],
    client_status: { desktop: "online" },
  });
  assert.equal(presence.status, "online");
  assert.equal(presence.activities.length, 1);
  assert.equal(presence.activities[0].name, "Chess");
});

test("Invite.url builds a discord.gg link from the code", () => {
  const invite = new Invite(fakeClient, { code: "abc123", channel_id: "1", guild_id: "2" });
  assert.equal(invite.url, "https://discord.gg/abc123");
});

test("GuildBan wraps the banned user and reason", () => {
  const ban = new GuildBan(fakeClient, "g1", {
    user: { id: "u1", username: "x", discriminator: "0", global_name: null, avatar: null },
    reason: "spam",
  });
  assert.equal(ban.guildId, "g1");
  assert.equal(ban.user.id, "u1");
  assert.equal(ban.reason, "spam");
});

test("AuditLogEntry.getChange retrieves a typed old/new pair by key", () => {
  const entry = new AuditLogEntry({
    id: "1",
    user_id: "u",
    target_id: "t",
    action_type: AuditLogEvent.MemberBanAdd,
    changes: [{ key: "nick", old_value: "a", new_value: "b" }],
  });
  assert.equal(entry.actionType, AuditLogEvent.MemberBanAdd);
  assert.deepEqual(entry.getChange("nick"), { old: "a", new: "b" });
  assert.equal(entry.getChange("missing"), undefined);
});

test("createChannel dispatches category/forum/stage types to their dedicated classes", () => {
  const category = createChannel(fakeClient, { id: "c1", type: ChannelType.GuildCategory, guild_id: "g1" });
  const forum = createChannel(fakeClient, { id: "f1", type: ChannelType.GuildForum, guild_id: "g1", available_tags: [] });
  const stage = createChannel(fakeClient, { id: "s1", type: ChannelType.GuildStageVoice, guild_id: "g1" });

  assert.equal(category.constructor.name, "CategoryChannel");
  assert.equal(forum.constructor.name, "ForumChannel");
  assert.equal(stage.constructor.name, "StageChannel");
  assert.ok(stage.isVoice());
  assert.ok(stage.isStage());
  assert.ok(forum.isForum());
  assert.ok(category.isCategory());
});

test("CategoryChannel.children filters the guild's cached channels by parentId", () => {
  const client = { guilds: { cache: new Map() } };
  const { Collection } = require("../dist/managers/Collection");

  const channels = new Collection();
  const category = createChannel(client, { id: "cat1", type: ChannelType.GuildCategory, guild_id: "g1" });
  const child = createChannel(client, { id: "ch1", type: ChannelType.GuildText, guild_id: "g1", parent_id: "cat1" });
  const other = createChannel(client, { id: "ch2", type: ChannelType.GuildText, guild_id: "g1", parent_id: null });
  channels.set(category.id, category);
  channels.set(child.id, child);
  channels.set(other.id, other);

  client.guilds.cache.set("g1", { channels });

  const children = category.children();
  assert.equal(children.length, 1);
  assert.equal(children[0].id, "ch1");
});
