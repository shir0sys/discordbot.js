import { ButtonStyle, ComponentType } from "../util/Constants";

export interface APIEmoji {
  id?: string | null;
  name?: string | null;
  animated?: boolean;
}

export interface JSONEncodable {
  toJSON(): unknown;
}

export class ActionRowBuilder implements JSONEncodable {
  private components: JSONEncodable[] = [];

  public addComponents(...components: JSONEncodable[]): this {
    this.components.push(...components);
    return this;
  }

  public toJSON(): object {
    return { type: ComponentType.ActionRow, components: this.components.map((c) => c.toJSON()) };
  }
}

export class ButtonBuilder implements JSONEncodable {
  private customId?: string;
  private label?: string;
  private style: ButtonStyle = ButtonStyle.Primary;
  private url?: string;
  private emoji?: APIEmoji;
  private disabled = false;

  public setCustomId(customId: string): this {
    this.customId = customId;
    return this;
  }

  public setLabel(label: string): this {
    this.label = label;
    return this;
  }

  public setStyle(style: ButtonStyle): this {
    this.style = style;
    return this;
  }

  /** Link buttons carry a URL instead of a custom_id and never fire interactions. */
  public setURL(url: string): this {
    this.url = url;
    this.style = ButtonStyle.Link;
    return this;
  }

  public setEmoji(emoji: APIEmoji): this {
    this.emoji = emoji;
    return this;
  }

  public setDisabled(disabled = true): this {
    this.disabled = disabled;
    return this;
  }

  public toJSON(): object {
    return {
      type: ComponentType.Button,
      style: this.style,
      label: this.label,
      custom_id: this.style === ButtonStyle.Link ? undefined : this.customId,
      url: this.style === ButtonStyle.Link ? this.url : undefined,
      emoji: this.emoji,
      disabled: this.disabled,
    };
  }
}

export interface APISelectMenuOption {
  label: string;
  value: string;
  description?: string;
  emoji?: APIEmoji;
  default?: boolean;
}

abstract class BaseSelectMenuBuilder implements JSONEncodable {
  protected customId?: string;
  protected placeholder?: string;
  protected minValues?: number;
  protected maxValues?: number;
  protected disabled = false;

  constructor(protected readonly type: ComponentType) {}

  public setCustomId(customId: string): this {
    this.customId = customId;
    return this;
  }

  public setPlaceholder(placeholder: string): this {
    this.placeholder = placeholder;
    return this;
  }

  public setMinValues(min: number): this {
    this.minValues = min;
    return this;
  }

  public setMaxValues(max: number): this {
    this.maxValues = max;
    return this;
  }

  public setDisabled(disabled = true): this {
    this.disabled = disabled;
    return this;
  }

  public toJSON(): object {
    return {
      type: this.type,
      custom_id: this.customId,
      placeholder: this.placeholder,
      min_values: this.minValues,
      max_values: this.maxValues,
      disabled: this.disabled,
    };
  }
}

export class StringSelectMenuBuilder extends BaseSelectMenuBuilder {
  private options: APISelectMenuOption[] = [];

  constructor() {
    super(ComponentType.StringSelect);
  }

  public addOptions(...options: APISelectMenuOption[]): this {
    this.options.push(...options);
    return this;
  }

  public toJSON(): object {
    return { ...super.toJSON(), options: this.options };
  }
}

export class UserSelectMenuBuilder extends BaseSelectMenuBuilder {
  constructor() {
    super(ComponentType.UserSelect);
  }
}

export class RoleSelectMenuBuilder extends BaseSelectMenuBuilder {
  constructor() {
    super(ComponentType.RoleSelect);
  }
}

export class MentionableSelectMenuBuilder extends BaseSelectMenuBuilder {
  constructor() {
    super(ComponentType.MentionableSelect);
  }
}

export class ChannelSelectMenuBuilder extends BaseSelectMenuBuilder {
  private channelTypes: number[] = [];

  constructor() {
    super(ComponentType.ChannelSelect);
  }

  public setChannelTypes(...types: number[]): this {
    this.channelTypes = types;
    return this;
  }

  public toJSON(): object {
    return { ...super.toJSON(), channel_types: this.channelTypes.length ? this.channelTypes : undefined };
  }
}
