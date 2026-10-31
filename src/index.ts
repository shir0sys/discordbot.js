export { Client, type ClientOptions } from "./client/Client";
export { REST, DiscordAPIError, type RESTOptions } from "./rest/REST";
export { Gateway, type GatewayOptions } from "./gateway/Gateway";
export { IntentsBitField } from "./util/Intents";
export * from "./util/Constants";

export { Collection } from "./managers/Collection";
export { GuildManager } from "./managers/GuildManager";
export { ChannelManager } from "./managers/ChannelManager";
export { UserManager } from "./managers/UserManager";
export { ApplicationCommandManager, type ApplicationCommandData } from "./managers/ApplicationCommandManager";

export { Base } from "./structures/Base";
export { User, type APIUser } from "./structures/User";
export { ClientUser } from "./structures/ClientUser";
export { Guild, type APIGuild } from "./structures/Guild";
export { Role, type APIRole } from "./structures/Role";
export { Member, type APIMember } from "./structures/Member";
export { Channel, type APIChannel } from "./structures/Channel";
export { TextChannel } from "./structures/TextChannel";
export { VoiceChannel } from "./structures/VoiceChannel";
export { DMChannel } from "./structures/DMChannel";
export { Message, type APIMessage, type MessagePayload, type MessageCreateData } from "./structures/Message";
export { Interaction, type APIInteraction } from "./structures/Interaction";
export { CommandInteraction } from "./structures/CommandInteraction";
export { MessageComponentInteraction } from "./structures/MessageComponentInteraction";
export { ModalSubmitInteraction } from "./structures/ModalSubmitInteraction";
export { AutocompleteInteraction } from "./structures/AutocompleteInteraction";

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
