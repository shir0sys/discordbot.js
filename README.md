# discordbot.js

[![CI](https://github.com/shir0sys/discordbot.js/actions/workflows/ci.yml/badge.svg)](https://github.com/shir0sys/discordbot.js/actions/workflows/ci.yml)

A Discord API v10 wrapper for Node.js (>=22). REST, gateway, interactions, builders and voice are all built on Node's native `fetch`/`WebSocket`/`EventEmitter`/`crypto`/`dgram` — the one real runtime dependency is [`opusscript`](https://www.npmjs.com/package/opusscript) (a pure WASM port of libopus), used only by the voice module for Opus encoding.

## Usage

```bash
npm install
npm run build
DISCORD_TOKEN=xxx node --env-file=.env example.js
```

See [example.js](./example.js) for a tour of the library: slash commands, text commands, buttons/select menus, Components V2, modals, context menu commands, moderation, permissions, threads, webhooks, polls, collectors, audit logs and error handling.

See [examples/ticket-bot.js](./examples/ticket-bot.js) for a complete, restart-safe support ticket system (open/claim/close via buttons and context menu commands).

See [examples/voice-bot.js](./examples/voice-bot.js) for joining a voice channel and playing audio (`/play`, `/stop`) — needs `ffmpeg` installed separately as a system binary to transcode input into raw PCM.

See [examples/music-bot.js](./examples/music-bot.js) for a YouTube music bot (`/joinmyvoc`, `/playmusic`, `/pausemusic`, `/stopmusic`) — needs `ffmpeg` and [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) installed separately as system binaries.

## Testing

```bash
npm test
```

Runs the TypeScript build then the test suite with Node's built-in test runner (`node:test`) — no test framework dependency.

## Architecture

- `src/rest` — HTTP client with per-bucket rate-limit queues, global-limit sync, 5xx retry, and multipart file uploads.
- `src/gateway` — WebSocket v10 client handling HELLO/heartbeat/IDENTIFY/RESUME, reconnection, and optional internal sharding.
- `src/client` — `Client` event emitter routing gateway dispatches (messages, members, roles, channels, threads, voice states, moderation, scheduled events, interactions, ...) into typed structures.
- `src/structures` — domain entities (`User`, `Guild`, `Channel` variants, `Message`, `Interaction` variants, `Webhook`, `Emoji`, `Sticker`, collectors, ...).
- `src/managers` — caches and REST-backed collections (`Collection`, `GuildMemberManager`, `RoleManager`, `MessageManager`, ...).
- `src/builders` — `EmbedBuilder`, classic components (buttons/select menus), Components V2 layout components, modals, `SlashCommandBuilder`, `ContextMenuCommandBuilder`, `AttachmentBuilder`, `PollBuilder`.
- `src/util` — bitfields (`PermissionsBitField`, `IntentsBitField`, ...), `Formatters`, `SnowflakeUtil`, color resolution, typed errors.
- `src/voice` — voice gateway client, UDP transport (IP discovery, RTP framing, AES-256-GCM encryption via `node:crypto`), `AudioPlayer`/`AudioResource`, and the `opusscript`-backed `OpusEncoder`.

## Scope and caveats

- **Voice does not work on channels/guilds where Discord requires DAVE (end-to-end encryption).** Verified against a live voice server: the gateway handshake, UDP IP discovery and RTP/AES-256-GCM framing all work correctly, but Discord now mandates the DAVE protocol (an MLS-based end-to-end encryption scheme) for voice connections, which this library does not implement — it's a substantial protocol in its own right (group key ratcheting, epochs, proposals/commits), not a small addition. A connection attempt on a DAVE-required channel fails fast with a clear "E2EE/DAVE protocol required" error instead of hanging or crashing, but there is currently no way to actually join such a channel.
- No voice *receive* (listening to other members) — send-only.
- No automatic reconnection/resilience on voice gateway drops beyond a basic reconnect for genuinely transient close codes; no jitter buffering.
