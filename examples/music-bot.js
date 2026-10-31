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

// A process that never actually spawned (e.g. ENOENT) has no valid handle —
// calling .kill() on it throws synchronously on Windows (EINVAL) instead of
// just being a no-op like on POSIX. Also guards against killing a process
// twice, which both the 'idle' handler and a failed-spawn handler can race to do.
function safeKill(child) {
  if (!child.pid) return;
  try {
    child.kill();
  } catch {
    // already dead or never started — nothing to do
  }
}

function stopSession(guildId) {
  const session = sessions.get(guildId);
  if (!session) return;
  session.player.stop();
  safeKill(session.ytdlp);
  safeKill(session.ffmpeg);
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
      let ytdlpLog = "";
      ytdlp.stderr.on("data", (chunk) => (ytdlpLog += chunk));

      const ffmpeg = spawn("ffmpeg", ["-i", "pipe:0", "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"]);
      let ffmpegLog = "";
      ffmpeg.stderr.on("data", (chunk) => (ffmpegLog += chunk));
      ytdlp.stdout.pipe(ffmpeg.stdin);

      // If either side of the pipe exits first (bad URL, unsupported format,
      // killed process...), the other keeps trying to read/write its end of
      // a now-closed pipe. Node surfaces that as an 'error' event (EPIPE on
      // the write side, ECONNRESET/EPIPE on the read side) on the stream —
      // without a listener that's an unhandled error and kills the process.
      ytdlp.stdout.on("error", () => {});
      ffmpeg.stdin.on("error", () => {});

      const player = new AudioPlayer();
      connection.subscribe(player);

      // A missing binary (ENOENT), a crash, or a bad input URL all end with
      // one side of the pipeline exiting — report it and tear the rest down
      // instead of leaving a dangling process or letting an unhandled
      // 'error' event kill the whole bot.
      let playbackFailed = false;
      const failPlayback = (binary, detail) => {
        if (playbackFailed) return;
        playbackFailed = true;
        console.error(`${binary} failed:`, detail);
        player.stop();
        safeKill(ytdlp);
        safeKill(ffmpeg);
        sessions.delete(interaction.guildId);
        interaction
          .editReply(
            `\`${binary}\` failed — check the console for details (bad URL, unavailable video, or it's not installed).`,
          )
          .catch(() => {});
      };
      ytdlp.on("error", (error) => failPlayback("yt-dlp", error.message));
      ffmpeg.on("error", (error) => failPlayback("ffmpeg", error.message));
      ytdlp.on("close", (code) => {
        if (code !== 0 && code !== null) failPlayback("yt-dlp", ytdlpLog || `exited with code ${code}`);
      });
      ffmpeg.on("close", (code) => {
        if (code !== 0 && code !== null) failPlayback("ffmpeg", ffmpegLog || `exited with code ${code}`);
      });

      const resource = AudioResource.fromPCMStream(ffmpeg.stdout);
      player.play(resource);
      player.once("idle", () => {
        safeKill(ytdlp);
        safeKill(ffmpeg);
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
