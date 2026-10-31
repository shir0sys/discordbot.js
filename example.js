const {
  Client,
  IntentBits,
  ButtonStyle,
  TextInputStyle,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ModalBuilder,
  TextInputBuilder,
  SlashCommandBuilder,
} = require("./dist");

const client = new Client({
  intents: [
    IntentBits.Guilds,
    IntentBits.GuildMessages,
    IntentBits.GuildMessageReactions,
    IntentBits.MessageContent,
  ],
});

const pingCommand = new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!");

const sayCommand = new SlashCommandBuilder()
  .setName("say")
  .setDescription("Echoes back a message")
  .addStringOption("text", "What to echo", { required: true });

const panelCommand = new SlashCommandBuilder()
  .setName("panel")
  .setDescription("Shows an embed with buttons and a select menu");

const v2Command = new SlashCommandBuilder()
  .setName("v2")
  .setDescription("Shows a Components V2 layout (container/text/separator)");

const feedbackCommand = new SlashCommandBuilder().setName("feedback").setDescription("Opens a feedback modal");

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await client.application.set([pingCommand, sayCommand, panelCommand, v2Command, feedbackCommand]);
});

client.on("guildCreate", (guild) => {
  console.log(`Available in guild ${guild.name} (${guild.id}), ${guild.channels.size} channels cached`);
});

// Plain-text command handling + Message action methods.
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    const reply = await message.reply("Pong!");
    await reply.react("✅");
  }

  if (message.content === "!embed") {
    const embed = new EmbedBuilder()
      .setTitle("Example embed")
      .setDescription("Built with EmbedBuilder")
      .setColor(0x5865f2)
      .addFields({ name: "Field 1", value: "Value 1", inline: true }, { name: "Field 2", value: "Value 2", inline: true })
      .setFooter("discordbot.js")
      .setTimestamp();

    const channel = await client.channels.fetch(message.channelId);
    await channel.send({ embeds: [embed] });
  }

  if (message.content === "!guildinfo" && message.guildId) {
    const guild = await client.guilds.fetch(message.guildId);
    await message.reply(`This guild is **${guild.name}**, owned by <@${guild.ownerId}>.`);
  }
});

// Slash command handling: options, embeds, components, Components V2, and modals.
client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    switch (interaction.commandName) {
      case "ping":
        await interaction.reply("Pong!");
        break;

      case "say": {
        await interaction.deferReply();
        await interaction.editReply(`You said: ${interaction.getOption("text")}`);
        break;
      }

      case "panel": {
        const embed = new EmbedBuilder().setTitle("Choose an action").setColor(0x57f287);

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("panel_confirm").setLabel("Confirm").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("panel_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger),
        );

        const select = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("panel_select")
            .setPlaceholder("Pick an option")
            .addOptions(
              { label: "Option A", value: "a" },
              { label: "Option B", value: "b" },
              { label: "Option C", value: "c" },
            ),
        );

        await interaction.reply({ embeds: [embed], components: [buttons, select] });
        break;
      }

      case "v2": {
        const container = new ContainerBuilder()
          .setAccentColor(0xeb459e)
          .addComponents(
            new TextDisplayBuilder().setContent("# Components V2\nThis layout bypasses embeds entirely."),
            new SeparatorBuilder(),
            new TextDisplayBuilder().setContent("Built from `ContainerBuilder` + `TextDisplayBuilder`."),
          );

        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        break;
      }

      case "feedback": {
        const modal = new ModalBuilder()
          .setCustomId("feedback_modal")
          .setTitle("Send feedback")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("feedback_text")
                .setLabel("Your feedback")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true),
            ),
          );

        await interaction.showModal(modal);
        break;
      }
    }
    return;
  }

  if (interaction.isMessageComponent()) {
    if (interaction.customId === "panel_confirm") {
      await interaction.update({ content: "Confirmed!", embeds: [], components: [] });
    } else if (interaction.customId === "panel_cancel") {
      await interaction.update({ content: "Cancelled.", embeds: [], components: [] });
    } else if (interaction.customId === "panel_select") {
      await interaction.reply(`You picked: ${interaction.values.join(", ")}`);
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === "feedback_modal") {
      const text = interaction.getTextInputValue("feedback_text");
      await interaction.reply(`Thanks for your feedback: ${text}`);
    }
  }
});

client.on("debug", (message) => console.debug("[gateway]", message));

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN is not set. Run with: node --env-file=.env example.js");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
