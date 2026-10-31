const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EmbedBuilder } = require("../dist/builders/EmbedBuilder");
const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require("../dist/builders/Components");
const { ContainerBuilder, TextDisplayBuilder } = require("../dist/builders/ComponentsV2");
const { ModalBuilder, TextInputBuilder } = require("../dist/builders/Modal");
const { SlashCommandBuilder } = require("../dist/builders/SlashCommandBuilder");
const { ButtonStyle, ComponentType, TextInputStyle, ApplicationCommandOptionType } = require("../dist/util/Constants");

test("EmbedBuilder.toJSON produces the expected shape", () => {
  const json = new EmbedBuilder().setTitle("t").setColor(1).addFields({ name: "n", value: "v" }).toJSON();
  assert.equal(json.title, "t");
  assert.equal(json.color, 1);
  assert.deepEqual(json.fields, [{ name: "n", value: "v" }]);
});

test("ButtonBuilder link style drops custom_id and sets url", () => {
  const json = new ButtonBuilder().setLabel("Go").setURL("https://example.com").toJSON();
  assert.equal(json.style, ButtonStyle.Link);
  assert.equal(json.url, "https://example.com");
  assert.equal(json.custom_id, undefined);
});

test("ActionRowBuilder nests resolved component JSON", () => {
  const json = new ActionRowBuilder()
    .addComponents(new ButtonBuilder().setCustomId("a").setLabel("A").setStyle(ButtonStyle.Primary))
    .toJSON();
  assert.equal(json.type, ComponentType.ActionRow);
  assert.equal(json.components[0].custom_id, "a");
});

test("StringSelectMenuBuilder carries its options array", () => {
  const json = new StringSelectMenuBuilder().setCustomId("s").addOptions({ label: "A", value: "a" }).toJSON();
  assert.equal(json.type, ComponentType.StringSelect);
  assert.deepEqual(json.options, [{ label: "A", value: "a" }]);
});

test("Components V2 container nests text display children", () => {
  const json = new ContainerBuilder().addComponents(new TextDisplayBuilder().setContent("hi")).toJSON();
  assert.equal(json.type, ComponentType.Container);
  assert.equal(json.components[0].type, ComponentType.TextDisplay);
  assert.equal(json.components[0].content, "hi");
});

test("ModalBuilder serializes nested text input rows", () => {
  const json = new ModalBuilder()
    .setCustomId("m")
    .setTitle("Title")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("field").setLabel("L").setStyle(TextInputStyle.Short),
      ),
    )
    .toJSON();
  assert.equal(json.custom_id, "m");
  assert.equal(json.components[0].components[0].custom_id, "field");
});

test("SlashCommandBuilder.toJSON includes required string option", () => {
  const json = new SlashCommandBuilder()
    .setName("say")
    .setDescription("d")
    .addStringOption("text", "desc", { required: true })
    .toJSON();
  assert.equal(json.name, "say");
  assert.equal(json.options[0].type, ApplicationCommandOptionType.String);
  assert.equal(json.options[0].required, true);
});

test("SlashCommandBuilder.addSubcommand nests a SubCommand option", () => {
  const json = new SlashCommandBuilder()
    .setName("mod")
    .setDescription("d")
    .addSubcommand("ban", "ban someone", (sub) => sub.addUserOption("target", "who"))
    .toJSON();
  assert.equal(json.options[0].type, ApplicationCommandOptionType.SubCommand);
  assert.equal(json.options[0].options[0].name, "target");
});
