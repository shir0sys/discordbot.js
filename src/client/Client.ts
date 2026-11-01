import { EventEmitter } from "node:events";
import { REST } from "../rest/REST";
import { Gateway } from "../gateway/Gateway";
import { IntentsBitField, type IntentResolvable } from "../util/Intents";
import { GuildManager } from "../managers/GuildManager";
import { ChannelManager } from "../managers/ChannelManager";
import { UserManager } from "../managers/UserManager";
import { ApplicationCommandManager } from "../managers/ApplicationCommandManager";
import { MonetizationManager } from "../managers/MonetizationManager";
import { SoundboardManager } from "../managers/SoundboardManager";
import { ClientUser } from "../structures/ClientUser";
import { Guild, type APIGuild } from "../structures/Guild";
import { createChannel } from "../structures/ChannelFactory";
import { Message, type APIMessage } from "../structures/Message";
import { Role, type APIRole } from "../structures/Role";
import { Member, type APIMember } from "../structures/Member";
import { User, type APIUser } from "../structures/User";
import { VoiceState, type APIVoiceState } from "../structures/VoiceState";
import { StageInstance, type APIStageInstance } from "../structures/StageInstance";
import { GuildScheduledEvent, type APIGuildScheduledEvent } from "../structures/GuildScheduledEvent";
import { AutoModerationRule, type APIAutoModerationRule } from "../structures/AutoModerationRule";
import { Interaction, type APIInteraction } from "../structures/Interaction";
import { CommandInteraction } from "../structures/CommandInteraction";
import { ContextMenuCommandInteraction } from "../structures/ContextMenuCommandInteraction";
import { MessageComponentInteraction } from "../structures/MessageComponentInteraction";
import { ModalSubmitInteraction } from "../structures/ModalSubmitInteraction";
import { AutocompleteInteraction } from "../structures/AutocompleteInteraction";
import { ApplicationCommandType, GatewayOpcodes, InteractionType } from "../util/Constants";
import { ShardClientUtil } from "../sharding/ShardClientUtil";
import { GuildBan, type APIBan } from "../structures/GuildBan";
import { Invite, type APIInvite, type PartialInvite } from "../structures/Invite";
import { Presence, type APIPresence } from "../structures/Presence";
import { VoiceConnection, VoiceConnectionStatus } from "../voice/VoiceConnection";
import { Application, type APIApplication } from "../structures/Application";
import { StickerPack, type APIStickerPack } from "../structures/StickerPack";
import { Entitlement, type APIEntitlement } from "../structures/Entitlement";
import type { APIChannel } from "../structures/Channel";

export interface TypingStartData {
  channelId: string;
  guildId: string | null;
  userId: string;
  timestamp: number;
}

export interface PollVoteData {
  userId: string;
  channelId: string;
  messageId: string;
  guildId: string | null;
  answerId: number;
}

export interface GuildMembersChunkData {
  guildId: string;
  members: Member[];
  chunkIndex: number;
  chunkCount: number;
  nonce: string | null;
}

/** MESSAGE_UPDATE only carries the fields that actually changed — everything but id/channelId may be absent. */
export interface PartialMessageUpdate {
  id: string;
  channelId: string;
  guildId: string | null;
  content?: string;
  editedTimestamp?: number;
}

export interface MessageReactionEventData {
  userId: string;
  channelId: string;
  messageId: string;
  guildId: string | null;
  emoji: { id: string | null; name: string | null; animated: boolean };
}

export interface MessageReactionRemoveAllData {
  channelId: string;
  messageId: string;
  guildId: string | null;
}

export interface MessageReactionRemoveEmojiData {
  channelId: string;
  messageId: string;
  guildId: string | null;
  emoji: { id: string | null; name: string | null };
}

export interface ChannelPinsUpdateData {
  channelId: string;
  guildId: string | null;
  lastPinTimestamp: number | null;
}

export interface ClientOptions {
  intents: IntentResolvable;
  largeThreshold?: number;
  /** Number of internal gateway shards to run, or "auto" to use Discord's recommended count from /gateway/bot. Omit for a single shard. */
  shardCount?: number | "auto";
}

interface APIGatewayBotInfo {
  url: string;
  shards: number;
  session_start_limit: { total: number; remaining: number; reset_after: number; max_concurrency: number };
}

