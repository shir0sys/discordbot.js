import { Channel, type APIChannel } from "./Channel";
import { ThreadManager } from "../managers/ThreadManager";
import { ThreadChannel, type APIThreadChannel } from "./ThreadChannel";
import type { Client } from "../client/Client";

export interface APIForumTag {
  id: string;
  name: string;
  moderated: boolean;
  emoji_id: string | null;
  emoji_name: string | null;
}

export interface APIForumChannel extends APIChannel {
  topic?: string | null;
  available_tags?: APIForumTag[];
  default_sort_order?: number | null;
  default_reaction_emoji?: { emoji_id: string | null; emoji_name: string | null } | null;
}

/** Forum (and media) channels hold no regular messages — every post is a thread created via `.threads`. */
export class ForumChannel extends Channel {
  public guildId: string;
  public name: string | null;
  public topic: string | null;
  public availableTags: APIForumTag[];
  public defaultSortOrder: number | null;
  public readonly threads: ThreadManager;

  constructor(client: Client, data: APIForumChannel) {
    super(client, data);
    this.guildId = data.guild_id!;
    this.name = data.name ?? null;
    this.topic = data.topic ?? null;
    this.availableTags = data.available_tags ?? [];
    this.defaultSortOrder = data.default_sort_order ?? null;
    this.threads = new ThreadManager(client, this.id);
  }

  public async createPost(
    data: { name: string; message: { content?: string }; appliedTags?: string[]; autoArchiveDuration?: number },
    reason?: string,
  ): Promise<ThreadChannel> {
    const payload = await this.client.rest.post<APIThreadChannel>(
      `/channels/${this.id}/threads`,
      {
        name: data.name,
        message: data.message,
        applied_tags: data.appliedTags,
        auto_archive_duration: data.autoArchiveDuration,
      },
      reason,
    );
    return new ThreadChannel(this.client, payload);
  }
}
