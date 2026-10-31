// Support ticket system: a persistent panel (embed + "Open Ticket" button)
// that creates a private channel per ticket, with Claim/Close handled by
// buttons AND equivalent context menu commands.
//
// Fully stateless by design: everything a restart would need to "remember"
// (who opened a ticket, who claimed it, whether it's open) is stored in the
// ticket channel's own topic, not in process memory or a database. A button
// click is just a customId string — as long as this file registers the same
// interactionCreate handler on every startup (which it does, since that's
// just running the code again), old buttons on old messages keep working
// forever, even across restarts/redeploys.
//
// Required env vars: DISCORD_TOKEN
// Optional env vars:
//   TICKET_STAFF_ROLE_ID  — role allowed to claim/close tickets (falls back
//                           to anyone with Manage Channels if unset)
//   TICKET_CATEGORY_ID    — category new ticket channels are created under
const {
  Client,
  IntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  PermissionFlags,
  DiscordAPIError,
} = require("../dist");

const STAFF_ROLE_ID = process.env.TICKET_STAFF_ROLE_ID ?? null;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID ?? null;

const client = new Client({
  intents: [IntentBits.Guilds, IntentBits.GuildMembers, IntentBits.GuildMessages],
});

// ---------------------------------------------------------------------------
// Ticket state, encoded entirely in the channel topic: "ticket|opener=<id>|claimed=<id|none>|status=open|closed"
// ---------------------------------------------------------------------------

function parseTicketTopic(topic) {
  if (!topic || !topic.startsWith("ticket|")) return null;
  const fields = Object.fromEntries(
    topic
      .split("|")
      .slice(1)
      .map((part) => part.split("=")),
  );
  return { opener: fields.opener, claimed: fields.claimed === "none" ? null : fields.claimed, status: fields.status };
}

function buildTicketTopic(state) {
  return `ticket|opener=${state.opener}|claimed=${state.claimed ?? "none"}|status=${state.status}`;
}

function ticketPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_open")
        .setLabel("Open a Ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji({ name: "🎫" }),
    ),
  ];
}