type ClientEvents = {
  ready: [];
  resumed: [];
  debug: [string];
  error: [import("../util/Errors").GatewayError];
  messageCreate: [Message];
  messageUpdate: [PartialMessageUpdate];
  messageDelete: [{ id: string; channelId: string; guildId: string | null; message: Message | null }];
  messageDeleteBulk: [{ ids: string[]; channelId: string; guildId: string | null }];
  messageReactionAdd: [MessageReactionEventData];
  messageReactionRemove: [MessageReactionEventData];
  messageReactionRemoveAll: [MessageReactionRemoveAllData];
  messageReactionRemoveEmoji: [MessageReactionRemoveEmojiData];
  messagePollVoteAdd: [PollVoteData];
  messagePollVoteRemove: [PollVoteData];
  guildCreate: [Guild];
  /** The "old" snapshot only carries the scalar fields GUILD_UPDATE can change — Guild._patch() mutates the cached instance in place, so anything not captured here is already gone by the time this fires. */
  guildUpdate: [
    old: {
      name: string;
      icon: string | null;
      ownerId: string;
      verificationLevel: number;
      afkChannelId: string | null;
      afkTimeout: number;
      mfaLevel: number;
    } | null,
    current: Guild,
  ];
  guildDelete: [{ id: string; unavailable: boolean }];
  guildMemberAdd: [Member];
  guildMemberRemove: [{ guildId: string; user: User }];
  guildMemberUpdate: [old: Member | null, current: Member];
  guildMembersChunk: [GuildMembersChunkData];
  guildBanAdd: [GuildBan];
  guildBanRemove: [GuildBan];
  roleCreate: [Role];
  roleUpdate: [old: Role | null, current: Role];
  roleDelete: [Role | null];
  channelCreate: [import("../structures/Channel").Channel];
  channelUpdate: [
    old: import("../structures/Channel").Channel | null,
    current: import("../structures/Channel").Channel,
  ];
  channelDelete: [import("../structures/Channel").Channel];
  channelPinsUpdate: [ChannelPinsUpdateData];
  threadCreate: [import("../structures/ThreadChannel").ThreadChannel];
  threadUpdate: [import("../structures/ThreadChannel").ThreadChannel];
  threadDelete: [{ id: string; guildId: string }];
  presenceUpdate: [Presence];
  typingStart: [TypingStartData];
  userUpdate: [User];
  voiceStateUpdate: [VoiceState];
  voiceServerUpdate: [Record<string, unknown>];
  webhooksUpdate: [{ guildId: string; channelId: string }];
  inviteCreate: [Invite];
  inviteDelete: [PartialInvite];
  stageInstanceCreate: [StageInstance];
  stageInstanceUpdate: [StageInstance];
  stageInstanceDelete: [StageInstance];
  guildScheduledEventCreate: [GuildScheduledEvent];
  guildScheduledEventUpdate: [GuildScheduledEvent];
  guildScheduledEventDelete: [GuildScheduledEvent];
  autoModerationRuleCreate: [AutoModerationRule];
  autoModerationRuleUpdate: [AutoModerationRule];
  autoModerationRuleDelete: [AutoModerationRule];
  autoModerationActionExecution: [Record<string, unknown>];
  entitlementCreate: [Entitlement];
  entitlementUpdate: [Entitlement];
  entitlementDelete: [Entitlement];
  interactionCreate: [Interaction];
};

export class Client extends EventEmitter {
  public readonly guilds: GuildManager;
  public readonly channels: ChannelManager;
  public readonly users: UserManager;
  public readonly application: ApplicationCommandManager;
  public readonly monetization: MonetizationManager;
  public readonly soundboard: SoundboardManager;
  public readonly intents: IntentsBitField;
  public readonly shard: ShardClientUtil;
  public readonly voiceConnections = new Map<string, VoiceConnection>();

  // Constructed lazily in login(): the REST/Gateway clients need the bot
  // token up front and ClientOptions alone doesn't carry one.
  private _rest: REST | null = null;
  private readonly _gateways: Gateway[] = [];
  private readonly readyShards = new Set<number>();
  private expectedShardCount = 1;

  public user: ClientUser | null = null;
  public applicationId: string | null = null;

