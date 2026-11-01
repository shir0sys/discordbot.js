export {
  Client,
  type ClientOptions,
  type TypingStartData,
  type PollVoteData,
  type GuildMembersChunkData,
} from "./client/Client";
export { REST, DiscordAPIError, type RESTOptions, type RESTFile } from "./rest/REST";
export { Bucket } from "./rest/Bucket";
export { Gateway, type GatewayOptions } from "./gateway/Gateway";
export { IntentsBitField } from "./util/Intents";
export * from "./util/Constants";

export { BitField, type BitFieldResolvable } from "./util/BitField";
export {
  PermissionsBitField,
  PermissionFlags,
  computeChannelPermissions,
  type APIPermissionOverwrite,
} from "./util/Permissions";
export { UserFlagsBitField, UserFlagValues } from "./util/UserFlags";
export * as Formatters from "./util/Formatters";
export * as SnowflakeUtil from "./util/SnowflakeUtil";
export { resolveColor, NamedColors, type ColorResolvable } from "./util/Colors";
export { HTTPError, RateLimitError, GatewayError } from "./util/Errors";
export { Collector, type CollectorOptions, type CollectorEndReason } from "./util/Collector";

export { Collection } from "./managers/Collection";
export { GuildManager } from "./managers/GuildManager";
export { ChannelManager } from "./managers/ChannelManager";
export { UserManager } from "./managers/UserManager";
export { RoleManager } from "./managers/RoleManager";
export { GuildMemberManager } from "./managers/GuildMemberManager";
export { GuildChannelManager } from "./managers/GuildChannelManager";
export { GuildBanManager } from "./managers/GuildBanManager";
export { MessageManager } from "./managers/MessageManager";
export { ThreadManager } from "./managers/ThreadManager";
export { ThreadMemberManager } from "./managers/ThreadMemberManager";
export { GuildEmojiManager } from "./managers/GuildEmojiManager";
export { GuildStickerManager } from "./managers/GuildStickerManager";
export { SoundboardManager, GuildSoundboardManager } from "./managers/SoundboardManager";
export { MonetizationManager } from "./managers/MonetizationManager";
export { GuildTemplateManager, fetchGuildTemplate, createGuildFromTemplate } from "./managers/GuildTemplateManager";
export {
  ApplicationCommandManager,
  type ApplicationCommandData,
  type CommandInput,
  type APIApplicationCommand,
  type APICommandPermission,
  type APIGuildApplicationCommandPermissions,
} from "./managers/ApplicationCommandManager";
export { GuildApplicationCommandManager } from "./managers/GuildApplicationCommandManager";
export { AutoModerationRuleManager, type AutoModerationRuleCreateData } from "./managers/AutoModerationRuleManager";
export { GuildScheduledEventManager, type GuildScheduledEventCreateData } from "./managers/GuildScheduledEventManager";

export { Base } from "./structures/Base";
export { User, type APIUser } from "./structures/User";
export { ClientUser } from "./structures/ClientUser";
export { Guild, type APIGuild } from "./structures/Guild";
export { Role, type APIRole } from "./structures/Role";
export { Member, type APIMember } from "./structures/Member";
export { Channel, type APIChannel } from "./structures/Channel";
export { createChannel } from "./structures/ChannelFactory";
export { TextChannel } from "./structures/TextChannel";
export { VoiceChannel } from "./structures/VoiceChannel";
export { StageChannel } from "./structures/StageChannel";
export { CategoryChannel } from "./structures/CategoryChannel";
export { ForumChannel, type APIForumChannel, type APIForumTag } from "./structures/ForumChannel";
export { MediaChannel } from "./structures/MediaChannel";
export { DMChannel } from "./structures/DMChannel";
export { ThreadChannel, type APIThreadChannel, type APIThreadMetadata } from "./structures/ThreadChannel";
export { ThreadMember, type APIThreadMember } from "./structures/ThreadMember";
export {
  Message,
  type APIMessage,
  type APIAttachment,
  type MessagePayload,
  type MessageCreateData,
  type ResolvedPayload,
} from "./structures/Message";
export { MessageReaction, type APIMessageReaction } from "./structures/MessageReaction";
export { Emoji, GuildEmoji, type APIEmoji as APIEmojiData } from "./structures/Emoji";
export { Sticker, type APISticker } from "./structures/Sticker";
export { Webhook, WebhookClient, type APIWebhook } from "./structures/Webhook";
export { VoiceState, type APIVoiceState } from "./structures/VoiceState";
export { StageInstance, type APIStageInstance } from "./structures/StageInstance";
export { GuildScheduledEvent, type APIGuildScheduledEvent } from "./structures/GuildScheduledEvent";
export { AutoModerationRule, type APIAutoModerationRule } from "./structures/AutoModerationRule";
export { AuditLogEntry, type APIAuditLogEntry, type APIAuditLogChange } from "./structures/AuditLogEntry";
export { GuildTemplate, type APIGuildTemplate } from "./structures/GuildTemplate";
export {
  GuildOnboarding,
  fetchPublicWidget,
  type APIGuildOnboarding,
  type APIOnboardingPrompt,
  type APIGuildWidgetSettings,
  type APIGuildPreview,
  type APIPublicWidget,
} from "./structures/GuildOnboarding";
export { SoundboardSound, type APISoundboardSound } from "./structures/SoundboardSound";
export { SKU, type APISKU } from "./structures/SKU";
export { Entitlement, type APIEntitlement } from "./structures/Entitlement";
export { Application, type APIApplication, type APIApplicationRoleConnectionMetadata } from "./structures/Application";
export { StickerPack, type APIStickerPack } from "./structures/StickerPack";
export { ApplicationCommand, ApplicationCommandPermissions } from "./structures/ApplicationCommand";
export {
  Presence,
  Activity,
  ActivityType,
  PresenceStatus,
  type APIPresence,
  type APIActivity,
} from "./structures/Presence";
export { Invite, type APIInvite, type PartialInvite } from "./structures/Invite";
export { GuildBan, type APIBan } from "./structures/GuildBan";

