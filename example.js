// Kitchen-sink demo bot: showcases most of discordbot.js's feature surface
// through a single set of slash/context-menu commands. Not meant as a
// production bot — it's a tour of the library.
const {
  Client,
  IntentBits,
  ButtonStyle,
  TextInputStyle,
  MessageFlags,
  ApplicationCommandType,
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
  ContextMenuCommandBuilder,
  PollBuilder,
  Formatters,
  DiscordAPIError,
  Message,
} = require("./dist");

const client = new Client({
  intents: [
    IntentBits.Guilds,
    IntentBits.GuildMembers,
    IntentBits.GuildMessages,
    IntentBits.GuildMessageReactions,
    IntentBits.MessageContent,
  ],
});

// ---------------------------------------------------------------------------
// Slash / context menu command definitions
// ---------------------------------------------------------------------------

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Echoes back a message")
    .addStringOption("text", "What to echo", { required: true }),

  new SlashCommandBuilder().setName("panel").setDescription("Shows an embed with buttons and a select menu"),

  new SlashCommandBuilder().setName("v2").setDescription("Shows a Components V2 layout (container/text/separator)"),

  new SlashCommandBuilder().setName("feedback").setDescription("Opens a feedback modal"),

  new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Posts a native Discord poll")
    .addStringOption("question", "The poll question", { required: true })
    .addStringOption("option1", "First answer", { required: true })
    .addStringOption("option2", "Second answer", { required: true }),

  new SlashCommandBuilder().setName("click-me").setDescription("Sends a button and waits for someone to click it"),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kicks a member")
    .addUserOption("target", "Who to kick", { required: true })
    .addStringOption("reason", "Why"),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bans a member")
    .addUserOption("target", "Who to ban", { required: true })
    .addStringOption("reason", "Why"),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Lifts a ban")
    .addStringOption("user_id", "The banned user's id (they're not a member anymore, so no @mention picker)", {
      required: true,
    }),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Times out a member")
    .addUserOption("target", "Who", { required: true })
    // Discord caps timeouts at 28 days (40320 minutes) — enforced here so
    // Discord's own UI rejects an out-of-range value before it ever reaches us,
    // instead of a 400 on communication_disabled_until after the fact.
    .addIntegerOption("minutes", "Duration in minutes (max 40320 = 28 days)", {
      required: true,
      minValue: 1,
      maxValue: 40320,
    }),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Removes an active timeout early")
    .addUserOption("target", "Who", { required: true }),

  new SlashCommandBuilder()
    .setName("permcheck")
    .setDescription("Shows a member's effective permissions in this channel")
    .addUserOption("target", "Who to check", { required: true }),

  new SlashCommandBuilder()
    .setName("thread")
    .setDescription("Creates a thread off the current channel")
    .addStringOption("name", "Thread name", { required: true }),

  new SlashCommandBuilder().setName("emojis").setDescription("Lists this server's custom emojis"),

  new SlashCommandBuilder()
    .setName("webhook-test")
    .setDescription("Creates a webhook, sends through it, then deletes it"),

  new SlashCommandBuilder().setName("auditlog").setDescription("Shows the 5 most recent audit log entries"),

  new ContextMenuCommandBuilder().setName("User info").setType(ApplicationCommandType.User),
  new ContextMenuCommandBuilder().setName("Message info").setType(ApplicationCommandType.Message),
];

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await client.application.set(commands);
  console.log(`Registered ${commands.length} commands globally (can take up to ~1h to show up everywhere).`);
});

client.on("guildCreate", (guild) => {
  console.log(`Available in guild ${guild.name} (${guild.id}), ${guild.channels.size} channels cached`);
});

// Surfaces unrecoverable gateway problems instead of letting Node crash with
// an unhandled "error" event — see the Error Handling guide.
client.on("error", (error) => {
  console.error(`[gateway error, close code ${error.closeCode}]`, error.message);
});

client.on("debug", (message) => console.debug("[gateway]", message));

// ---------------------------------------------------------------------------
// Plain-text commands — Message action methods, embeds, guild fetch
// ---------------------------------------------------------------------------

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
      .addFields(
        { name: "Field 1", value: "Value 1", inline: true },
        { name: "Field 2", value: "Value 2", inline: true },
      )
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

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isCommand()) await handleCommand(interaction);
    else if (interaction.isMessageComponent()) await handleComponent(interaction);
    else if (interaction.isModalSubmit()) await handleModal(interaction);
  } catch (error) {
    // Error Handling guide: distinguish Discord's own rejection from everything else.
    if (error instanceof DiscordAPIError) {
      console.error(`Discord rejected the request (${error.status}):`, error.payload);
      if (!interaction.isAutocomplete()) {
        await interaction.reply({ content: "Something went wrong talking to Discord.", flags: 64 }).catch(() => {});
      }
    } else {
      throw error;
    }
  }
});

