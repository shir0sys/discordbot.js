const { test } = require("node:test");
const assert = require("node:assert/strict");
const { MessageFlagsBitField } = require("../dist/util/MessageFlags");
const { ChannelFlagsBitField } = require("../dist/util/ChannelFlags");
const { RoleFlagsBitField } = require("../dist/util/RoleFlags");
const { GuildMemberFlagsBitField } = require("../dist/util/GuildMemberFlags");
const { ApplicationFlagsBitField } = require("../dist/util/ApplicationFlags");
const { AttachmentFlagsBitField } = require("../dist/util/AttachmentFlags");
const { UserFlagsBitField } = require("../dist/util/UserFlags");
const { parseEmoji, resolvePartialEmoji } = require("../dist/util/Emoji");
const { User } = require("../dist/structures/User");
const { Message } = require("../dist/structures/Message");

test("MessageFlagsBitField.has reads Ephemeral/IsComponentsV2 bits", () => {
  const flags = new MessageFlagsBitField(
    MessageFlagsBitField.Flags.Ephemeral | MessageFlagsBitField.Flags.IsComponentsV2,
  );
  assert.equal(flags.has(["Ephemeral"]), true);
  assert.equal(flags.has(["IsComponentsV2"]), true);
  assert.equal(flags.has(["Loading"]), false);
});

test("ChannelFlagsBitField/RoleFlagsBitField/GuildMemberFlagsBitField/ApplicationFlagsBitField/AttachmentFlagsBitField round-trip a single bit", () => {
  assert.equal(new ChannelFlagsBitField(ChannelFlagsBitField.Flags.Pinned).has(["Pinned"]), true);
  assert.equal(new RoleFlagsBitField(RoleFlagsBitField.Flags.InPrompt).has(["InPrompt"]), true);
  assert.equal(
    new GuildMemberFlagsBitField(GuildMemberFlagsBitField.Flags.CompletedOnboarding).has(["CompletedOnboarding"]),
    true,
  );
  assert.equal(new ApplicationFlagsBitField(ApplicationFlagsBitField.Flags.Embedded).has(["Embedded"]), true);
  assert.equal(new AttachmentFlagsBitField(AttachmentFlagsBitField.Flags.IsRemix).has(["IsRemix"]), true);
});

test("User.flags parses public_flags into a UserFlagsBitField", () => {
  const user = new User(
    {},
    {
      id: "u1",
      username: "x",
      discriminator: "0",
      global_name: null,
      avatar: null,
      public_flags: UserFlagsBitField.Flags.VerifiedBot,
    },
  );
  assert.ok(user.flags instanceof UserFlagsBitField);
  assert.equal(user.flags.has(["VerifiedBot"]), true);
});

test("Message.flags parses flags into a MessageFlagsBitField", () => {
  const message = new Message(
    { rest: {} },
    {
      id: "m1",
      channel_id: "c1",
      content: "hi",
      author: { id: "u1", username: "x", discriminator: "0", global_name: null, avatar: null },
      timestamp: new Date().toISOString(),
      edited_timestamp: null,
      attachments: [],
      flags: MessageFlagsBitField.Flags.Ephemeral,
    },
  );
  assert.equal(message.flags.has(["Ephemeral"]), true);
});

test("parseEmoji extracts name/id/animated from a custom emoji mention", () => {
  assert.deepEqual(parseEmoji("<:pepe:123456789012345678>"), {
    animated: false,
    name: "pepe",
    id: "123456789012345678",
  });
  assert.deepEqual(parseEmoji("<a:dance:987654321098765432>"), {
    animated: true,
    name: "dance",
    id: "987654321098765432",
  });
});

test("parseEmoji treats a bare word as a unicode emoji name, and rejects malformed mentions", () => {
  assert.deepEqual(parseEmoji("👍"), { animated: false, name: "👍", id: null });
  assert.equal(parseEmoji("<:missing_id>"), null);
});

test("resolvePartialEmoji accepts a raw snowflake, a mention, or an already-partial object", () => {
  assert.deepEqual(resolvePartialEmoji("123456789012345678"), { id: "123456789012345678", name: null });
  assert.deepEqual(resolvePartialEmoji("<:pepe:123456789012345678>"), {
    animated: false,
    name: "pepe",
    id: "123456789012345678",
  });
  assert.deepEqual(resolvePartialEmoji({ id: null, name: "👍" }), { id: null, name: "👍", animated: undefined });
  assert.equal(resolvePartialEmoji({ id: null, name: null }), null);
});