  constructor(private readonly options: ClientOptions) {
    super();
    this.intents = new IntentsBitField(options.intents);
    this.guilds = new GuildManager(this);
    this.channels = new ChannelManager(this);
    this.users = new UserManager(this);
    this.application = new ApplicationCommandManager(this);
    this.monetization = new MonetizationManager(this);
    this.soundboard = new SoundboardManager(this);
    this.shard = new ShardClientUtil(this);
  }

  public get rest(): REST {
    if (!this._rest) throw new Error("Client is not logged in yet");
    return this._rest;
  }

  /** The shard-0 gateway connection. Fine for single-shard bots; multi-shard bots should use `shards` instead. */
  public get gateway(): Gateway {
    if (!this._gateways.length) throw new Error("Client is not logged in yet");
    return this._gateways[0];
  }

  public get shards(): readonly Gateway[] {
    return this._gateways;
  }

  private shardFor(guildId: string): Gateway {
    const shardCount = this._gateways.length || 1;
    const shardId = Number((BigInt(guildId) >> 22n) % BigInt(shardCount));
    return this._gateways[shardId] ?? this.gateway;
  }

  /**
   * Joins a voice channel: sends the Voice State Update (opcode 4) on the
   * shard responsible for the guild, waits for the matching
   * VOICE_STATE_UPDATE (our own session id) and VOICE_SERVER_UPDATE
   * (token + endpoint) dispatches, then hands both to a VoiceConnection.
   */
  public async joinVoiceChannel(options: {
    guildId: string;
    channelId: string;
    selfMute?: boolean;
    selfDeaf?: boolean;
    timeout?: number;
  }): Promise<VoiceConnection> {
    if (!this.user) throw new Error("Cannot join a voice channel before the client is ready");

    const { guildId, channelId, selfMute = false, selfDeaf = false, timeout = 10000 } = options;
    const joinStartedAt = Date.now();

    // A stale connection left over from a previous attempt that timed out
    // keeps its own voice gateway socket (and the session_id/token it was
    // identified with) alive. Re-identifying a fresh VoiceConnection while
    // that old session is still open is a likely cause of Discord closing
    // the new one with 4006 (session no longer valid) — clear it first.
    this.voiceConnections.get(guildId)?.destroy();
    this.voiceConnections.delete(guildId);

    const cleanups: (() => void)[] = [];

    // Discord can send a second, corrected VOICE_STATE_UPDATE/VOICE_SERVER_UPDATE
    // pair a moment after the first while the voice server assignment settles —
    // identifying with the first pair's session_id/token can get invalidated by
    // that second one arriving right after (close code 4006). Debounce briefly
    // and always use the most recently received value of each.
    const DEBOUNCE_MS = 300;

    const statePromise = new Promise<VoiceState>((resolve) => {
      let latest: VoiceState | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const onState = (state: VoiceState) => {
        if (state.guildId !== guildId || state.userId !== this.user!.id || state.channelId !== channelId) return;
        latest = state;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => resolve(latest!), DEBOUNCE_MS);
      };
      this.on("voiceStateUpdate", onState);
      cleanups.push(() => {
        this.off("voiceStateUpdate", onState);
        if (timer) clearTimeout(timer);
      });
    });

