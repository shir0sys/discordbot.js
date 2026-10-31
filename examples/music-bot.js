// Music bot demo: /joinmyvoc joins your current voice channel, /playmusic
// streams a YouTube video's audio into it, /pausemusic toggles pause/resume,
// /stopmusic stops playback and leaves.
//
// yt-dlp extracts just the audio stream straight from YouTube — that's the
// raw media, not the ad breaks YouTube's own player injects client-side, so
// there's nothing to skip. ffmpeg then transcodes that stream into raw PCM
// for the AudioPlayer. Both are system binaries, not npm packages:
//   https://github.com/yt-dlp/yt-dlp#installation
//   https://ffmpeg.org/download.html
const { spawn } = require("node:child_process");
const {
  Client,
  IntentBits,
  SlashCommandBuilder,
  AudioResource,
  AudioPlayer,
  AudioPlayerStatus,
  DiscordAPIError,
} = require("../dist");

const client = new Client({
  intents: [IntentBits.Guilds, IntentBits.GuildVoiceStates],
});

// guildId -> { player, ytdlp, ffmpeg }
const sessions = new Map();

function stopSession(guildId) {
  const session = sessions.get(guildId);
  if (!session) return;
  session.player.stop();
  session.ytdlp.kill();
  session.ffmpeg.kill();
  sessions.delete(guildId);
}

const commands = [
  new SlashCommandBuilder().setName("joinmyvoc").setDescription("Joins your current voice channel"),
  new SlashCommandBuilder()
    .setName("playmusic")
    .setDescription("Plays a YouTube video's audio in the voice channel")
    .addStringOption("url-youtube", "A YouTube video URL", { required: true }),
  new SlashCommandBuilder().setName("pausemusic").setDescription("Pauses or resumes the current track"),
  new SlashCommandBuilder().setName("stopmusic").setDescription("Stops playback and leaves the voice channel"),
];

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await client.application.set(commands);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  if (!interaction.guildId) return;

  try {
    if (interaction.commandName === "joinmyvoc") {
      const guild = await client.guilds.fetch(interaction.guildId);
      const voiceState = guild.voiceStates.get(interaction.user.id);

      if (!voiceState?.channelId) {
        await interaction.reply({ content: "Join a voice channel first.", flags: 64 });
        return;
      }

      await interaction.deferReply();
      await client.joinVoiceChannel({ guildId: guild.id, channelId: voiceState.channelId });
      await interaction.editReply(`Joined <#${voiceState.channelId}>.`);
      return;
    }

    if (interaction.commandName === "playmusic") {
      const connection = client.voiceConnections.get(interaction.guildId);
      if (!connection) {
        await interaction.reply({ content: "Use /joinmyvoc first.", flags: 64 });
        return;
      }

      await interaction.deferReply();

      stopSession(interaction.guildId);

      const url = interaction.getOption("url-youtube");

      // yt-dlp picks the best audio-only stream and writes it to stdout;
      // ffmpeg reads that on stdin and transcodes it to raw PCM on stdout.
      const ytdlp = spawn("yt-dlp", ["-f", "bestaudio", "--no-playlist", "-o", "-", url]);
      ytdlp.stderr.on("data", () => {});

      const ffmpeg = spawn("ffmpeg", ["-i", "pipe:0", "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"]);
      ffmpeg.stderr.on("data", () => {});
      ytdlp.stdout.pipe(ffmpeg.stdin);

      const player = new AudioPlayer();
      connection.subscribe(player);

      const resource = AudioResource.fromPCMStream(ffmpeg.stdout);
      player.play(resource);
      player.once("idle", () => {
        ytdlp.kill();
        ffmpeg.kill();
        sessions.delete(interaction.guildId);
      });

      sessions.set(interaction.guildId, { player, ytdlp, ffmpeg });

      await interaction.editReply("Playing.");
      return;
    }

    if (interaction.commandName === "pausemusic") {
      const session = sessions.get(interaction.guildId);
      if (!session) {
        await interaction.reply({ content: "Nothing is playing.", flags: 64 });
        return;
      }

      if (session.player.state === AudioPlayerStatus.Playing) {
        session.player.pause();
        await interaction.reply("Paused.");
      } else {
        session.player.unpause();
        await interaction.reply("Resumed.");
      }
      return;
    }

    if (interaction.commandName === "stopmusic") {
      stopSession(interaction.guildId);
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
  console.error("DISCORD_TOKEN is not set. Run with: node --env-file=.env examples/music-bot.js");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
