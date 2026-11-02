import { CachedManager } from "./CachedManager";
import { VoiceState } from "../structures/VoiceState";
import type { Client } from "../client/Client";

/**
 * There's no REST endpoint for voice states — this cache is only ever
 * populated from GUILD_CREATE's initial snapshot and kept current by
 * VOICE_STATE_UPDATE dispatch, so there's no fetch() here.
 */
export class VoiceStateManager extends CachedManager<string, VoiceState> {
  constructor(client: Client) {
    super(client);
  }

  /** Every member currently connected to a specific voice/stage channel in this guild. */
  public inChannel(channelId: string): VoiceState[] {
    return this.toArray().filter((state) => state.channelId === channelId);
  }
}
