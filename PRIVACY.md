# Privacy Policy

_Last updated: 2026-10-31_

This Privacy Policy explains how the Discord bot **discbot.js** (the "Bot") handles information when it is added to a Discord server or interacted with directly.

## 1. Information We Process

To function, the Bot receives data directly from Discord's API and Gateway, which may include:

- Message content, author, and channel/guild identifiers for messages the Bot can see (per the intents it was granted).
- Slash command, button, select menu, and modal interaction payloads (command names, option values, custom IDs, submitted field values).
- Basic user, member, role, and guild/channel metadata exposed by Discord (IDs, usernames, avatars, role assignments).

## 2. How We Use This Information

This information is used exclusively, in real time, to:

- Respond to commands and interactions (e.g. replying to a slash command, handling a button click).
- Maintain short-lived, in-memory caches (users, guilds, channels) so the Bot can operate efficiently while running.

## 3. Data Storage and Retention

The Bot does **not** persist data to any external database, file, or third-party service. All data handled by the Bot exists only in the running process's memory and is discarded when the process restarts or when the relevant cache entry is evicted. We do not sell, rent, or share any data with third parties.

## 4. Data Sharing

We do not share the information the Bot processes with any third party, except as required to operate the Bot itself (i.e., requests made to Discord's own API, which are inherent to how Discord bots function).

## 5. Your Rights

Since the Bot does not retain data beyond its running memory, there is no persistent record to request deletion of. Removing the Bot from your server, or deleting your messages/interactions in Discord, immediately removes the Bot's access to that data going forward.

## 6. Children's Privacy

The Bot is not directed at children under the age required by Discord's own Terms of Service, and we do not knowingly process data in a way that targets children.

## 7. Changes to This Policy

This Privacy Policy may be updated from time to time. Material changes will be reflected by updating the "Last updated" date above.

## 8. Contact

Questions about this Privacy Policy can be raised via [GitHub Issues](https://github.com/shir0sys/discordbot.js/issues) on this repository.

See also our [Terms of Service](./TERMS.md).
