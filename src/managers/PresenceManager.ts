import { CachedManager } from "./CachedManager";
import { Presence } from "../structures/Presence";
import type { Client } from "../client/Client";

/**
 * Like VoiceStateManager, there's no REST endpoint for presences — populated
 * only from GUILD_CREATE (when the privileged presences intent is granted)
 * and kept current by PRESENCE_UPDATE dispatch.
 */
export class PresenceManager extends CachedManager<string, Presence> {
  constructor(client: Client) {
    super(client);
  }
}