    const serverPromise = new Promise<{ token: string; endpoint: string }>((resolve) => {
      let latest: { token: string; endpoint: string } | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const onServer = (data: Record<string, any>) => {
        if (data.guild_id !== guildId) return;
        latest = { token: data.token, endpoint: data.endpoint };
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => resolve(latest!), DEBOUNCE_MS);
      };
      this.on("voiceServerUpdate", onServer);
      cleanups.push(() => {
        this.off("voiceServerUpdate", onServer);
        if (timer) clearTimeout(timer);
      });
    });

    this.emit("debug", `[voice] +0ms sending VoiceStateUpdate (join)`);
    this.shardFor(guildId).send(GatewayOpcodes.VoiceStateUpdate, {
      guild_id: guildId,
      channel_id: channelId,
      self_mute: selfMute,
      self_deaf: selfDeaf,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timed out waiting for voice server info")), timeout).unref?.();
    });

    let state: VoiceState;
    let server: { token: string; endpoint: string };
    try {
      [state, server] = await Promise.all([
        Promise.race([statePromise, timeoutPromise]),
        Promise.race([serverPromise, timeoutPromise]),
      ]);
    } finally {
      cleanups.forEach((cleanup) => cleanup());
    }
    this.emit(
      "debug",
      `[voice] +${Date.now() - joinStartedAt}ms got state+server (endpoint=${server.endpoint}), constructing VoiceConnection`,
    );

    const connection = new VoiceConnection({
      guildId,
      channelId,
      userId: this.user.id,
      sessionId: state.sessionId,
      token: server.token,
      endpoint: server.endpoint,
    });
    this.voiceConnections.set(guildId, connection);
    connection.on("debug", (message) => this.emit("debug", `[voice] ${message}`));
    // Attaching this immediately (rather than leaving 'error' unlistened)
    // also prevents Node's default EventEmitter behavior of throwing on an
    // unhandled 'error' event if something goes wrong before the caller
    // gets a reference to the connection to listen on it themselves.
    connection.on("error", (error) => this.emit("debug", `[voice] error: ${error.message}`));

    // Keep reacting to corrected VOICE_STATE_UPDATE/VOICE_SERVER_UPDATE pairs
    // for as long as this connection lives, not just during the initial
    // debounce window above — Discord can send one after the voice websocket
    // has already started connecting, which otherwise surfaces as a 4006
    // right after IDENTIFY.
    const onLiveState = (liveState: VoiceState) => {
      if (liveState.guildId !== guildId || liveState.userId !== this.user!.id) return;
      if (liveState.channelId === null) {
        connection.destroy();
        this.voiceConnections.delete(guildId);
        return;
      }
      connection.updateVoiceData({ sessionId: liveState.sessionId });
    };
    const onLiveServer = (liveServer: Record<string, any>) => {
      if (liveServer.guild_id !== guildId) return;
      connection.updateVoiceData({ token: liveServer.token, endpoint: liveServer.endpoint });
    };
    this.on("voiceStateUpdate", onLiveState);
    this.on("voiceServerUpdate", onLiveServer);
    connection.on("stateChange", (connState) => {
      if (connState === VoiceConnectionStatus.Destroyed) {
        this.off("voiceStateUpdate", onLiveState);
        this.off("voiceServerUpdate", onLiveServer);
      }
    });

    try {
      await connection.waitUntilReady(timeout);
    } catch (error) {
      connection.destroy();
      this.voiceConnections.delete(guildId);
      throw error;
    }

    return connection;
  }

  public async fetchApplication(): Promise<Application> {
    const data = await this.rest.get<APIApplication>("/applications/@me");
    return new Application(this, data);
  }

  public async fetchStickerPacks(): Promise<StickerPack[]> {
    const data = await this.rest.get<{ sticker_packs: APIStickerPack[] }>("/sticker-packs");
    return data.sticker_packs.map((pack) => new StickerPack(this, pack));
  }

  public leaveVoiceChannel(guildId: string): void {
    this.shardFor(guildId).send(GatewayOpcodes.VoiceStateUpdate, {
      guild_id: guildId,
      channel_id: null,
      self_mute: false,
      self_deaf: false,
    });
    this.voiceConnections.get(guildId)?.destroy();
    this.voiceConnections.delete(guildId);
  }

  public async login(token: string): Promise<void> {
    this._rest = new REST({ token });

    // When forked by ShardingManager, this process already *is* one shard —
    // run exactly the shard id/count it was given rather than spawning more.
    if (process.env.SHARD_COUNT) {
      this.spawnShard(token, Number(process.env.SHARD_ID ?? 0), Number(process.env.SHARD_COUNT));
      return;
    }

    if (!this.options.shardCount) {
      this.spawnShard(token, 0, 0);
      return;
    }

    const gatewayInfo = await this._rest.get<APIGatewayBotInfo>("/gateway/bot");
    const shardCount = this.options.shardCount === "auto" ? gatewayInfo.shards : this.options.shardCount;
    const maxConcurrency = gatewayInfo.session_start_limit.max_concurrency || 1;
    this.expectedShardCount = shardCount;

    // Shards are identified in "rate limit key" buckets of shardId % max_concurrency.
    // Different buckets may IDENTIFY concurrently; within a bucket, one at a time,
    // spaced out below the gateway's 1-per-5s-per-bucket limit.
    const bucketCount = Math.min(maxConcurrency, shardCount);
    let round = 0;
    for (let offset = 0; offset * bucketCount < shardCount; offset++) {
      const shardIds: number[] = [];
      for (let bucket = 0; bucket < bucketCount; bucket++) {
        const shardId = offset * bucketCount + bucket;
        if (shardId < shardCount) shardIds.push(shardId);
      }
      for (const shardId of shardIds) this.spawnShard(token, shardId, shardCount);
      round++;
      if (round * bucketCount < shardCount) await delay(5500);
    }
  }

  private spawnShard(token: string, shardId: number, shardCount: number): void {
    const gateway = new Gateway({
      token,
      intents: this.intents.bitfield,
      largeThreshold: this.options.largeThreshold,
      shardId: shardCount ? shardId : undefined,
      shardCount: shardCount || undefined,
    });
    gateway.on("dispatch", (event, data) => this.onDispatch(event, data, shardId));
    gateway.on("debug", (message) => this.emit("debug", `[shard ${shardId}] ${message}`));
    gateway.on("error", (error) => this.emit("error", error));
    gateway.connect();
    this._gateways[shardId] = gateway;
  }

  private onDispatch(event: string, data: unknown, shardId = 0): void {
    const d = data as Record<string, any>;

    switch (event) {
      case "READY": {
        this.user = new ClientUser(this, d.user as APIUser);
        this.applicationId = d.application.id;
        this.readyShards.add(shardId);
        if (this.readyShards.size >= this.expectedShardCount) this.emit("ready");
        break;
      }
      case "RESUMED":
        this.emit("resumed");
        break;

      // Messages
      case "MESSAGE_CREATE": {
        const message = new Message(this, d as APIMessage);
        const channel = this.channels.cache.get(message.channelId);
        if (channel?.isText()) channel.messages.set(message.id, message);
        this.emit("messageCreate", message);
        break;
      }
      case "MESSAGE_UPDATE": {
        const channel = this.channels.cache.get(d.channel_id);
        const cached = channel?.isText() ? channel.messages.get(d.id) : undefined;
        if (cached && d.content !== undefined) cached.content = d.content;
        if (cached && d.edited_timestamp) cached.editedTimestamp = Date.parse(d.edited_timestamp);
        this.emit("messageUpdate", {
          id: d.id,
          channelId: d.channel_id,
          guildId: d.guild_id ?? null,
          content: d.content,
          editedTimestamp: d.edited_timestamp ? Date.parse(d.edited_timestamp) : undefined,
        });
        break;
      }
      case "MESSAGE_DELETE": {
        const channel = this.channels.cache.get(d.channel_id);
        const cached = channel?.isText() ? (channel.messages.get(d.id) ?? null) : null;
        if (channel?.isText()) channel.messages.delete(d.id);
        this.emit("messageDelete", { id: d.id, channelId: d.channel_id, guildId: d.guild_id ?? null, message: cached });
        break;
      }
      case "MESSAGE_DELETE_BULK": {
        const channel = this.channels.cache.get(d.channel_id);
        if (channel?.isText()) {
          for (const id of d.ids as string[]) channel.messages.delete(id);
        }
        this.emit("messageDeleteBulk", { ids: d.ids, channelId: d.channel_id, guildId: d.guild_id ?? null });
        break;
      }
      case "MESSAGE_REACTION_ADD":
        this.emit("messageReactionAdd", {
          userId: d.user_id,
          channelId: d.channel_id,
          messageId: d.message_id,
          guildId: d.guild_id ?? null,
          emoji: { id: d.emoji?.id ?? null, name: d.emoji?.name ?? null, animated: d.emoji?.animated ?? false },
        });
        break;
      case "MESSAGE_REACTION_REMOVE":
        this.emit("messageReactionRemove", {
          userId: d.user_id,
          channelId: d.channel_id,
          messageId: d.message_id,
          guildId: d.guild_id ?? null,
          emoji: { id: d.emoji?.id ?? null, name: d.emoji?.name ?? null, animated: d.emoji?.animated ?? false },
        });
        break;
      case "MESSAGE_REACTION_REMOVE_ALL":
        this.emit("messageReactionRemoveAll", {
          channelId: d.channel_id,
          messageId: d.message_id,
          guildId: d.guild_id ?? null,
        });
        break;
      case "MESSAGE_REACTION_REMOVE_EMOJI":
        this.emit("messageReactionRemoveEmoji", {
          channelId: d.channel_id,
          messageId: d.message_id,
          guildId: d.guild_id ?? null,
          emoji: { id: d.emoji?.id ?? null, name: d.emoji?.name ?? null },
        });
        break;
      case "MESSAGE_POLL_VOTE_ADD":
        this.emit("messagePollVoteAdd", toPollVoteData(d));
        break;
      case "MESSAGE_POLL_VOTE_REMOVE":
        this.emit("messagePollVoteRemove", toPollVoteData(d));
        break;

      // Guilds
      case "GUILD_CREATE": {
        const guild = new Guild(this, d as APIGuild);
        this.guilds.cache.set(guild.id, guild);
        this.emit("guildCreate", guild);
        break;
      }
      case "GUILD_UPDATE": {
        const existing = this.guilds.cache.get(d.id);
        // _patch() mutates existing in place, so the pre-update scalars have
        // to be captured now or they're unrecoverable by the time the event
        // listener runs.
        const old = existing
          ? {
              name: existing.name,
              icon: existing.icon,
              ownerId: existing.ownerId,
              verificationLevel: existing.verificationLevel,
              afkChannelId: existing.afkChannelId,
              afkTimeout: existing.afkTimeout,
              mfaLevel: existing.mfaLevel,
            }
          : null;
        const guild = existing ? existing._patch(d as Partial<APIGuild>) : new Guild(this, d as APIGuild);
        this.guilds.cache.set(guild.id, guild);
        this.emit("guildUpdate", old, guild);
        break;
      }
      case "GUILD_DELETE": {
        const unavailable = Boolean(d.unavailable);
        if (unavailable) {
          const guild = this.guilds.cache.get(d.id);
          if (guild) guild.unavailable = true;
        } else {
          this.guilds.cache.delete(d.id);
        }
        this.emit("guildDelete", { id: d.id, unavailable });
        break;
      }

      // Members
      case "GUILD_MEMBER_ADD": {
        const guild = this.guilds.cache.get(d.guild_id);
        const member = guild
          ? guild._patchMember(d.user.id, d as APIMember)
          : new Member(this, d.guild_id, d as APIMember);
        this.emit("guildMemberAdd", member);
        break;
      }
      case "GUILD_MEMBER_UPDATE": {
        const guild = this.guilds.cache.get(d.guild_id);
        // _patchMember() replaces the cache entry rather than mutating it, so
        // the previous Member instance is still intact if grabbed first.
        const old = guild?.members.get(d.user.id) ?? null;
        const member = guild
          ? guild._patchMember(d.user.id, d as APIMember)
          : new Member(this, d.guild_id, d as APIMember);
        this.emit("guildMemberUpdate", old, member);
        break;
      }
      case "GUILD_MEMBER_REMOVE": {
        const guild = this.guilds.cache.get(d.guild_id);
        guild?.members.delete(d.user.id);
        this.emit("guildMemberRemove", { guildId: d.guild_id, user: new User(this, d.user as APIUser) });
        break;
      }
      case "GUILD_BAN_ADD":
        this.emit("guildBanAdd", new GuildBan(this, d.guild_id, { user: d.user, reason: null } as APIBan));
        break;
      case "GUILD_BAN_REMOVE":
        this.emit("guildBanRemove", new GuildBan(this, d.guild_id, { user: d.user, reason: null } as APIBan));
        break;
      case "GUILD_MEMBERS_CHUNK": {
        const guild = this.guilds.cache.get(d.guild_id);
        const members = (d.members as APIMember[]).map((raw) =>
          guild ? guild._patchMember(raw.user!.id, raw) : new Member(this, d.guild_id, raw),
        );
        this.emit("guildMembersChunk", {
          guildId: d.guild_id,
          members,
          chunkIndex: d.chunk_index,
          chunkCount: d.chunk_count,
          nonce: d.nonce ?? null,
        });
        break;
      }

      // Roles
      case "GUILD_ROLE_CREATE": {
        const role = new Role(this, d.guild_id, d.role as APIRole);
        this.guilds.cache.get(d.guild_id)?.roles.set(role.id, role);
        this.emit("roleCreate", role);
        break;
      }
      case "GUILD_ROLE_UPDATE": {
        const guild = this.guilds.cache.get(d.guild_id);
        const old = guild?.roles.get(d.role.id) ?? null;
        const role = new Role(this, d.guild_id, d.role as APIRole);
        guild?.roles.set(role.id, role);
        this.emit("roleUpdate", old, role);
        break;
      }
      case "GUILD_ROLE_DELETE": {
        const guild = this.guilds.cache.get(d.guild_id);
        const role = guild?.roles.get(d.role_id) ?? null;
        guild?.roles.delete(d.role_id);
        this.emit("roleDelete", role);
        break;
      }

      // Channels
      case "CHANNEL_CREATE": {
        const channel = createChannel(this, d as APIChannel);
        this.channels.cache.set(channel.id, channel);
        if (channel.guildId) this.guilds.cache.get(channel.guildId)?.channels.set(channel.id, channel);
        this.emit("channelCreate", channel);
        break;
      }
      case "CHANNEL_UPDATE": {
        const old = this.channels.cache.get(d.id) ?? null;
        const channel = createChannel(this, d as APIChannel);
        this.channels.cache.set(channel.id, channel);
        if (channel.guildId) this.guilds.cache.get(channel.guildId)?.channels.set(channel.id, channel);
        this.emit("channelUpdate", old, channel);
        break;
      }
      case "CHANNEL_DELETE": {
        const channel = createChannel(this, d as APIChannel);
        this.channels.cache.delete(channel.id);
        if (channel.guildId) this.guilds.cache.get(channel.guildId)?.channels.delete(channel.id);
        this.emit("channelDelete", channel);
        break;
      }
      case "CHANNEL_PINS_UPDATE":
        this.emit("channelPinsUpdate", {
          channelId: d.channel_id,
          guildId: d.guild_id ?? null,
          lastPinTimestamp: d.last_pin_timestamp ? Date.parse(d.last_pin_timestamp) : null,
        });
        break;

      // Threads
      case "THREAD_CREATE": {
        const thread = createChannel(this, d as APIChannel) as import("../structures/ThreadChannel").ThreadChannel;
        this.channels.cache.set(thread.id, thread);
        this.guilds.cache.get(d.guild_id)?.channels.set(thread.id, thread);
        this.emit("threadCreate", thread);
        break;
      }
      case "THREAD_UPDATE": {
        const thread = createChannel(this, d as APIChannel) as import("../structures/ThreadChannel").ThreadChannel;
        this.channels.cache.set(thread.id, thread);
        this.guilds.cache.get(d.guild_id)?.channels.set(thread.id, thread);
        this.emit("threadUpdate", thread);
        break;
      }
      case "THREAD_DELETE": {
        this.channels.cache.delete(d.id);
        this.guilds.cache.get(d.guild_id)?.channels.delete(d.id);
        this.emit("threadDelete", { id: d.id, guildId: d.guild_id });
        break;
      }

      // Presence / typing / users
      case "PRESENCE_UPDATE":
        this.emit("presenceUpdate", new Presence(d as APIPresence));
        break;
      case "TYPING_START":
        this.emit("typingStart", {
          channelId: d.channel_id,
          guildId: d.guild_id ?? null,
          userId: d.user_id,
          timestamp: d.timestamp,
        });
        break;
      case "USER_UPDATE":
        this.emit("userUpdate", new User(this, d as APIUser));
        break;

      // Voice
      case "VOICE_STATE_UPDATE": {
        const state = new VoiceState(this, d as APIVoiceState);
        const guild = state.guildId ? this.guilds.cache.get(state.guildId) : undefined;
        if (state.channelId) guild?.voiceStates.set(state.userId, state);
        else guild?.voiceStates.delete(state.userId);
        this.emit("voiceStateUpdate", state);
        break;
      }
      case "VOICE_SERVER_UPDATE":
        this.emit("voiceServerUpdate", d);
        break;

      // Webhooks / invites
      case "WEBHOOKS_UPDATE":
        this.emit("webhooksUpdate", { guildId: d.guild_id, channelId: d.channel_id });
        break;
      case "INVITE_CREATE":
        this.emit("inviteCreate", new Invite(this, d as APIInvite));
        break;
      case "INVITE_DELETE":
        this.emit("inviteDelete", { code: d.code, channelId: d.channel_id, guildId: d.guild_id ?? null });
        break;

      // Stage instances
      case "STAGE_INSTANCE_CREATE":
        this.emit("stageInstanceCreate", new StageInstance(this, d as APIStageInstance));
        break;
      case "STAGE_INSTANCE_UPDATE":
        this.emit("stageInstanceUpdate", new StageInstance(this, d as APIStageInstance));
        break;
      case "STAGE_INSTANCE_DELETE":
        this.emit("stageInstanceDelete", new StageInstance(this, d as APIStageInstance));
        break;

      // Scheduled events
      case "GUILD_SCHEDULED_EVENT_CREATE": {
        const event = new GuildScheduledEvent(this, d as APIGuildScheduledEvent);
        this.guilds.cache.get(event.guildId)?.scheduledEvents.set(event.id, event);
        this.emit("guildScheduledEventCreate", event);
        break;
      }
      case "GUILD_SCHEDULED_EVENT_UPDATE": {
        const event = new GuildScheduledEvent(this, d as APIGuildScheduledEvent);
        this.guilds.cache.get(event.guildId)?.scheduledEvents.set(event.id, event);
        this.emit("guildScheduledEventUpdate", event);
        break;
      }
      case "GUILD_SCHEDULED_EVENT_DELETE": {
        const event = new GuildScheduledEvent(this, d as APIGuildScheduledEvent);
        this.guilds.cache.get(event.guildId)?.scheduledEvents.delete(event.id);
        this.emit("guildScheduledEventDelete", event);
        break;
      }

      // Auto moderation
      case "AUTO_MODERATION_RULE_CREATE": {
        const rule = new AutoModerationRule(this, d as APIAutoModerationRule);
        this.guilds.cache.get(rule.guildId)?.autoModerationRules.set(rule.id, rule);
        this.emit("autoModerationRuleCreate", rule);
        break;
      }
      case "AUTO_MODERATION_RULE_UPDATE": {
        const rule = new AutoModerationRule(this, d as APIAutoModerationRule);
        this.guilds.cache.get(rule.guildId)?.autoModerationRules.set(rule.id, rule);
        this.emit("autoModerationRuleUpdate", rule);
        break;
      }
      case "AUTO_MODERATION_RULE_DELETE": {
        const rule = new AutoModerationRule(this, d as APIAutoModerationRule);
        this.guilds.cache.get(rule.guildId)?.autoModerationRules.delete(rule.id);
        this.emit("autoModerationRuleDelete", rule);
        break;
      }
      case "AUTO_MODERATION_ACTION_EXECUTION":
        this.emit("autoModerationActionExecution", d);
        break;

      // Monetization
      case "ENTITLEMENT_CREATE": {
        const entitlement = new Entitlement(this, d as APIEntitlement);
        this.monetization.cache.set(entitlement.id, entitlement);
        this.emit("entitlementCreate", entitlement);
        break;
      }
      case "ENTITLEMENT_UPDATE": {
        const entitlement = new Entitlement(this, d as APIEntitlement);
        this.monetization.cache.set(entitlement.id, entitlement);
        this.emit("entitlementUpdate", entitlement);
        break;
      }
      case "ENTITLEMENT_DELETE": {
        const entitlement = new Entitlement(this, d as APIEntitlement);
        this.monetization.cache.delete(entitlement.id);
        this.emit("entitlementDelete", entitlement);
        break;
      }

      case "INTERACTION_CREATE": {
        const interaction = this.createInteraction(d as APIInteraction);
        this.emit("interactionCreate", interaction);
        break;
      }
    }
  }

  private createInteraction(raw: APIInteraction): Interaction {
    switch (raw.type) {
      case InteractionType.ApplicationCommand:
        if (raw.data?.type === ApplicationCommandType.User || raw.data?.type === ApplicationCommandType.Message) {
          return new ContextMenuCommandInteraction(this, raw);
        }
        return new CommandInteraction(this, raw);
      case InteractionType.MessageComponent:
        return new MessageComponentInteraction(this, raw);
      case InteractionType.ModalSubmit:
        return new ModalSubmitInteraction(this, raw);
      case InteractionType.ApplicationCommandAutocomplete:
        return new AutocompleteInteraction(this, raw);
      default:
        return new Interaction(this, raw);
    }
  }

  public destroy(): void {
    for (const gateway of this._gateways) gateway.destroy();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPollVoteData(d: Record<string, any>): PollVoteData {
  return {
    userId: d.user_id,
    channelId: d.channel_id,
    messageId: d.message_id,
    guildId: d.guild_id ?? null,
    answerId: d.answer_id,
  };
}

export interface Client {
  on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
  once<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
  emit<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): boolean;
}
