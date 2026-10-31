import { Channel, type APIChannel } from "./Channel";
import { TextChannel } from "./TextChannel";
import { VoiceChannel } from "./VoiceChannel";
import { ThreadChannel, type APIThreadChannel } from "./ThreadChannel";
import { ChannelType } from "../util/Constants";
import type { Client } from "../client/Client";

/** Instantiates the correct Channel subclass for a channel payload's type. */
export function createChannel(client: Client, data: APIChannel): Channel {
  switch (data.type) {
    case ChannelType.GuildText:
    case ChannelType.GuildAnnouncement:
      return new TextChannel(client, data);
    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice:
      return new VoiceChannel(client, data);
    case ChannelType.PublicThread:
    case ChannelType.PrivateThread:
    case ChannelType.AnnouncementThread:
      return new ThreadChannel(client, data as APIThreadChannel);
    default:
      return new Channel(client, data);
  }
}
