export const API_VERSION = 10;
export const REST_BASE_URL = `https://discord.com/api/v${API_VERSION}`;
export const GATEWAY_URL = `wss://gateway.discord.gg/?v=${API_VERSION}&encoding=json`;

export enum GatewayOpcodes {
  Dispatch = 0,
  Heartbeat = 1,
  Identify = 2,
  PresenceUpdate = 3,
  VoiceStateUpdate = 4,
  Resume = 6,
  Reconnect = 7,
  RequestGuildMembers = 8,
  InvalidSession = 9,
  Hello = 10,
  HeartbeatAck = 11,
}

export enum GatewayCloseCodes {
  UnknownError = 4000,
  UnknownOpcode = 4001,
  DecodeError = 4002,
  NotAuthenticated = 4003,
  AuthenticationFailed = 4004,
  AlreadyAuthenticated = 4005,
  InvalidSeq = 4007,
  RateLimited = 4008,
  SessionTimedOut = 4009,
  InvalidShard = 4010,
  ShardingRequired = 4011,
  InvalidApiVersion = 4012,
  InvalidIntents = 4013,
  DisallowedIntents = 4014,
}

/** Close codes after which resuming/reconnecting is pointless. */
export const UNRECOVERABLE_CLOSE_CODES = new Set<number>([
  GatewayCloseCodes.AuthenticationFailed,
  GatewayCloseCodes.InvalidShard,
  GatewayCloseCodes.ShardingRequired,
  GatewayCloseCodes.InvalidApiVersion,
  GatewayCloseCodes.InvalidIntents,
  GatewayCloseCodes.DisallowedIntents,
]);

export enum IntentBits {
  Guilds = 1 << 0,
  GuildMembers = 1 << 1,
  GuildModeration = 1 << 2,
  GuildExpressions = 1 << 3,
  GuildIntegrations = 1 << 4,
  GuildWebhooks = 1 << 5,
  GuildInvites = 1 << 6,
  GuildVoiceStates = 1 << 7,
  GuildPresences = 1 << 8,
  GuildMessages = 1 << 9,
  GuildMessageReactions = 1 << 10,
  GuildMessageTyping = 1 << 11,
  DirectMessages = 1 << 12,
  DirectMessageReactions = 1 << 13,
  DirectMessageTyping = 1 << 14,
  MessageContent = 1 << 15,
  GuildScheduledEvents = 1 << 16,
  AutoModerationConfiguration = 1 << 20,
  AutoModerationExecution = 1 << 21,
  GuildMessagePolls = 1 << 24,
  DirectMessagePolls = 1 << 25,
}

export enum ChannelType {
  GuildText = 0,
  DM = 1,
  GuildVoice = 2,
  GroupDM = 3,
  GuildCategory = 4,
  GuildAnnouncement = 5,
  AnnouncementThread = 10,
  PublicThread = 11,
  PrivateThread = 12,
  GuildStageVoice = 13,
  GuildForum = 15,
  GuildMedia = 16,
}

export enum InteractionType {
  Ping = 1,
  ApplicationCommand = 2,
  MessageComponent = 3,
  ApplicationCommandAutocomplete = 4,
  ModalSubmit = 5,
}

export enum InteractionResponseType {
  Pong = 1,
  ChannelMessageWithSource = 4,
  DeferredChannelMessageWithSource = 5,
  DeferredUpdateMessage = 6,
  UpdateMessage = 7,
  ApplicationCommandAutocompleteResult = 8,
  Modal = 9,
}
