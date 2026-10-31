const { test } = require("node:test");
const assert = require("node:assert/strict");
const { CommandInteraction } = require("../dist/structures/CommandInteraction");
const { ApplicationCommandOptionType, InteractionType } = require("../dist/util/Constants");

const fakeClient = {};

function baseInteraction(commandData) {
  return {
    id: "1",
    application_id: "app",
    type: InteractionType.ApplicationCommand,
    token: "tok",
    user: { id: "u1", username: "u", discriminator: "0", global_name: null, avatar: null },
    data: commandData,
  };
}

test("getOption reads flat (non-subcommand) options", () => {
  const interaction = new CommandInteraction(
    fakeClient,
    baseInteraction({
      id: "c1",
      name: "say",
      type: 1,
      options: [{ name: "text", type: ApplicationCommandOptionType.String, value: "hi" }],
    }),
  );
  assert.equal(interaction.getOption("text"), "hi");
  assert.equal(interaction.subcommand, null);
});

test("getOption flattens a single level of subcommand nesting", () => {
  const interaction = new CommandInteraction(
    fakeClient,
    baseInteraction({
      id: "c1",
      name: "mod",
      type: 1,
      options: [
        {
          name: "ban",
          type: ApplicationCommandOptionType.SubCommand,
          options: [{ name: "target", type: ApplicationCommandOptionType.User, value: "123" }],
        },
      ],
    }),
  );
  assert.equal(interaction.subcommand, "ban");
  assert.equal(interaction.getOption("target"), "123");
});

test("getOption flattens subcommand group + subcommand nesting", () => {
  const interaction = new CommandInteraction(
    fakeClient,
    baseInteraction({
      id: "c1",
      name: "mod",
      type: 1,
      options: [
        {
          name: "settings",
          type: ApplicationCommandOptionType.SubCommandGroup,
          options: [
            {
              name: "set",
              type: ApplicationCommandOptionType.SubCommand,
              options: [{ name: "value", type: ApplicationCommandOptionType.String, value: "x" }],
            },
          ],
        },
      ],
    }),
  );
  assert.equal(interaction.subcommandGroup, "settings");
  assert.equal(interaction.subcommand, "set");
  assert.equal(interaction.getOption("value"), "x");
});
