import { ApplicationCommandOptionType } from "../util/Constants";

export interface SlashCommandOptionData {
  type: ApplicationCommandOptionType;
  name: string;
  description: string;
  required?: boolean;
  choices?: { name: string; value: string | number }[];
  options?: SlashCommandOptionData[];
  min_value?: number;
  max_value?: number;
  channel_types?: number[];
}

export interface OptionConfig {
  required?: boolean;
  choices?: { name: string; value: string | number }[];
  minValue?: number;
  maxValue?: number;
  channelTypes?: number[];
}

/** Builds a chat-input (slash) command payload for /applications/{id}/commands. */
export class SlashCommandBuilder {
  private name = "";
  private description = "";
  private options: SlashCommandOptionData[] = [];
  private dmPermission?: boolean;
  private defaultMemberPermissions?: string;

  public setName(name: string): this {
    this.name = name;
    return this;
  }

  public setDescription(description: string): this {
    this.description = description;
    return this;
  }

  public setDMPermission(allowed: boolean): this {
    this.dmPermission = allowed;
    return this;
  }

  public setDefaultMemberPermissions(permissions: bigint | string): this {
    this.defaultMemberPermissions = permissions.toString();
    return this;
  }

  private addOption(type: ApplicationCommandOptionType, name: string, description: string, config: OptionConfig = {}): this {
    this.options.push({
      type,
      name,
      description,
      required: config.required,
      choices: config.choices,
      min_value: config.minValue,
      max_value: config.maxValue,
      channel_types: config.channelTypes,
    });
    return this;
  }

  public addStringOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.String, name, description, config);
  }

  public addIntegerOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.Integer, name, description, config);
  }

  public addNumberOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.Number, name, description, config);
  }

  public addBooleanOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.Boolean, name, description, config);
  }

  public addUserOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.User, name, description, config);
  }

  public addChannelOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.Channel, name, description, config);
  }

  public addRoleOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.Role, name, description, config);
  }

  public addMentionableOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.Mentionable, name, description, config);
  }

  public addAttachmentOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.Attachment, name, description, config);
  }

  public addSubcommand(name: string, description: string, build: (sub: SlashCommandSubcommandBuilder) => void): this {
    const sub = new SlashCommandSubcommandBuilder(name, description);
    build(sub);
    this.options.push(sub.toJSON());
    return this;
  }

  public toJSON(): object {
    return {
      name: this.name,
      description: this.description,
      options: this.options.length ? this.options : undefined,
      dm_permission: this.dmPermission,
      default_member_permissions: this.defaultMemberPermissions,
    };
  }
}

export class SlashCommandSubcommandBuilder {
  private options: SlashCommandOptionData[] = [];

  constructor(private readonly name: string, private readonly description: string) {}

  private addOption(type: ApplicationCommandOptionType, name: string, description: string, config: OptionConfig = {}): this {
    this.options.push({
      type,
      name,
      description,
      required: config.required,
      choices: config.choices,
      min_value: config.minValue,
      max_value: config.maxValue,
    });
    return this;
  }

  public addStringOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.String, name, description, config);
  }

  public addIntegerOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.Integer, name, description, config);
  }

  public addBooleanOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.Boolean, name, description, config);
  }

  public addUserOption(name: string, description: string, config?: OptionConfig): this {
    return this.addOption(ApplicationCommandOptionType.User, name, description, config);
  }

  public toJSON(): SlashCommandOptionData {
    return {
      type: ApplicationCommandOptionType.SubCommand,
      name: this.name,
      description: this.description,
      options: this.options.length ? this.options : undefined,
    };
  }
}
