const { Client, IntentBits } = require("./dist");

const client = new Client({
  intents: [
    IntentBits.Guilds,
    IntentBits.GuildMessages,
    IntentBits.GuildMessageReactions,
    IntentBits.MessageContent,
  ],
});

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.application.set([
    { name: "ping", description: "Replies with Pong!" },
    {
      name: "say",
      description: "Echoes back a message",
      options: [{ type: 3 /* STRING */, name: "text", description: "What to echo", required: true }],
    },
  ]);
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

  if (message.content === "!editme") {
    const channel = await client.channels.fetch(message.channelId);
    const sent = await channel.send("original text");
    await sent.edit("edited text");
  }

  if (message.content === "!guildinfo" && message.guildId) {
    const guild = await client.guilds.fetch(message.guildId);
    await message.reply(`This guild is **${guild.name}**, owned by <@${guild.ownerId}>.`);
  }
});

// Slash command handling, including options and deferred/edited replies.
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
    return;
  }

  if (interaction.commandName === "say") {
    await interaction.deferReply();
    const text = interaction.getOption("text");
    await interaction.editReply(`You said: ${text}`);
  }
});

client.on("debug", (message) => console.debug("[gateway]", message));

client.login(process.env.DISCORD_TOKEN);