export {
  Interaction,
  type APIInteraction,
  type APIInteractionData,
  type APIInteractionOption,
} from "./structures/Interaction";
export { CommandInteraction } from "./structures/CommandInteraction";
export { ContextMenuCommandInteraction } from "./structures/ContextMenuCommandInteraction";
export { MessageComponentInteraction } from "./structures/MessageComponentInteraction";
export { ModalSubmitInteraction } from "./structures/ModalSubmitInteraction";
export { AutocompleteInteraction } from "./structures/AutocompleteInteraction";

export { MessageCollector } from "./structures/MessageCollector";
export { ReactionCollector, type CollectedReaction } from "./structures/ReactionCollector";
export { InteractionCollector, type InteractionCollectorOptions } from "./structures/InteractionCollector";

export { EmbedBuilder, type APIEmbed, type APIEmbedField } from "./builders/EmbedBuilder";
export {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  type JSONEncodable,
  type APISelectMenuOption,
} from "./builders/Components";
export {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  FileBuilder,
  SeparatorBuilder,
} from "./builders/ComponentsV2";
export { ModalBuilder, TextInputBuilder } from "./builders/Modal";
export { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "./builders/SlashCommandBuilder";
export { ContextMenuCommandBuilder } from "./builders/ContextMenuCommandBuilder";
export { AttachmentBuilder } from "./builders/AttachmentBuilder";
export { PollBuilder, type PollAnswerData } from "./builders/PollBuilder";

export { ShardingManager, type ShardingManagerOptions } from "./sharding/ShardingManager";
export { ShardClientUtil } from "./sharding/ShardClientUtil";

export {
  getAuthorizationURL,
  exchangeCode,
  refreshAccessToken,
  revokeToken,
  type OAuth2TokenResponse,
  type AuthorizationURLOptions,
  type ExchangeCodeOptions,
  type RefreshTokenOptions,
} from "./oauth2/OAuth2";
export { OAuth2User, type APIUserGuild, type APIConnection } from "./oauth2/OAuth2User";

export { VoiceConnection, VoiceConnectionStatus, type VoiceConnectionOptions } from "./voice/VoiceConnection";
export {
  VoiceGateway,
  type VoiceGatewayOptions,
  type VoiceReadyData,
  type VoiceSessionDescription,
} from "./voice/VoiceGateway";
export { VoiceUDP, buildRtpPacket, type IPDiscoveryResult } from "./voice/VoiceUDP";
export { DaveSession } from "./voice/DaveSession";
export { AudioPlayer, AudioPlayerStatus } from "./voice/AudioPlayer";
export { AudioResource } from "./voice/AudioResource";
export { OpusEncoder, PCM_FRAME_BYTES } from "./voice/OpusEncoder";
export {
  VoiceOpcodes,
  ENCRYPTION_MODE,
  SAMPLE_RATE,
  CHANNELS,
  FRAME_DURATION_MS,
  SAMPLES_PER_FRAME,
} from "./voice/VoiceConstants";
