// Voice playback demo: /play streams an audio file into the voice channel
// you're in, /stop ends playback and leaves.
//
// This needs raw PCM (16-bit signed LE, 48kHz, stereo) — ffmpeg converts
// basically anything into that on the fly. Install ffmpeg separately (it's
// a system binary, not an npm package, so this stays zero-npm-dependency
// outside of opusscript, which handles the actual Opus encoding):
//   https://ffmpeg.org/download.html
const { spawn } = require("node:child_process");
const { Client, IntentBits, SlashCommandBuilder, AudioResource, AudioPlayer, DiscordAPIError } = require("../dist");

const client = new Client({
  intents: [IntentBits.Guilds, IntentBits.GuildVoiceStates],
});

const players = new Map(); // guildId -> AudioPlayer

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays an audio file in your current voice channel")
    .addStringOption("url", "A direct URL or local file path ffmpeg can read", { required: true }),
  new SlashCommandBuilder().setName("stop").setDescription("Stops playback and leaves the voice channel"),
];

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await client.application.set(commands);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  try {
    if (interaction.commandName === "play") {
      if (!interaction.guildId) return;
      const guild = await client.guilds.fetch(interaction.guildId);
      const voiceState = guild.voiceStates.get(interaction.user.id);

      if (!voiceState?.channelId) {
        await interaction.reply({ content: "Join a voice channel first.", flags: 64 });
        return;
      }

      await interaction.deferReply();

      const connection = await client.joinVoiceChannel({
        guildId: guild.id,
        channelId: voiceState.channelId,
      });

      const player = new AudioPlayer();
      connection.subscribe(player);
      players.set(guild.id, player);

      // ffmpeg decodes/transcodes whatever the input is into raw PCM on stdout.
      const ffmpeg = spawn("ffmpeg", [
        "-i",
        interaction.getOption("url"),
        "-f",
        "s16le",
        "-ar",
        "48000",
        "-ac",
        "2",
        "pipe:1",
      ]);
      ffmpeg.stderr.on("data", () => {}); // ffmpeg logs progress to stderr; ignore it here

      const resource = AudioResource.fromPCMStream(ffmpeg.stdout);
      player.play(resource);
      player.once("idle", () => ffmpeg.kill());

      await interaction.editReply(`Playing in <#${voiceState.channelId}>.`);
      return;
    }

    if (interaction.commandName === "stop") {
      if (!interaction.guildId) return;
      players.get(interaction.guildId)?.stop();
      players.delete(interaction.guildId);
      client.leaveVoiceChannel(interaction.guildId);
      await interaction.reply("Stopped.");
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
  console.error("DISCORD_TOKEN is not set. Run with: node --env-file=.env examples/voice-bot.js");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
