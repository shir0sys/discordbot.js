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
- `src/voice` — voice gateway v8 client, UDP transport (IP discovery, RTP framing, AES-256-GCM encryption via `node:crypto`), `AudioPlayer`/`AudioResource`, and the `opusscript`-backed `OpusEncoder`.

## Scope and caveats

- **Voice protocol correctness is untested against a live Discord voice server.** The gateway handshake, UDP IP discovery, RTP framing and AES-256-GCM encryption are implemented from Discord's written documentation and unit-tested for internal consistency (the crypto round-trips against Node's own AES-GCM, Opus encode/decode round-trips through real libopus), but exact byte-level agreement with Discord's servers has only been verified by inspection, not a real connection. Expect to debug it against a real bot/voice channel.
- No voice *receive* (listening to other members) — send-only.
- No automatic reconnection/resilience on voice gateway drops beyond a basic reconnect; no jitter buffering.