async function handleCommand(interaction) {
  switch (interaction.commandName) {
    case "ping":
      await interaction.reply("Pong!");
      return;

    case "say":
      await interaction.deferReply();
      await interaction.editReply(`You said: ${interaction.getOption("text")}`);
      return;

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
      return;
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
      return;
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
      return;
    }

    case "poll": {
      const poll = new PollBuilder()
        .setQuestion(interaction.getOption("question"))
        .addAnswer({ text: interaction.getOption("option1") })
        .addAnswer({ text: interaction.getOption("option2") })
        .setDuration(24);
      await interaction.reply({ poll });
      return;
    }

    case "click-me": {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("await_click").setLabel("Click within 30s").setStyle(ButtonStyle.Primary),
      );
      await interaction.reply({ content: "Waiting for a click...", components: [row] });

      // Collectors need a Message instance; fetch the reply we just sent via the interaction webhook.
      const original = await client.rest.get(
        `/webhooks/${interaction.applicationId}/${interaction.token}/messages/@original`,
      );
      const message = new Message(client, original);

      try {
        const click = await message.awaitMessageComponent({ time: 30000 });
        await click.update({ content: `Clicked by ${click.user.tag}!`, components: [] });
      } catch {
        await message.edit({ content: "Nobody clicked in time.", components: [] });
      }
      return;
    }

    case "kick": {
      if (!interaction.guildId) return;
      const guild = await client.guilds.fetch(interaction.guildId);
      await guild.members.kick(interaction.getOption("target"), interaction.getOption("reason") ?? undefined);
      await interaction.reply(`Kicked <@${interaction.getOption("target")}>.`);
      return;
    }

    case "ban": {
      if (!interaction.guildId) return;
      const guild = await client.guilds.fetch(interaction.guildId);
      await guild.bans.create(interaction.getOption("target"), {
        reason: interaction.getOption("reason") ?? undefined,
      });
      await interaction.reply(`Banned <@${interaction.getOption("target")}>.`);
      return;
    }

    case "unban": {
      if (!interaction.guildId) return;
      const guild = await client.guilds.fetch(interaction.guildId);
      await guild.bans.remove(interaction.getOption("user_id"), "Requested via /unban");
      await interaction.reply(`Unbanned <@${interaction.getOption("user_id")}>.`);
      return;
    }

    case "timeout": {
      if (!interaction.guildId) return;
      const guild = await client.guilds.fetch(interaction.guildId);
      const minutes = interaction.getOption("minutes");
      await guild.members.timeout(interaction.getOption("target"), minutes * 60 * 1000, "Requested via /timeout");
      await interaction.reply(`Timed out <@${interaction.getOption("target")}> for ${minutes} minute(s).`);
      return;
    }

    case "untimeout": {
      if (!interaction.guildId) return;
      const guild = await client.guilds.fetch(interaction.guildId);
      await guild.members.timeout(interaction.getOption("target"), null, "Requested via /untimeout");
      await interaction.reply(`Removed the timeout on <@${interaction.getOption("target")}>.`);
      return;
    }

    case "permcheck": {
      if (!interaction.guildId) return;
      const guild = await client.guilds.fetch(interaction.guildId);
      const member = await guild.members.fetch(interaction.getOption("target"));
      const channel = await client.channels.fetch(interaction.channelId);
      const perms = member.permissionsIn(channel);
      const granted = perms.toArray();
      await interaction.reply(
        granted.length ? `Permissions here: \`${granted.join("`, `")}\`` : "No permissions granted here.",
      );
      return;
    }

    case "thread": {
      const channel = await client.channels.fetch(interaction.channelId);
      const thread = await channel.threads.create({ name: interaction.getOption("name") });
      await interaction.reply(`Created ${Formatters.channelMention(thread.id)}`);
      return;
    }

    case "emojis": {
      if (!interaction.guildId) return;
      const guild = await client.guilds.fetch(interaction.guildId);
      const emojis = await guild.emojis.fetchAll();
      await interaction.reply(emojis.length ? emojis.map((e) => e.toString()).join(" ") : "No custom emojis here.");
      return;
    }

    case "webhook-test": {
      const channel = await client.channels.fetch(interaction.channelId);
      const webhook = await channel.createWebhook({ name: "discordbot.js demo" });
      await webhook.send("Hello from a webhook!");
      await webhook.delete("demo cleanup");
      await interaction.reply("Sent a message through a temporary webhook, then deleted it.");
      return;
    }

    case "auditlog": {
      if (!interaction.guildId) return;
      const guild = await client.guilds.fetch(interaction.guildId);
      const entries = await guild.fetchAuditLogs({ limit: 5 });
      await interaction.reply(
        entries.length
          ? entries.map((e) => `• action ${e.actionType} on ${e.targetId ?? "?"}`).join("\n")
          : "No recent audit log entries (or missing View Audit Log permission).",
      );
      return;
    }

    case "User info": {
      await interaction.reply(`Target user: ${Formatters.userMention(interaction.targetId)}`);
      return;
    }

    case "Message info": {
      await interaction.reply(`That message's id is \`${interaction.targetId}\`.`);
      return;
    }
  }
}

async function handleComponent(interaction) {
  if (interaction.customId === "panel_confirm") {
    await interaction.update({ content: "Confirmed!", embeds: [], components: [] });
  } else if (interaction.customId === "panel_cancel") {
    await interaction.update({ content: "Cancelled.", embeds: [], components: [] });
  } else if (interaction.customId === "panel_select") {
    await interaction.reply(`You picked: ${interaction.values.join(", ")}`);
  }
}

async function handleModal(interaction) {
  if (interaction.customId === "feedback_modal") {
    const text = interaction.getTextInputValue("feedback_text");
    await interaction.reply(`Thanks for your feedback: ${text}`);
  }
}

// ---------------------------------------------------------------------------

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN is not set. Run with: node --env-file=.env example.js");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
