# discordbot.js

Zero-dependency Discord API v10 wrapper for Node.js (>=22), built on native `fetch`, `WebSocket`, and `EventEmitter` only.

## Usage

```bash
npm install
npm run build
DISCORD_TOKEN=xxx node --env-file=.env example.js
```

See [example.js](./example.js) for a bot registering slash commands, text commands, buttons/select menus, Components V2, modals, and a context menu command.

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

## Scope

Voice (voice gateway, RTP, Opus encode/decode) is intentionally not implemented: doing it without a third-party dependency means writing a pure-JS/WASM Opus codec from scratch, which is out of scope for this pass.