function ticketChannelComponents(state) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_claim")
        .setLabel(state.claimed ? `Claimed by someone` : "Claim")
        .setStyle(state.claimed ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(Boolean(state.claimed)),
      new ButtonBuilder().setCustomId("ticket_close").setLabel("Close").setStyle(ButtonStyle.Danger),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Permission check shared by buttons and context menus
// ---------------------------------------------------------------------------

async function isStaff(guild, member, channel) {
  if (STAFF_ROLE_ID) return member.roleIds.includes(STAFF_ROLE_ID);
  return member.permissionsIn(channel).has(PermissionFlags.ManageChannels);
}

// ---------------------------------------------------------------------------
// Core actions — called from both button clicks and context menu commands
// ---------------------------------------------------------------------------

async function openTicket(interaction) {
  const guild = await client.guilds.fetch(interaction.guildId);

  const existing = guild.channels.find((channel) => {
    const state = parseTicketTopic(channel.topic);
    return state?.opener === interaction.user.id && state.status === "open";
  });
  if (existing) {
    await interaction.reply({ content: `You already have an open ticket: <#${existing.id}>`, flags: 64 });
    return;
  }

  const everyoneDeny = PermissionFlags.ViewChannel.toString();
  const memberAllow = (
    PermissionFlags.ViewChannel |
    PermissionFlags.SendMessages |
    PermissionFlags.ReadMessageHistory |
    PermissionFlags.AttachFiles |
    PermissionFlags.EmbedLinks
  ).toString();

  const overwrites = [
    { id: guild.id, type: 0, allow: "0", deny: everyoneDeny },
    { id: interaction.user.id, type: 1, allow: memberAllow, deny: "0" },
  ];
  if (STAFF_ROLE_ID) overwrites.push({ id: STAFF_ROLE_ID, type: 0, allow: memberAllow, deny: "0" });

  const state = { opener: interaction.user.id, claimed: null, status: "open" };
  const channel = await guild.channels.create({
    name: `ticket-${interaction.user.username}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .slice(0, 90),
    type: 0,
    parent_id: TICKET_CATEGORY_ID ?? undefined,
    topic: buildTicketTopic(state),
    permission_overwrites: overwrites,
  });

  const embed = new EmbedBuilder()
    .setTitle("Support Ticket")
    .setDescription(`Hey <@${interaction.user.id}>, staff will be with you shortly. Describe your issue below.`)
    .setColor(0x5865f2);

  await channel.send({ embeds: [embed], components: ticketChannelComponents(state) });
  await interaction.reply({ content: `Ticket created: <#${channel.id}>`, flags: 64 });
}

async function claimTicket(interaction, channel) {
  const guild = await client.guilds.fetch(interaction.guildId);
  const member = await guild.members.fetch(interaction.user.id);

  const state = parseTicketTopic(channel.topic);
  if (!state || state.status !== "open") {
    await interaction.reply({ content: "This isn't an open ticket.", flags: 64 });
    return;
  }
  if (!(await isStaff(guild, member, channel))) {
    await interaction.reply({ content: "Only staff can claim tickets.", flags: 64 });
    return;
  }
  if (state.claimed) {
    await interaction.reply({ content: `Already claimed by <@${state.claimed}>.`, flags: 64 });
    return;
  }

  state.claimed = interaction.user.id;
  await channel.setTopic(buildTicketTopic(state), "Ticket claimed");
  await channel.send(`🔧 Claimed by <@${interaction.user.id}>.`);

  if (interaction.isMessageComponent()) {
    await interaction.update({ components: ticketChannelComponents(state) });
  } else {
    await interaction.reply({ content: "Claimed.", flags: 64 });
  }
}

async function requestCloseTicket(interaction, channel) {
  const guild = await client.guilds.fetch(interaction.guildId);
  const member = await guild.members.fetch(interaction.user.id);

  const state = parseTicketTopic(channel.topic);
  if (!state || state.status !== "open") {
    await interaction.reply({ content: "This isn't an open ticket.", flags: 64 });
    return;
  }
  const staff = await isStaff(guild, member, channel);
  if (!staff && member.user.id !== state.opener) {
    await interaction.reply({ content: "Only staff or the ticket opener can close this.", flags: 64 });
    return;
  }

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket_close_confirm").setLabel("Confirm Close").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("ticket_close_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
  );
  await interaction.reply({ content: "Close this ticket?", components: [confirmRow], flags: 64 });
}

async function closeTicket(channel, closedBy) {
  const state = parseTicketTopic(channel.topic);
  if (state) {
    state.status = "closed";
    await channel.setTopic(buildTicketTopic(state), "Ticket closed").catch(() => {});
  }
  await channel.send(`🔒 Ticket closed by <@${closedBy}>. Deleting in 5 seconds...`).catch(() => {});
  setTimeout(() => channel.delete("Ticket closed").catch(() => {}), 5000);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const commands = [
  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Posts the ticket-opening panel in this channel (staff only)"),
  new ContextMenuCommandBuilder().setName("Claim Ticket").setType(ApplicationCommandType.Message),
  new ContextMenuCommandBuilder().setName("Close Ticket").setType(ApplicationCommandType.Message),
];

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await client.application.set(commands);
});

client.on("interactionCreate", async (interaction) => {
  try {
    // Context menu interactions are ApplicationCommand interactions too (same
    // isCommand() type guard), differing only in commandType — so every
    // command, chat-input or context-menu, is handled by commandName here.
    if (interaction.isCommand()) {
      if (interaction.commandName === "ticket-panel") {
        const guild = await client.guilds.fetch(interaction.guildId);
        const member = await guild.members.fetch(interaction.user.id);
        const channel = await client.channels.fetch(interaction.channelId);
        if (!(await isStaff(guild, member, channel))) {
          await interaction.reply({ content: "Staff only.", flags: 64 });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("Need help?")
          .setDescription("Click the button below to open a private ticket with staff.")
          .setColor(0x5865f2);
        await channel.send({ embeds: [embed], components: ticketPanelComponents() });
        await interaction.reply({ content: "Panel posted.", flags: 64 });
        return;
      }

      if (interaction.commandName === "Claim Ticket" || interaction.commandName === "Close Ticket") {
        const channel = await client.channels.fetch(interaction.channelId);
        if (interaction.commandName === "Claim Ticket") await claimTicket(interaction, channel);
        else await requestCloseTicket(interaction, channel);
        return;
      }
    }

    if (interaction.isMessageComponent()) {
      const channel = await client.channels.fetch(interaction.channelId);

      if (interaction.customId === "ticket_open") {
        await openTicket(interaction);
      } else if (interaction.customId === "ticket_claim") {
        await claimTicket(interaction, channel);
      } else if (interaction.customId === "ticket_close") {
        await requestCloseTicket(interaction, channel);
      } else if (interaction.customId === "ticket_close_confirm") {
        await interaction.update({ content: "Closing...", components: [] });
        await closeTicket(channel, interaction.user.id);
      } else if (interaction.customId === "ticket_close_cancel") {
        await interaction.update({ content: "Cancelled.", components: [] });
      }
    }
  } catch (error) {
    if (error instanceof DiscordAPIError) {
      console.error(`Discord rejected the request (${error.status}):`, error.payload);
    } else {
      console.error(error);
    }
  }
});

client.on("error", (error) => console.error(`[gateway error, close code ${error.closeCode}]`, error.message));
client.on("debug", (message) => console.debug("[gateway]", message));

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN is not set. Run with: node --env-file=.env examples/ticket-bot.js");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
