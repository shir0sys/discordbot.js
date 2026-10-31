import { Base } from "./Base";
import { Collection } from "../managers/Collection";
import { Role, type APIRole } from "./Role";
import { Member, type APIMember } from "./Member";
import { Channel, type APIChannel } from "./Channel";
import { TextChannel } from "./TextChannel";
import { VoiceChannel } from "./VoiceChannel";
import { ChannelType } from "../util/Constants";
import type { Client } from "../client/Client";

export interface APIGuild {
  id: string;
  name: string;
  owner_id: string;
  icon: string | null;
  roles: APIRole[];
  channels?: APIChannel[];
}

/** Instantiates the correct Channel subclass for a channel payload's type. */
export function createChannel(client: Client, data: APIChannel): Channel {
  switch (data.type) {
    case ChannelType.GuildText:
    case ChannelType.GuildAnnouncement:
      return new TextChannel(client, data);
    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice:
      return new VoiceChannel(client, data);
    default:
      return new Channel(client, data);
  }
}

export class Guild extends Base {
  public id: string;
  public name: string;
  public ownerId: string;
  public icon: string | null;

  public readonly roles = new Collection<string, Role>();
  public readonly channels = new Collection<string, Channel>();
  public readonly members = new Collection<string, Member>(null, 5000);

  constructor(client: Client, data: APIGuild) {
    super(client);
    this.id = data.id;
    this.name = data.name;
    this.ownerId = data.owner_id;
    this.icon = data.icon;

    for (const role of data.roles) this.roles.set(role.id, new Role(client, this.id, role));
    for (const channel of data.channels ?? []) this.channels.set(channel.id, createChannel(client, channel));
  }

  public _patchMember(userId: string, data: APIMember): Member {
    const member = new Member(this.client, this.id, data);
    this.members.set(userId, member);
    return member;
  }

  public iconURL(): string | null {
    if (!this.icon) return null;
    return `https://cdn.discordapp.com/icons/${this.id}/${this.icon}.png`;
  }
}
