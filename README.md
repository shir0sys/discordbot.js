# discordbot.js

Zero-dependency Discord API v10 wrapper for Node.js (>=22), built on native `fetch`, `WebSocket`, and `EventEmitter` only.

## Usage

```bash
npm install
npm run build
DISCORD_TOKEN=xxx npm run example
```

See [example.js](./example.js) for a minimal bot registering and handling a `/ping` slash command.

## Architecture

- `src/rest` — HTTP client with per-bucket rate-limit queues, global-limit sync, and 5xx retry.
- `src/gateway` — WebSocket v10 client handling HELLO/heartbeat/IDENTIFY/RESUME and reconnection.
- `src/client` — `Client` event emitter routing gateway dispatches into typed structures.
- `src/structures` — domain entities (`User`, `Guild`, `Channel`, `Message`, `Interaction`, ...).
- `src/managers` — caches and REST-backed collections (`Collection`, `GuildManager`, ...).
