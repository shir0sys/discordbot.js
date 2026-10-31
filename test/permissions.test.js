const { test } = require("node:test");
const assert = require("node:assert/strict");
const { PermissionsBitField, computeChannelPermissions } = require("../dist/util/Permissions");

test("PermissionsBitField.has respects Administrator bypass", () => {
  const perms = new PermissionsBitField(PermissionsBitField.Flags.Administrator);
  assert.equal(perms.has(PermissionsBitField.Flags.BanMembers), true);
  assert.equal(perms.has(PermissionsBitField.Flags.ManageChannels), true);
});

test("PermissionsBitField.has is false for unset, non-administrator bits", () => {
  const perms = new PermissionsBitField(PermissionsBitField.Flags.SendMessages);
  assert.equal(perms.has(PermissionsBitField.Flags.BanMembers), false);
  assert.equal(perms.has(PermissionsBitField.Flags.SendMessages), true);
});

test("PermissionsBitField.add/remove mutate the bitfield", () => {
  const perms = new PermissionsBitField();
  perms.add(PermissionsBitField.Flags.ViewChannel);
  assert.equal(perms.has(PermissionsBitField.Flags.ViewChannel), true);
  perms.remove(PermissionsBitField.Flags.ViewChannel);
  assert.equal(perms.has(PermissionsBitField.Flags.ViewChannel), false);
});

test("computeChannelPermissions applies everyone overwrite then role overwrite then member overwrite in priority order", () => {
  const base = new PermissionsBitField(PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.SendMessages);
  const overwrites = [
    { id: "everyone-id", type: 0, allow: "0", deny: String(PermissionsBitField.Flags.SendMessages) },
    { id: "role-id", type: 0, allow: String(PermissionsBitField.Flags.SendMessages), deny: "0" },
    { id: "member-id", type: 1, allow: "0", deny: String(PermissionsBitField.Flags.ViewChannel) },
  ];

  const result = computeChannelPermissions(base, overwrites, "everyone-id", "member-id", ["role-id"]);
  // Member-level deny on ViewChannel wins over the role-level allow on SendMessages restoring it.
  assert.equal(result.has(PermissionsBitField.Flags.ViewChannel), false);
  assert.equal(result.has(PermissionsBitField.Flags.SendMessages), true);
});

test("computeChannelPermissions short-circuits to All when base has Administrator", () => {
  const base = new PermissionsBitField(PermissionsBitField.Flags.Administrator);
  const result = computeChannelPermissions(base, [{ id: "x", type: 1, allow: "0", deny: String(PermissionsBitField.All) }], "everyone", "x", []);
  assert.equal(result.bitfield, PermissionsBitField.All);
});
