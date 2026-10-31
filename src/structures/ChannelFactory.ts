import { Channel, type APIChannel } from "./Channel";
import { TextChannel } from "./TextChannel";
import { VoiceChannel } from "./VoiceChannel";
import { StageChannel } from "./StageChannel";
import { ThreadChannel, type APIThreadChannel } from "./ThreadChannel";
import { CategoryChannel } from "./CategoryChannel";
import { ForumChannel, type APIForumChannel } from "./ForumChannel";
import { MediaChannel } from "./MediaChannel";
import { ChannelType } from "../util/Constants";
import type { Client } from "../client/Client";

/** Instantiates the correct Channel subclass for a channel payload's type. */
export function createChannel(client: Client, data: APIChannel): Channel {
  switch (data.type) {
    case ChannelType.GuildText:
    case ChannelType.GuildAnnouncement:
      return new TextChannel(client, data);
    case ChannelType.GuildVoice:
      return new VoiceChannel(client, data);
    case ChannelType.GuildStageVoice:
      return new StageChannel(client, data);
    case ChannelType.GuildCategory:
      return new CategoryChannel(client, data);
    case ChannelType.GuildForum:
      return new ForumChannel(client, data as APIForumChannel);
    case ChannelType.GuildMedia:
      return new MediaChannel(client, data as APIForumChannel);
    case ChannelType.PublicThread:
    case ChannelType.PrivateThread:
    case ChannelType.AnnouncementThread:
      return new ThreadChannel(client, data as APIThreadChannel);
    default:
      return new Channel(client, data);
  }
}
